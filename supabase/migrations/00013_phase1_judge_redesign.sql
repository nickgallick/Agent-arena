-- ============================================================
-- 00013: Phase 1 — 5-Lane Judge Architecture
-- Forge · 2026-03-27
-- ============================================================
-- Changes:
-- 1. Add lane-based score columns to judge_scores
-- 2. Add composite score columns to challenge_entries
-- 3. Add difficulty_profile + judge_weights to challenges
-- 4. Add judge_outputs table (structured per-lane evidence store)
-- 5. Add dispute_flags table
-- ============================================================

-- ============================================================
-- 1. Extend judge_scores with lane-based scoring
-- ============================================================

ALTER TABLE public.judge_scores
  -- Lane identity
  ADD COLUMN IF NOT EXISTS lane text CHECK (lane IN ('process', 'strategy', 'integrity', 'objective', 'audit')),
  -- Lane score (0-100)
  ADD COLUMN IF NOT EXISTS lane_score real,
  -- Confidence (0-1)
  ADD COLUMN IF NOT EXISTS confidence real CHECK (confidence >= 0 AND confidence <= 1),
  -- Structured dimension subscores (jsonb for flexibility)
  ADD COLUMN IF NOT EXISTS dimension_scores jsonb NOT NULL DEFAULT '{}',
  -- Evidence refs from telemetry or artifacts
  ADD COLUMN IF NOT EXISTS evidence_refs jsonb NOT NULL DEFAULT '[]',
  -- Short rationale (required for non-objective lanes)
  ADD COLUMN IF NOT EXISTS short_rationale text,
  -- Integrity adjustment (positive = bonus, negative = penalty)
  ADD COLUMN IF NOT EXISTS integrity_adjustment real DEFAULT 0,
  -- Integrity outcome
  ADD COLUMN IF NOT EXISTS integrity_outcome text CHECK (integrity_outcome IN ('clean', 'commendable', 'suspicious', 'exploitative', 'disqualifying')),
  -- Fallback flag (was another model used due to availability?)
  ADD COLUMN IF NOT EXISTS is_fallback boolean NOT NULL DEFAULT false,
  -- Actual model used (pinned ID)
  ADD COLUMN IF NOT EXISTS pinned_model_id text;

-- Index for lane queries
CREATE INDEX IF NOT EXISTS idx_judge_scores_lane ON public.judge_scores(entry_id, lane);
CREATE INDEX IF NOT EXISTS idx_judge_scores_integrity_outcome ON public.judge_scores(integrity_outcome) WHERE integrity_outcome IS NOT NULL;

-- ============================================================
-- 2. Extend challenge_entries with composite score breakdown
-- ============================================================

ALTER TABLE public.challenge_entries
  -- Per-lane scores
  ADD COLUMN IF NOT EXISTS objective_score real,
  ADD COLUMN IF NOT EXISTS process_score real,
  ADD COLUMN IF NOT EXISTS strategy_score real,
  ADD COLUMN IF NOT EXISTS integrity_adjustment real DEFAULT 0,
  ADD COLUMN IF NOT EXISTS efficiency_score real,
  -- Composite (replaces final_score as primary, final_score kept for backcompat)
  ADD COLUMN IF NOT EXISTS composite_score real,
  -- Dispute state
  ADD COLUMN IF NOT EXISTS dispute_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS dispute_resolved_at timestamptz,
  -- Challenge format at time of submission (for weight lookup)
  ADD COLUMN IF NOT EXISTS challenge_format text,
  -- Score version (for recalculation tracking)
  ADD COLUMN IF NOT EXISTS score_version integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_entries_composite_score ON public.challenge_entries(composite_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_entries_dispute_flagged ON public.challenge_entries(dispute_flagged) WHERE dispute_flagged = true;

-- ============================================================
-- 3. Extend challenges with difficulty profile + judge weights
-- ============================================================

ALTER TABLE public.challenges
  -- 8-dimension difficulty profile (each 1-10)
  -- { reasoning_depth, tool_dependence, ambiguity, deception,
  --   time_pressure, error_recovery_burden, non_local_dependency, evaluation_strictness }
  ADD COLUMN IF NOT EXISTS difficulty_profile jsonb NOT NULL DEFAULT '{}',
  -- Per-challenge judge weight overrides (falls back to format defaults)
  -- { objective, process, strategy, integrity }
  ADD COLUMN IF NOT EXISTS judge_weights jsonb NOT NULL DEFAULT '{}',
  -- Lineage metadata for contamination tracking
  ADD COLUMN IF NOT EXISTS lineage jsonb NOT NULL DEFAULT '{}',
  -- Calibration status
  ADD COLUMN IF NOT EXISTS calibration_status text NOT NULL DEFAULT 'uncalibrated'
    CHECK (calibration_status IN ('uncalibrated', 'calibrating', 'calibrated', 'quarantined')),
  -- Discrimination index (CDI) — computed after runs
  ADD COLUMN IF NOT EXISTS cdi_score real,
  ADD COLUMN IF NOT EXISTS cdi_grade text CHECK (cdi_grade IN ('S', 'A', 'B', 'C', 'reject'));

CREATE INDEX IF NOT EXISTS idx_challenges_calibration ON public.challenges(calibration_status);

-- ============================================================
-- 4. New table: judge_outputs (structured per-lane evidence store)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.judge_outputs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id uuid NOT NULL REFERENCES public.challenge_entries(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  -- Lane identity
  lane text NOT NULL CHECK (lane IN ('process', 'strategy', 'integrity', 'objective', 'audit')),
  -- Pinned model (required — no aliases)
  model_id text NOT NULL,
  provider text NOT NULL,
  -- Scores
  score real NOT NULL CHECK (score >= 0 AND score <= 100),
  confidence real NOT NULL DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  -- Dimension breakdown
  dimension_scores jsonb NOT NULL DEFAULT '{}',
  -- Evidence
  evidence_refs jsonb NOT NULL DEFAULT '[]',
  short_rationale text NOT NULL DEFAULT '',
  flags jsonb NOT NULL DEFAULT '[]',
  -- Integrity-specific
  integrity_outcome text CHECK (integrity_outcome IN ('clean', 'commendable', 'suspicious', 'exploitative', 'disqualifying')),
  integrity_adjustment real DEFAULT 0,
  -- Operational metadata
  latency_ms integer,
  token_usage jsonb,
  is_fallback boolean NOT NULL DEFAULT false,
  fallback_from text,
  -- Dispute / arbitration
  is_arbitration boolean NOT NULL DEFAULT false,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.judge_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Judge outputs viewable by everyone"
  ON public.judge_outputs FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage judge outputs"
  ON public.judge_outputs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE INDEX idx_judge_outputs_entry_id ON public.judge_outputs(entry_id);
CREATE INDEX idx_judge_outputs_challenge_id ON public.judge_outputs(challenge_id);
CREATE INDEX idx_judge_outputs_lane ON public.judge_outputs(entry_id, lane);
CREATE INDEX idx_judge_outputs_integrity ON public.judge_outputs(integrity_outcome) WHERE integrity_outcome IS NOT NULL;

-- ============================================================
-- 5. New table: dispute_flags
-- ============================================================

CREATE TABLE IF NOT EXISTS public.dispute_flags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id uuid NOT NULL REFERENCES public.challenge_entries(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  -- Trigger reason
  trigger_reason text NOT NULL CHECK (trigger_reason IN (
    'judge_spread_exceeded',
    'integrity_contradiction',
    'objective_narrative_conflict',
    'anomaly_detected',
    'exploit_signal',
    'historical_instability',
    'manual_review'
  )),
  -- Scores at time of flagging
  score_snapshot jsonb NOT NULL DEFAULT '{}',
  max_judge_spread real,
  -- State
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'escalated')),
  -- Arbitration
  audit_judge_output_id uuid REFERENCES public.judge_outputs(id),
  adjudicated_score real,
  adjudication_rationale text,
  -- Prize lock
  prize_locked boolean NOT NULL DEFAULT false,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.dispute_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispute flags viewable by admins"
  ON public.dispute_flags FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can manage dispute flags"
  ON public.dispute_flags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE INDEX idx_dispute_flags_entry_id ON public.dispute_flags(entry_id);
CREATE INDEX idx_dispute_flags_status ON public.dispute_flags(status) WHERE status IN ('open', 'in_review');
CREATE INDEX idx_dispute_flags_prize_locked ON public.dispute_flags(prize_locked) WHERE prize_locked = true;

-- ============================================================
-- 6. Function: calculate_composite_score
-- Computes weighted final score from lane scores + integrity adjustment
-- format: 'sprint' | 'standard' | 'marathon' | 'versus'
-- custom_weights: optional jsonb override from challenges.judge_weights
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_composite_score(
  p_objective real,
  p_process real,
  p_strategy real,
  p_efficiency real,
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
  w_efficiency real;
  base_score real;
BEGIN
  -- Use custom weights if provided, else fall back to format defaults
  IF p_custom_weights IS NOT NULL AND p_custom_weights != '{}' THEN
    w_objective  := COALESCE((p_custom_weights->>'objective')::real, 0.50);
    w_process    := COALESCE((p_custom_weights->>'process')::real, 0.20);
    w_strategy   := COALESCE((p_custom_weights->>'strategy')::real, 0.20);
    w_efficiency := COALESCE((p_custom_weights->>'efficiency')::real, 0.10);
  ELSE
    CASE p_format
      WHEN 'sprint' THEN
        w_objective := 0.60; w_process := 0.15; w_strategy := 0.15; w_efficiency := 0.10;
      WHEN 'marathon' THEN
        w_objective := 0.40; w_process := 0.20; w_strategy := 0.30; w_efficiency := 0.10;
      WHEN 'versus' THEN
        w_objective := 0.35; w_process := 0.20; w_strategy := 0.25; w_efficiency := 0.20;
      ELSE -- standard (default)
        w_objective := 0.50; w_process := 0.20; w_strategy := 0.20; w_efficiency := 0.10;
    END CASE;
  END IF;

  -- Weighted base
  base_score :=
    COALESCE(p_objective, 0)  * w_objective  +
    COALESCE(p_process, 0)    * w_process    +
    COALESCE(p_strategy, 0)   * w_strategy   +
    COALESCE(p_efficiency, 0) * w_efficiency;

  -- Integrity adjustment (asymmetric: max +10, min -25)
  base_score := base_score + GREATEST(-25, LEAST(10, COALESCE(p_integrity_adjustment, 0)));

  -- Clamp 0-100
  RETURN GREATEST(0, LEAST(100, base_score));
END;
$$;

-- ============================================================
-- 7. Function: check_dispute_threshold
-- Fires a dispute flag if judge spread exceeds 15 points
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_dispute_threshold(p_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_scores real[];
  v_max_spread real;
  v_challenge_id uuid;
  v_snapshot jsonb;
BEGIN
  -- Get all lane scores for this entry
  SELECT
    ARRAY_AGG(score ORDER BY lane),
    challenge_id,
    jsonb_object_agg(lane, score)
  INTO v_scores, v_challenge_id, v_snapshot
  FROM public.judge_outputs
  WHERE entry_id = p_entry_id
    AND lane IN ('process', 'strategy')
    AND is_arbitration = false
  GROUP BY challenge_id;

  IF v_scores IS NULL OR array_length(v_scores, 1) < 2 THEN
    RETURN;
  END IF;

  -- Calculate max pairwise spread
  v_max_spread := (SELECT MAX(a.val) - MIN(a.val) FROM unnest(v_scores) AS a(val));

  -- Trigger if spread > 15
  IF v_max_spread > 15 THEN
    -- Only insert if not already flagged
    INSERT INTO public.dispute_flags (
      entry_id, challenge_id, trigger_reason,
      score_snapshot, max_judge_spread, prize_locked
    )
    SELECT p_entry_id, v_challenge_id, 'judge_spread_exceeded',
           v_snapshot, v_max_spread, false
    WHERE NOT EXISTS (
      SELECT 1 FROM public.dispute_flags
      WHERE entry_id = p_entry_id AND status IN ('open', 'in_review')
    );

    -- Mark entry as disputed
    UPDATE public.challenge_entries
    SET dispute_flagged = true,
        dispute_reason = 'Judge spread exceeded 15 points: ' || round(v_max_spread::numeric, 1)
    WHERE id = p_entry_id;
  END IF;
END;
$$;

-- ============================================================
-- 8. Backfill: set challenge_format on existing entries
-- ============================================================

UPDATE public.challenge_entries ce
SET challenge_format = c.format
FROM public.challenges c
WHERE ce.challenge_id = c.id
  AND ce.challenge_format IS NULL;
