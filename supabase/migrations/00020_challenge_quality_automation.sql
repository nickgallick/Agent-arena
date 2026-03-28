-- Migration 00020: Challenge Quality Automation
-- CDI auto-calculation, auto-flagging, quarantine, activation gate, admin audit trail

-- ─────────────────────────────────────────────
-- 1. Add quality metrics columns to challenges
-- ─────────────────────────────────────────────
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS solve_rate numeric,
  ADD COLUMN IF NOT EXISTS score_mean numeric,
  ADD COLUMN IF NOT EXISTS score_stddev numeric,
  ADD COLUMN IF NOT EXISTS dispute_rate numeric,
  ADD COLUMN IF NOT EXISTS exploit_rate numeric,
  ADD COLUMN IF NOT EXISTS tier_separation numeric,
  ADD COLUMN IF NOT EXISTS last_calculated_at timestamptz,
  ADD COLUMN IF NOT EXISTS quarantine_reason text,
  ADD COLUMN IF NOT EXISTS quarantined_at timestamptz,
  ADD COLUMN IF NOT EXISTS min_required_samples int DEFAULT 20;

-- Update calibration_status to support full lifecycle
ALTER TABLE challenges
  ALTER COLUMN calibration_status SET DEFAULT 'draft';

-- Migrate existing values
UPDATE challenges
  SET calibration_status = 'draft'
  WHERE calibration_status IS NULL OR calibration_status = 'uncalibrated';

-- ─────────────────────────────────────────────
-- 2. Quality snapshots table (historical trending)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenge_quality_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  sample_count int NOT NULL DEFAULT 0,
  solve_rate numeric,
  score_mean numeric,
  score_stddev numeric,
  dispute_rate numeric,
  exploit_rate numeric,
  tier_separation numeric,
  cdi_score numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quality_snapshots_challenge_id
  ON challenge_quality_snapshots(challenge_id);
CREATE INDEX IF NOT EXISTS idx_quality_snapshots_created_at
  ON challenge_quality_snapshots(created_at DESC);

-- ─────────────────────────────────────────────
-- 3. Admin audit trail table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenge_admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  actor text NOT NULL,
  action text NOT NULL, -- flag, unflag, quarantine, unquarantine, retire, force_activate, recalculate
  reason text,
  previous_status text,
  new_status text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_challenge_id
  ON challenge_admin_actions(challenge_id);

-- ─────────────────────────────────────────────
-- 4. compute_challenge_quality(challenge_id)
-- Calculates all metrics + CDI, writes back to challenges, inserts snapshot
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION compute_challenge_quality(p_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sample_count int;
  v_solve_rate numeric;
  v_score_mean numeric;
  v_score_stddev numeric;
  v_dispute_rate numeric;
  v_exploit_rate numeric;
  v_tier_separation numeric;
  v_cdi_score numeric;

  -- CDI subscores
  v_solve_rate_score numeric;
  v_variance_score numeric;
  v_agreement_score numeric;
  v_separation_score numeric;

  -- Tier avg scores
  v_elite_avg numeric;
  v_standard_avg numeric;

  result jsonb;
BEGIN
  -- Count valid judged runs
  SELECT COUNT(*)
  INTO v_sample_count
  FROM challenge_entries ce
  WHERE ce.challenge_id = p_challenge_id
    AND ce.status = 'judged'
    AND ce.composite_score IS NOT NULL;

  -- Not enough data yet
  IF v_sample_count < 5 THEN
    RETURN jsonb_build_object(
      'sample_count', v_sample_count,
      'status', 'insufficient_data'
    );
  END IF;

  -- Solve rate: entries where objective_score >= 50 (passed majority of tests)
  SELECT
    ROUND(COUNT(*) FILTER (WHERE ce.objective_score >= 50)::numeric / NULLIF(COUNT(*), 0), 4),
    ROUND(AVG(ce.composite_score), 2),
    ROUND(STDDEV(ce.composite_score), 2),
    ROUND(COUNT(*) FILTER (WHERE ce.dispute_flagged = true)::numeric / NULLIF(COUNT(*), 0), 4)
  INTO v_solve_rate, v_score_mean, v_score_stddev, v_dispute_rate
  FROM challenge_entries ce
  WHERE ce.challenge_id = p_challenge_id
    AND ce.status = 'judged'
    AND ce.composite_score IS NOT NULL;

  -- Exploit rate: entries with integrity issues
  SELECT ROUND(
    COUNT(*) FILTER (
      WHERE ce.integrity_adjustment < -10
         OR EXISTS (
           SELECT 1 FROM judge_outputs jo
           WHERE jo.entry_id = ce.id
             AND jo.judge_type = 'integrity'
             AND jo.flags::text ILIKE '%exploit%'
         )
    )::numeric / NULLIF(COUNT(*), 0), 4
  )
  INTO v_exploit_rate
  FROM challenge_entries ce
  WHERE ce.challenge_id = p_challenge_id
    AND ce.status = 'judged';

  -- Tier separation: compare top 25% vs bottom 25% avg scores
  SELECT
    AVG(composite_score) FILTER (
      WHERE composite_score >= PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY composite_score)
            OVER (PARTITION BY challenge_id)
    ),
    AVG(composite_score) FILTER (
      WHERE composite_score <= PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY composite_score)
            OVER (PARTITION BY challenge_id)
    )
  INTO v_elite_avg, v_standard_avg
  FROM challenge_entries
  WHERE challenge_id = p_challenge_id
    AND status = 'judged'
    AND composite_score IS NOT NULL
  LIMIT 1;

  v_tier_separation := COALESCE(ROUND(v_elite_avg - v_standard_avg, 2), 0);

  -- ── CDI Calculation ──────────────────────────
  -- Solve rate score: best zone 20–60%, penalize extremes
  v_solve_rate_score := CASE
    WHEN v_solve_rate IS NULL THEN 50
    WHEN v_solve_rate BETWEEN 0.20 AND 0.60 THEN 100
    WHEN v_solve_rate BETWEEN 0.10 AND 0.20 THEN 70
    WHEN v_solve_rate BETWEEN 0.60 AND 0.75 THEN 70
    WHEN v_solve_rate BETWEEN 0.75 AND 0.85 THEN 40
    WHEN v_solve_rate > 0.85 THEN 10
    WHEN v_solve_rate < 0.05 THEN 10
    ELSE 50
  END;

  -- Score variance score: based on stddev
  v_variance_score := CASE
    WHEN v_score_stddev IS NULL THEN 30
    WHEN v_score_stddev >= 18 THEN 100
    WHEN v_score_stddev >= 14 THEN 80
    WHEN v_score_stddev >= 10 THEN 60
    WHEN v_score_stddev >= 8  THEN 40
    ELSE 10
  END;

  -- Judge agreement score: inverse of dispute rate
  v_agreement_score := CASE
    WHEN v_dispute_rate IS NULL THEN 80
    WHEN v_dispute_rate <= 0.05 THEN 100
    WHEN v_dispute_rate <= 0.10 THEN 75
    WHEN v_dispute_rate <= 0.15 THEN 50
    ELSE 20
  END;

  -- Tier separation score
  v_separation_score := CASE
    WHEN v_tier_separation IS NULL THEN 30
    WHEN v_tier_separation >= 25 THEN 100
    WHEN v_tier_separation >= 18 THEN 80
    WHEN v_tier_separation >= 12 THEN 60
    WHEN v_tier_separation >= 8  THEN 40
    ELSE 15
  END;

  -- Weighted CDI
  v_cdi_score := ROUND(
    (v_solve_rate_score * 0.30) +
    (v_variance_score   * 0.25) +
    (v_agreement_score  * 0.20) +
    (v_separation_score * 0.25),
  2);

  -- Write metrics back to challenges
  UPDATE challenges SET
    solve_rate          = v_solve_rate,
    score_mean          = v_score_mean,
    score_stddev        = v_score_stddev,
    dispute_rate        = v_dispute_rate,
    exploit_rate        = v_exploit_rate,
    tier_separation     = v_tier_separation,
    cdi_score           = v_cdi_score,
    last_calculated_at  = now()
  WHERE id = p_challenge_id;

  -- Insert quality snapshot
  INSERT INTO challenge_quality_snapshots (
    challenge_id, sample_count, solve_rate, score_mean, score_stddev,
    dispute_rate, exploit_rate, tier_separation, cdi_score
  ) VALUES (
    p_challenge_id, v_sample_count, v_solve_rate, v_score_mean, v_score_stddev,
    v_dispute_rate, v_exploit_rate, v_tier_separation, v_cdi_score
  );

  result := jsonb_build_object(
    'challenge_id',    p_challenge_id,
    'sample_count',    v_sample_count,
    'solve_rate',      v_solve_rate,
    'score_mean',      v_score_mean,
    'score_stddev',    v_score_stddev,
    'dispute_rate',    v_dispute_rate,
    'exploit_rate',    v_exploit_rate,
    'tier_separation', v_tier_separation,
    'cdi_score',       v_cdi_score
  );

  RETURN result;
END;
$$;

-- ─────────────────────────────────────────────
-- 5. evaluate_challenge_status(challenge_id)
-- Reads latest metrics, applies thresholds, returns recommended status + reason
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION evaluate_challenge_status(p_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge challenges%ROWTYPE;
  v_new_status text;
  v_reason text;
BEGIN
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'challenge not found');
  END IF;

  -- Not enough data to enforce
  IF v_challenge.last_calculated_at IS NULL THEN
    RETURN jsonb_build_object('status', v_challenge.calibration_status, 'reason', 'no_metrics_yet');
  END IF;

  -- ── QUARANTINE triggers (hard) ──────────────
  IF COALESCE(v_challenge.exploit_rate, 0) > 0.08 THEN
    v_new_status := 'quarantined';
    v_reason := 'exploit_rate_critical';
  ELSIF COALESCE(v_challenge.dispute_rate, 0) > 0.20 THEN
    v_new_status := 'quarantined';
    v_reason := 'dispute_rate_critical';
  END IF;

  -- ── FLAG triggers (soft) ────────────────────
  IF v_new_status IS NULL THEN
    IF COALESCE(v_challenge.solve_rate, 0.5) > 0.85 THEN
      v_new_status := 'flagged';
      v_reason := 'solve_rate_too_high';
    ELSIF COALESCE(v_challenge.solve_rate, 0.5) < 0.05 THEN
      v_new_status := 'flagged';
      v_reason := 'solve_rate_too_low';
    ELSIF COALESCE(v_challenge.score_stddev, 15) < 8 THEN
      v_new_status := 'flagged';
      v_reason := 'score_distribution_flat';
    ELSIF COALESCE(v_challenge.dispute_rate, 0) > 0.12 THEN
      v_new_status := 'flagged';
      v_reason := 'dispute_rate_elevated';
    ELSIF COALESCE(v_challenge.exploit_rate, 0) > 0.03 THEN
      v_new_status := 'flagged';
      v_reason := 'exploit_rate_elevated';
    ELSIF COALESCE(v_challenge.tier_separation, 15) < 10 THEN
      v_new_status := 'flagged';
      v_reason := 'weak_tier_separation';
    END IF;
  END IF;

  -- ── Apply status change if needed ───────────
  IF v_new_status IS NOT NULL AND v_new_status != v_challenge.calibration_status THEN
    UPDATE challenges SET
      calibration_status = v_new_status,
      quarantine_reason  = CASE WHEN v_new_status = 'quarantined' THEN v_reason ELSE quarantine_reason END,
      quarantined_at     = CASE WHEN v_new_status = 'quarantined' AND quarantined_at IS NULL THEN now() ELSE quarantined_at END
    WHERE id = p_challenge_id;

    RETURN jsonb_build_object(
      'challenge_id', p_challenge_id,
      'previous_status', v_challenge.calibration_status,
      'new_status', v_new_status,
      'reason', v_reason,
      'changed', true
    );
  END IF;

  RETURN jsonb_build_object(
    'challenge_id', p_challenge_id,
    'status', v_challenge.calibration_status,
    'reason', COALESCE(v_reason, 'no_change'),
    'changed', false
  );
END;
$$;

-- ─────────────────────────────────────────────
-- 6. can_activate_challenge(challenge_id)
-- Activation gate — returns allowed + reason
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION can_activate_challenge(p_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge challenges%ROWTYPE;
BEGIN
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'challenge_not_found');
  END IF;

  -- Must have passed calibration
  IF v_challenge.calibration_status NOT IN ('passed', 'active') THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'calibration_status_not_passed',
      'current_status', v_challenge.calibration_status
    );
  END IF;

  -- Must not be quarantined
  IF v_challenge.calibration_status = 'quarantined' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'challenge_quarantined');
  END IF;

  -- Must have a prompt/spec
  IF v_challenge.description IS NULL OR length(v_challenge.description) < 20 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'missing_challenge_spec');
  END IF;

  -- Must have a format
  IF v_challenge.format IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'missing_format');
  END IF;

  RETURN jsonb_build_object('allowed', true, 'reason', 'all_gates_passed');
END;
$$;

-- ─────────────────────────────────────────────
-- 7. run_quality_enforcement_pass()
-- Runs compute + evaluate on all active/calibrating challenges
-- Called by cron job
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION run_quality_enforcement_pass()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge_id uuid;
  v_processed int := 0;
  v_flagged int := 0;
  v_quarantined int := 0;
  v_result jsonb;
  v_status_result jsonb;
BEGIN
  FOR v_challenge_id IN
    SELECT id FROM challenges
    WHERE status IN ('active', 'judging')
       OR calibration_status IN ('calibrating', 'passed', 'flagged')
    ORDER BY last_calculated_at ASC NULLS FIRST
    LIMIT 50
  LOOP
    -- Recompute metrics
    PERFORM compute_challenge_quality(v_challenge_id);

    -- Evaluate and apply status changes
    v_status_result := evaluate_challenge_status(v_challenge_id);

    v_processed := v_processed + 1;

    IF (v_status_result->>'new_status') = 'flagged' THEN
      v_flagged := v_flagged + 1;
    ELSIF (v_status_result->>'new_status') = 'quarantined' THEN
      v_quarantined := v_quarantined + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'newly_flagged', v_flagged,
    'newly_quarantined', v_quarantined,
    'run_at', now()
  );
END;
$$;

-- ─────────────────────────────────────────────
-- 8. RLS policies
-- ─────────────────────────────────────────────
ALTER TABLE challenge_quality_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_admin_actions ENABLE ROW LEVEL SECURITY;

-- Snapshots: readable by all authenticated, writable by service role only
CREATE POLICY "snapshots_select" ON challenge_quality_snapshots
  FOR SELECT TO authenticated USING (true);

-- Admin actions: admin users only
CREATE POLICY "admin_actions_select" ON challenge_admin_actions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ─────────────────────────────────────────────
-- 9. Indexes
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_challenges_calibration_status
  ON challenges(calibration_status);
CREATE INDEX IF NOT EXISTS idx_challenges_cdi_score
  ON challenges(cdi_score);
CREATE INDEX IF NOT EXISTS idx_challenges_last_calculated
  ON challenges(last_calculated_at);
