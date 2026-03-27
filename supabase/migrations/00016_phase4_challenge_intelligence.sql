-- ============================================================
-- 00016: Phase 4 — Challenge Intelligence
-- Difficulty profiles, lineage, CDI, calibration gates, quarantine
-- Forge · 2026-03-27
-- ============================================================

-- ============================================================
-- 1. challenge_families — canonical engine registry
-- ============================================================

CREATE TABLE IF NOT EXISTS public.challenge_families (
  id text PRIMARY KEY,  -- e.g. 'blacksite-debug', 'fog-of-war'
  name text NOT NULL,
  description text NOT NULL,
  -- Default difficulty profile for this family
  default_difficulty_profile jsonb NOT NULL DEFAULT '{}',
  -- Default judge weight overrides for this family
  default_judge_weights jsonb NOT NULL DEFAULT '{}',
  -- Generation parameters for mutation layer
  mutation_params jsonb NOT NULL DEFAULT '{}',
  -- Prestige level
  prestige text NOT NULL DEFAULT 'standard' CHECK (prestige IN ('standard', 'elite', 'boss', 'invitational')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.challenge_families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Challenge families viewable by everyone" ON public.challenge_families FOR SELECT USING (true);
CREATE POLICY "Admins can manage challenge families" ON public.challenge_families FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Seed canonical families
INSERT INTO public.challenge_families (id, name, description, default_judge_weights, prestige) VALUES
  ('blacksite-debug', 'Blacksite Debug', 'Find and fix hidden bugs in a complex system under adversarial conditions.',
   '{"objective":0.45,"process":0.20,"strategy":0.10,"integrity":0.10,"efficiency":0.15}', 'elite'),
  ('fog-of-war', 'Fog of War', 'Solve a problem with incomplete and potentially misleading information.',
   '{"objective":0.35,"process":0.20,"strategy":0.25,"integrity":0.10,"efficiency":0.10}', 'elite'),
  ('false-summit', 'False Summit', 'Navigate a problem designed to create premature confidence.',
   '{"objective":0.40,"process":0.15,"strategy":0.10,"integrity":0.20,"efficiency":0.15}', 'elite'),
  ('versus-arena', 'Versus Arena', 'Head-to-head competition on the same challenge instance.',
   '{"objective":0.30,"process":0.15,"strategy":0.25,"integrity":0.10,"efficiency":0.20}', 'boss'),
  ('marathon-strategy', 'Marathon Strategy', 'Long-horizon planning and execution across multiple phases.',
   '{"objective":0.30,"process":0.15,"strategy":0.30,"integrity":0.10,"efficiency":0.15}', 'elite'),
  ('constraint-maze', 'Constraint Maze', 'Solve under tight, cascading constraints.',
   '{"objective":0.50,"process":0.20,"strategy":0.15,"integrity":0.10,"efficiency":0.05}', 'standard'),
  ('recovery-lab', 'Recovery Lab', 'Inherit a broken system and restore it to correct operation.',
   '{"objective":0.45,"process":0.25,"strategy":0.10,"integrity":0.10,"efficiency":0.10}', 'standard')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Add family_id to challenges (nullable — not all challenges
--    belong to a canonical family yet)
-- ============================================================

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS family_id text REFERENCES public.challenge_families(id),
  -- Mutation tracking
  ADD COLUMN IF NOT EXISTS mutation_generation integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_challenge_id uuid REFERENCES public.challenges(id),
  -- Freshness
  ADD COLUMN IF NOT EXISTS freshness_score real NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS solve_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retire_after_solves integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS retired_at timestamptz,
  -- Quarantine
  ADD COLUMN IF NOT EXISTS quarantine_reason text,
  ADD COLUMN IF NOT EXISTS quarantined_at timestamptz,
  ADD COLUMN IF NOT EXISTS quarantined_by uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_challenges_family_id ON public.challenges(family_id) WHERE family_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_challenges_calibration_status ON public.challenges(calibration_status);
CREATE INDEX IF NOT EXISTS idx_challenges_freshness ON public.challenges(freshness_score DESC);

-- ============================================================
-- 3. Function: compute_cdi (Challenge Discrimination Index)
-- Runs after a challenge closes — grades how well it separated agents
-- ============================================================

CREATE OR REPLACE FUNCTION public.compute_cdi(p_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_scores real[];
  v_count integer;
  v_mean real;
  v_stddev real;
  v_min real;
  v_max real;
  v_spread real;
  v_cdi_score real;
  v_cdi_grade text;
  v_solve_count integer;
BEGIN
  -- Get all composite scores for this challenge
  SELECT
    ARRAY_AGG(composite_score ORDER BY composite_score),
    COUNT(*),
    AVG(composite_score),
    STDDEV(composite_score),
    MIN(composite_score),
    MAX(composite_score),
    COUNT(*) FILTER (WHERE composite_score > 60)
  INTO v_scores, v_count, v_mean, v_stddev, v_min, v_max, v_solve_count
  FROM public.challenge_entries
  WHERE challenge_id = p_challenge_id
    AND status IN ('judged', 'scored')
    AND composite_score IS NOT NULL;

  IF v_count < 3 THEN
    -- Not enough data to compute CDI
    UPDATE public.challenges SET
      calibration_status = 'calibrating',
      solve_count = COALESCE(v_count, 0)
    WHERE id = p_challenge_id;
    RETURN;
  END IF;

  v_spread := v_max - v_min;

  -- CDI score: weighted composite of spread, stddev, and mean position
  -- Ideal: mean ~60, stddev ~15-20, spread ~50+
  v_cdi_score :=
    -- Spread contribution (40 pts) — wider spread = more discrimination
    (LEAST(v_spread / 60.0, 1.0) * 40) +
    -- Stddev contribution (35 pts) — higher stddev = more separation
    (LEAST(COALESCE(v_stddev, 0) / 20.0, 1.0) * 35) +
    -- Mean position (25 pts) — mean ~50-70 is ideal (not too easy, not impossible)
    (CASE
      WHEN v_mean BETWEEN 45 AND 75 THEN 25
      WHEN v_mean BETWEEN 35 AND 85 THEN 15
      ELSE 5
    END);

  -- Clamp
  v_cdi_score := GREATEST(0, LEAST(100, v_cdi_score));

  -- Grade
  v_cdi_grade := CASE
    WHEN v_cdi_score >= 85 THEN 'S'
    WHEN v_cdi_score >= 70 THEN 'A'
    WHEN v_cdi_score >= 50 THEN 'B'
    WHEN v_cdi_score >= 30 THEN 'C'
    ELSE 'reject'
  END;

  -- Update challenge
  UPDATE public.challenges SET
    cdi_score = v_cdi_score,
    cdi_grade = v_cdi_grade,
    calibration_status = CASE
      WHEN v_cdi_grade = 'reject' THEN 'quarantined'
      ELSE 'calibrated'
    END,
    solve_count = v_solve_count,
    -- Decrease freshness as solves accumulate
    freshness_score = GREATEST(0, 100 - (v_solve_count::real / retire_after_solves * 100)),
    -- Auto-quarantine reject-grade challenges
    quarantine_reason = CASE WHEN v_cdi_grade = 'reject' THEN 'Auto-quarantined: CDI grade reject (score=' || round(v_cdi_score::numeric, 1) || ')' ELSE quarantine_reason END,
    quarantined_at = CASE WHEN v_cdi_grade = 'reject' AND quarantined_at IS NULL THEN now() ELSE quarantined_at END
  WHERE id = p_challenge_id;

END;
$$;

-- ============================================================
-- 4. Function: quarantine_challenge
-- Admin-callable to manually quarantine a challenge
-- ============================================================

CREATE OR REPLACE FUNCTION public.quarantine_challenge(
  p_challenge_id uuid,
  p_reason text,
  p_admin_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.challenges SET
    calibration_status = 'quarantined',
    quarantine_reason = p_reason,
    quarantined_at = now(),
    quarantined_by = p_admin_id,
    status = 'complete'  -- prevent new entries
  WHERE id = p_challenge_id;
END;
$$;

-- ============================================================
-- 5. Function: check_publication_gates
-- Returns whether a challenge passes all gates for going active
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_publication_gates(p_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_challenge record;
  v_gates jsonb;
  v_all_pass boolean := true;
BEGIN
  SELECT * INTO v_challenge FROM public.challenges WHERE id = p_challenge_id;

  IF v_challenge IS NULL THEN
    RETURN '{"error": "Challenge not found"}'::jsonb;
  END IF;

  v_gates := jsonb_build_object(
    'has_prompt',
      CASE WHEN v_challenge.prompt IS NOT NULL AND length(v_challenge.prompt) > 50
        THEN jsonb_build_object('pass', true)
        ELSE jsonb_build_object('pass', false, 'reason', 'Prompt missing or too short')
      END,
    'has_difficulty_profile',
      CASE WHEN v_challenge.difficulty_profile IS NOT NULL AND v_challenge.difficulty_profile != '{}'::jsonb
        THEN jsonb_build_object('pass', true)
        ELSE jsonb_build_object('pass', false, 'reason', 'Difficulty profile not set')
      END,
    'not_quarantined',
      CASE WHEN v_challenge.calibration_status != 'quarantined'
        THEN jsonb_build_object('pass', true)
        ELSE jsonb_build_object('pass', false, 'reason', 'Challenge is quarantined: ' || COALESCE(v_challenge.quarantine_reason, 'unknown'))
      END,
    'freshness_ok',
      CASE WHEN v_challenge.freshness_score > 20
        THEN jsonb_build_object('pass', true)
        ELSE jsonb_build_object('pass', false, 'reason', 'Freshness score too low (' || round(v_challenge.freshness_score::numeric, 0) || '/100) — consider retiring')
      END,
    'judge_weights_set',
      CASE WHEN v_challenge.judge_weights IS NOT NULL AND v_challenge.judge_weights != '{}'::jsonb
        THEN jsonb_build_object('pass', true)
        ELSE jsonb_build_object('pass', false, 'reason', 'No judge weight overrides — will use format defaults (OK)')
      END
  );

  -- Determine overall pass (required gates only)
  v_all_pass := (v_gates->'has_prompt'->>'pass')::boolean
    AND (v_gates->'not_quarantined'->>'pass')::boolean
    AND (v_gates->'freshness_ok'->>'pass')::boolean;

  RETURN jsonb_build_object('pass', v_all_pass, 'gates', v_gates);
END;
$$;

-- ============================================================
-- 6. Trigger: auto-compute CDI when challenge transitions to complete
-- ============================================================

CREATE OR REPLACE FUNCTION public.on_challenge_complete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'complete' AND OLD.status != 'complete' THEN
    PERFORM public.compute_cdi(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_on_challenge_complete ON public.challenges;
CREATE TRIGGER trigger_on_challenge_complete
  AFTER UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.on_challenge_complete();

-- ============================================================
-- 7. challenge_defensibility_reports
-- Audit trail per challenge per run cycle
-- ============================================================

CREATE TABLE IF NOT EXISTS public.challenge_defensibility_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  -- Snapshot at time of report
  cdi_score real,
  cdi_grade text,
  calibration_status text,
  freshness_score real,
  solve_count integer,
  judge_agreement_rate real,  -- % of entries with no dispute
  exploit_flag_count integer,
  contamination_risk text CHECK (contamination_risk IN ('low', 'medium', 'high', 'critical')),
  lineage_chain text,
  report_notes text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.challenge_defensibility_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Defensibility reports viewable by admins"
  ON public.challenge_defensibility_reports FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins can manage defensibility reports"
  ON public.challenge_defensibility_reports FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE INDEX idx_defensibility_challenge ON public.challenge_defensibility_reports(challenge_id);
