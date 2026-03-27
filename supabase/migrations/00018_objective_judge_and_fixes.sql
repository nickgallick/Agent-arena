-- ============================================================
-- 00018: Objective Judge + Scoring Architecture Fixes
-- Forge · 2026-03-27
-- 
-- Fixes:
-- 1. Add UNIQUE(entry_id, lane) constraint to judge_outputs
-- 2. Add hidden_test_cases table (objective judge data store)
-- 3. Fix finalize_entry_scoring to use objective_score + correct weights
-- 4. Fix calculate_composite_score naming (efficiency → integrity_weight)
-- 5. Fix composite → final_score sync so calculate-ratings uses correct score
-- 6. Add objective_score column wiring
-- 7. Rename efficiency weight slot to integrity in weight profiles
-- ============================================================

-- ============================================================
-- 1. UNIQUE constraint on judge_outputs(entry_id, lane)
--    Required for upsert to work correctly
--    Non-arbitration rows only — audit rows can stack
-- ============================================================

-- Drop the non-unique index first, then add unique constraint
DROP INDEX IF EXISTS idx_judge_outputs_lane;

-- Add unique constraint for primary (non-arbitration) lane outputs
CREATE UNIQUE INDEX IF NOT EXISTS idx_judge_outputs_entry_lane_primary
  ON public.judge_outputs(entry_id, lane)
  WHERE is_arbitration = false;

-- Keep non-unique index for arbitration rows and general lookup
CREATE INDEX IF NOT EXISTS idx_judge_outputs_entry_id_lane
  ON public.judge_outputs(entry_id, lane);

-- ============================================================
-- 2. hidden_test_cases — objective judge data store
--    Stores per-challenge test specifications for automated scoring
--    Admins insert; agents never see this table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hidden_test_cases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  -- Test identity
  test_name text NOT NULL,
  test_group text NOT NULL DEFAULT 'default',  -- e.g. 'unit', 'integration', 'edge_case'
  weight real NOT NULL DEFAULT 1.0,            -- relative weight within the challenge
  -- Evaluation method
  eval_type text NOT NULL DEFAULT 'regex'
    CHECK (eval_type IN ('regex', 'exact', 'contains', 'json_schema', 'code_exec', 'llm_check')),
  -- Test definition (content depends on eval_type)
  expected_pattern text,          -- regex / exact / contains match
  expected_schema jsonb,          -- json_schema: JSON Schema object
  eval_code text,                 -- code_exec: code to run against submission
  eval_prompt text,               -- llm_check: prompt for lightweight LLM check
  -- Scoring
  points_possible real NOT NULL DEFAULT 10,
  partial_credit boolean NOT NULL DEFAULT false,
  -- Visibility
  is_active boolean NOT NULL DEFAULT true,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hidden_test_cases ENABLE ROW LEVEL SECURITY;

-- Admins can manage test cases; agents/users cannot see them
CREATE POLICY "hidden_test_cases_admin_only"
  ON public.hidden_test_cases FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE INDEX idx_hidden_tests_challenge ON public.hidden_test_cases(challenge_id) WHERE is_active = true;
CREATE INDEX idx_hidden_tests_group ON public.hidden_test_cases(challenge_id, test_group);

-- ============================================================
-- 3. objective_test_results — per-entry objective judge results
--    Written by objective-judge edge function after scoring
-- ============================================================

CREATE TABLE IF NOT EXISTS public.objective_test_results (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id uuid NOT NULL REFERENCES public.challenge_entries(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  test_case_id uuid REFERENCES public.hidden_test_cases(id) ON DELETE SET NULL,
  -- Result
  test_name text NOT NULL,
  test_group text NOT NULL,
  passed boolean NOT NULL,
  points_earned real NOT NULL DEFAULT 0,
  points_possible real NOT NULL DEFAULT 10,
  -- Evidence
  matched_text text,      -- what was matched
  eval_output text,       -- raw eval output
  error_message text,     -- if eval failed to run
  -- Metadata
  eval_type text,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.objective_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "objective_test_results_admin_only"
  ON public.objective_test_results FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Public: agents can see their own results after reveal
CREATE POLICY "objective_test_results_own_entry"
  ON public.objective_test_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.challenge_entries ce
      WHERE ce.id = entry_id AND ce.user_id = auth.uid()
        AND ce.all_revealed_at IS NOT NULL
    )
  );

CREATE INDEX idx_obj_results_entry ON public.objective_test_results(entry_id);
CREATE INDEX idx_obj_results_challenge ON public.objective_test_results(challenge_id);

-- ============================================================
-- 4. Fix finalize_entry_scoring
--    Reads objective_score from challenge_entries + all lane scores
--    Computes correct weighted composite per format
--    Syncs composite_score → final_score for calculate-ratings compat
-- ============================================================

CREATE OR REPLACE FUNCTION public.finalize_entry_scoring(p_entry_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_entry record;
  v_challenge record;
  v_process_score real;
  v_strategy_score real;
  v_integrity_score real;
  v_integrity_adjustment real;
  v_integrity_outcome text;
  v_objective_score real;
  v_telemetry_process real;
  v_telemetry_efficiency real;
  v_blended_process real;
  v_composite real;
  v_weights record;
  v_spread real;
  v_is_disputed boolean;
  v_custom_weights jsonb;
  v_format text;
  -- Weight vars
  w_objective real;
  w_process real;
  w_strategy real;
  w_integrity real;
BEGIN
  -- ── Load entry ──────────────────────────────────────────────
  SELECT ce.*, c.format, c.judge_weights
  INTO v_entry
  FROM public.challenge_entries ce
  JOIN public.challenges c ON c.id = ce.challenge_id
  WHERE ce.id = p_entry_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'entry_not_found');
  END IF;

  v_format := COALESCE(v_entry.challenge_format, v_entry.format, 'standard');
  v_custom_weights := v_entry.judge_weights;

  -- ── Load lane scores from judge_outputs ──────────────────────
  SELECT
    MAX(CASE WHEN lane = 'process'   THEN score END),
    MAX(CASE WHEN lane = 'strategy'  THEN score END),
    MAX(CASE WHEN lane = 'integrity' THEN score END),
    MAX(CASE WHEN lane = 'integrity' THEN integrity_adjustment END),
    MAX(CASE WHEN lane = 'integrity' THEN integrity_outcome END)
  INTO
    v_process_score,
    v_strategy_score,
    v_integrity_score,
    v_integrity_adjustment,
    v_integrity_outcome
  FROM public.judge_outputs
  WHERE entry_id = p_entry_id
    AND lane IN ('process', 'strategy', 'integrity')
    AND is_arbitration = false;

  -- ── Load objective score (from challenge_entries, set by objective-judge) ──
  v_objective_score := COALESCE(v_entry.objective_score, 0);

  -- ── Load telemetry blending signals ──────────────────────────
  SELECT
    COALESCE(telemetry_process_score, NULL),
    COALESCE(telemetry_efficiency_score, NULL)
  INTO v_telemetry_process, v_telemetry_efficiency
  FROM public.run_metrics
  WHERE entry_id = p_entry_id;

  -- Blend LLM process score with telemetry process score (60/40)
  IF v_telemetry_process IS NOT NULL AND v_process_score IS NOT NULL THEN
    v_blended_process := v_process_score * 0.60 + v_telemetry_process * 0.40;
  ELSE
    v_blended_process := COALESCE(v_process_score, 0);
  END IF;

  -- ── Resolve format weights ────────────────────────────────────
  IF v_custom_weights IS NOT NULL AND v_custom_weights != '{}'::jsonb THEN
    w_objective  := COALESCE((v_custom_weights->>'objective')::real,  0.50);
    w_process    := COALESCE((v_custom_weights->>'process')::real,    0.20);
    w_strategy   := COALESCE((v_custom_weights->>'strategy')::real,   0.20);
    w_integrity  := COALESCE((v_custom_weights->>'integrity')::real,  0.10);
  ELSE
    CASE v_format
      WHEN 'sprint' THEN
        w_objective := 0.60; w_process := 0.15; w_strategy := 0.15; w_integrity := 0.10;
      WHEN 'marathon' THEN
        w_objective := 0.40; w_process := 0.20; w_strategy := 0.30; w_integrity := 0.10;
      WHEN 'versus' THEN
        w_objective := 0.35; w_process := 0.20; w_strategy := 0.25; w_integrity := 0.10;
      ELSE -- standard
        w_objective := 0.50; w_process := 0.20; w_strategy := 0.20; w_integrity := 0.10;
    END CASE;
  END IF;

  -- ── Compute composite ─────────────────────────────────────────
  -- Note: when objective_score is 0 (no objective tests exist for this challenge),
  -- redistribute its weight proportionally to process + strategy
  IF v_objective_score = 0 AND v_entry.objective_score IS NULL THEN
    -- No objective judge ran — redistribute weight to LLM lanes
    DECLARE
      total_llm_weight real := w_process + w_strategy + w_integrity;
      scale real;
    BEGIN
      scale := (w_objective + total_llm_weight) / NULLIF(total_llm_weight, 0);
      w_process   := w_process  * scale;
      w_strategy  := w_strategy * scale;
      w_integrity := w_integrity * scale;
      w_objective := 0;
    END;
  END IF;

  v_composite :=
    COALESCE(v_objective_score, 0)  * w_objective  +
    COALESCE(v_blended_process, 0)  * w_process    +
    COALESCE(v_strategy_score, 0)   * w_strategy   +
    COALESCE(v_integrity_score, 0)  * w_integrity;

  -- Integrity adjustment (asymmetric: max +10, min -25)
  v_composite := v_composite + GREATEST(-25, LEAST(10, COALESCE(v_integrity_adjustment, 0)));

  -- Clamp
  v_composite := GREATEST(0, LEAST(100, v_composite));

  -- Disqualifying integrity overrides to zero
  IF v_integrity_outcome = 'disqualifying' THEN
    v_composite := 0;
  END IF;

  -- ── Dispute check ─────────────────────────────────────────────
  v_spread := ABS(COALESCE(v_process_score, 0) - COALESCE(v_strategy_score, 0));
  v_is_disputed := v_spread > 15;

  -- ── Write back to challenge_entries ──────────────────────────
  UPDATE public.challenge_entries SET
    process_score        = v_blended_process,
    strategy_score       = v_strategy_score,
    integrity_adjustment = GREATEST(-25, LEAST(10, COALESCE(v_integrity_adjustment, 0))),
    objective_score      = v_objective_score,
    composite_score      = v_composite,
    -- Sync composite → final_score for calculate-ratings backcompat
    final_score          = v_composite,
    status               = CASE
                             WHEN v_integrity_outcome = 'disqualifying' THEN 'disqualified'
                             WHEN v_is_disputed THEN 'judging'
                             ELSE 'judged'
                           END,
    dispute_flagged      = v_is_disputed,
    dispute_reason       = CASE
                             WHEN v_is_disputed
                             THEN 'Judge spread ' || round(v_spread::numeric, 1) || ' pts exceeds threshold (15)'
                             ELSE NULL
                           END,
    all_revealed_at      = CASE WHEN NOT v_is_disputed THEN now() ELSE all_revealed_at END,
    reveal_summary       = jsonb_build_object(
      'objective',  jsonb_build_object('score', v_objective_score),
      'process',    jsonb_build_object('score', v_blended_process),
      'strategy',   jsonb_build_object('score', v_strategy_score),
      'integrity',  jsonb_build_object('outcome', v_integrity_outcome, 'adjustment', v_integrity_adjustment),
      'composite',  v_composite,
      'format',     v_format,
      'weights',    jsonb_build_object('objective', w_objective, 'process', w_process, 'strategy', w_strategy, 'integrity', w_integrity)
    )
  WHERE id = p_entry_id;

  -- ── Dispute: insert flag + queue audit ─────────────────────────
  IF v_is_disputed THEN
    INSERT INTO public.dispute_flags (
      entry_id, challenge_id, trigger_reason, score_snapshot, max_judge_spread, prize_locked
    ) VALUES (
      p_entry_id,
      v_entry.challenge_id,
      'judge_spread_exceeded',
      jsonb_build_object('process', v_process_score, 'strategy', v_strategy_score, 'spread', v_spread),
      v_spread,
      false
    )
    ON CONFLICT DO NOTHING;

    -- Queue audit lane
    INSERT INTO public.job_queue (type, payload)
    VALUES ('judge_entry', jsonb_build_object(
      'entry_id', p_entry_id,
      'challenge_id', v_entry.challenge_id,
      'lane', 'audit'
    ))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'composite', round(v_composite::numeric, 2),
    'process',   round(COALESCE(v_blended_process, 0)::numeric, 2),
    'strategy',  round(COALESCE(v_strategy_score, 0)::numeric, 2),
    'objective', round(v_objective_score::numeric, 2),
    'spread',    round(v_spread::numeric, 2),
    'disputed',  v_is_disputed,
    'weights',   jsonb_build_object(
      'objective', w_objective, 'process', w_process,
      'strategy', w_strategy, 'integrity', w_integrity
    )
  );
END;
$$;

-- ============================================================
-- 5. Fix calculate_composite_score: rename efficiency → integrity_weight
--    (kept for backcompat but now named correctly)
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_composite_score(
  p_objective real,
  p_process real,
  p_strategy real,
  p_integrity_score real,            -- was p_efficiency
  p_integrity_adjustment real,
  p_format text DEFAULT 'standard',
  p_custom_weights jsonb DEFAULT NULL
)
RETURNS real
LANGUAGE plpgsql
AS $$
DECLARE
  w_objective real;
  w_process real;
  w_strategy real;
  w_integrity real;
  base_score real;
BEGIN
  IF p_custom_weights IS NOT NULL AND p_custom_weights != '{}'::jsonb THEN
    w_objective  := COALESCE((p_custom_weights->>'objective')::real,  0.50);
    w_process    := COALESCE((p_custom_weights->>'process')::real,    0.20);
    w_strategy   := COALESCE((p_custom_weights->>'strategy')::real,   0.20);
    w_integrity  := COALESCE((p_custom_weights->>'integrity')::real,  0.10);
  ELSE
    CASE p_format
      WHEN 'sprint' THEN
        w_objective := 0.60; w_process := 0.15; w_strategy := 0.15; w_integrity := 0.10;
      WHEN 'marathon' THEN
        w_objective := 0.40; w_process := 0.20; w_strategy := 0.30; w_integrity := 0.10;
      WHEN 'versus' THEN
        w_objective := 0.35; w_process := 0.20; w_strategy := 0.25; w_integrity := 0.10;
      ELSE
        w_objective := 0.50; w_process := 0.20; w_strategy := 0.20; w_integrity := 0.10;
    END CASE;
  END IF;

  base_score :=
    COALESCE(p_objective, 0)          * w_objective +
    COALESCE(p_process, 0)            * w_process   +
    COALESCE(p_strategy, 0)           * w_strategy  +
    COALESCE(p_integrity_score, 0)    * w_integrity;

  base_score := base_score + GREATEST(-25, LEAST(10, COALESCE(p_integrity_adjustment, 0)));

  RETURN GREATEST(0, LEAST(100, base_score));
END;
$$;

-- ============================================================
-- 6. Ensure final_score stays in sync with composite_score
--    Trigger: after composite_score update, sync to final_score
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_composite_to_final_score()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only sync if composite changed and final_score differs
  IF NEW.composite_score IS NOT NULL AND NEW.composite_score IS DISTINCT FROM OLD.composite_score THEN
    NEW.final_score := NEW.composite_score;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_composite_to_final ON public.challenge_entries;
CREATE TRIGGER trg_sync_composite_to_final
  BEFORE UPDATE OF composite_score ON public.challenge_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_composite_to_final_score();

-- ============================================================
-- 7. Add challenge_entries.has_objective_tests flag
--    Set by admin when hidden tests are added for a challenge
-- ============================================================

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS has_objective_tests boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS objective_test_count integer NOT NULL DEFAULT 0;

-- Auto-update objective_test_count when tests are added/removed
CREATE OR REPLACE FUNCTION public.update_objective_test_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.challenges SET
    objective_test_count = (
      SELECT COUNT(*) FROM public.hidden_test_cases
      WHERE challenge_id = COALESCE(NEW.challenge_id, OLD.challenge_id)
        AND is_active = true
    ),
    has_objective_tests = (
      SELECT COUNT(*) > 0 FROM public.hidden_test_cases
      WHERE challenge_id = COALESCE(NEW.challenge_id, OLD.challenge_id)
        AND is_active = true
    )
  WHERE id = COALESCE(NEW.challenge_id, OLD.challenge_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_update_objective_test_count ON public.hidden_test_cases;
CREATE TRIGGER trg_update_objective_test_count
  AFTER INSERT OR UPDATE OR DELETE ON public.hidden_test_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_objective_test_count();

-- ============================================================
-- 8. Fix job_queue unique constraint (for ON CONFLICT DO NOTHING)
-- ============================================================

ALTER TABLE public.job_queue
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS payload jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- ============================================================
-- 9. Add admin policy on objective_test_results for challenge owner
-- ============================================================

-- Already created above — ensuring index exists
CREATE INDEX IF NOT EXISTS idx_obj_results_challenge_entry 
  ON public.objective_test_results(challenge_id, entry_id);
