-- Migration 00023: Challenge Pipeline
-- Adds reserve status, calibration pipeline states, and auto-calibration support
-- Forge · 2026-03-28

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add 'reserve' to challenge status enum
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE challenges
  DROP CONSTRAINT IF EXISTS challenges_status_check;

ALTER TABLE challenges
  ADD CONSTRAINT challenges_status_check
  CHECK (status IN ('upcoming', 'reserve', 'active', 'judging', 'complete'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Expand calibration_status values
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE challenges
  DROP CONSTRAINT IF EXISTS challenges_calibration_status_check;

ALTER TABLE challenges
  DROP CONSTRAINT IF EXISTS challenge_calibration_status_check;

ALTER TABLE challenges
  ADD CONSTRAINT challenges_calibration_status_check
  CHECK (calibration_status IN (
    'draft',          -- just created, not yet submitted for calibration
    'pending',        -- queued for calibration (trigger fires on this)
    'calibrating',    -- calibration in progress
    'passed',         -- passed calibration → eligible for reserve/active
    'failed',         -- failed calibration → will be deleted
    'flagged',        -- borderline → needs human review
    'quarantined'     -- was active, now quarantined due to live data
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Add pipeline tracking columns
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS calibration_queued_at    timestamptz,
  ADD COLUMN IF NOT EXISTS calibration_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS calibration_verdict       text,
  ADD COLUMN IF NOT EXISTS calibration_reason        text,
  ADD COLUMN IF NOT EXISTS auto_promote              boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS generated_by              text;   -- 'gauntlet' | 'manual' | 'mutation'

-- Index for pipeline queries
CREATE INDEX IF NOT EXISTS idx_challenges_calibration_status
  ON challenges(calibration_status)
  WHERE calibration_status IN ('pending', 'calibrating', 'flagged');

CREATE INDEX IF NOT EXISTS idx_challenges_status_reserve
  ON challenges(status)
  WHERE status = 'reserve';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Family active cap enforcement function
-- Prevents more than 2 active challenges from the same family
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_family_active_cap()
RETURNS TRIGGER AS $$
DECLARE
  v_active_count integer;
  v_cap integer := 2;
BEGIN
  -- Only enforce when transitioning to active
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    IF NEW.family_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_active_count
      FROM challenges
      WHERE family_id = NEW.family_id
        AND status = 'active'
        AND id != NEW.id;

      IF v_active_count >= v_cap THEN
        RAISE EXCEPTION 'Family cap: already % active challenges in family % (max %)',
          v_active_count, NEW.family_id, v_cap;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_family_cap ON challenges;
CREATE TRIGGER trg_check_family_cap
  BEFORE INSERT OR UPDATE OF status ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION check_family_active_cap();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Auto-calibration queue function
-- Called by the /api/internal/auto-calibrate cron
-- Returns challenges that are pending calibration
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_pending_calibration_queue(p_limit integer DEFAULT 5)
RETURNS TABLE (
  challenge_id   uuid,
  title          text,
  prompt         text,
  challenge_type text,
  format         text,
  category       text,
  queued_at      timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.prompt,
    c.challenge_type,
    c.format,
    c.category,
    c.calibration_queued_at
  FROM challenges c
  WHERE c.calibration_status = 'pending'
    AND c.prompt IS NOT NULL
    AND c.prompt != ''
  ORDER BY c.calibration_queued_at ASC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Apply calibration result function
-- Called after calibration completes — updates status, optionally deletes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION apply_calibration_result(
  p_challenge_id  uuid,
  p_verdict       text,   -- 'pass' | 'borderline' | 'fail'
  p_reason        text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_challenge   challenges%ROWTYPE;
  v_action      text;
  v_new_status  text;
  v_new_cal_status text;
BEGIN
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'challenge not found');
  END IF;

  -- Determine action based on verdict
  CASE p_verdict
    WHEN 'pass' THEN
      v_new_cal_status := 'passed';
      -- Auto-promote to reserve if flag is set
      IF v_challenge.auto_promote THEN
        v_new_status := 'reserve';
        v_action := 'promoted_to_reserve';
      ELSE
        v_new_status := v_challenge.status; -- keep current (upcoming)
        v_action := 'passed_no_promote';
      END IF;

    WHEN 'borderline' THEN
      v_new_cal_status := 'flagged';
      v_new_status := v_challenge.status; -- hold, needs human review
      v_action := 'flagged_for_review';

    WHEN 'fail' THEN
      v_new_cal_status := 'failed';
      -- Delete the challenge (it failed calibration)
      DELETE FROM challenges WHERE id = p_challenge_id;
      v_action := 'deleted';
      RETURN jsonb_build_object(
        'action', v_action,
        'challenge_id', p_challenge_id,
        'verdict', p_verdict,
        'reason', p_reason
      );

    ELSE
      RETURN jsonb_build_object('error', 'unknown verdict: ' || p_verdict);
  END CASE;

  -- Update challenge
  UPDATE challenges SET
    calibration_status       = v_new_cal_status,
    status                   = v_new_status,
    calibration_verdict      = p_verdict,
    calibration_reason       = p_reason,
    calibration_completed_at = now(),
    updated_at               = now()
  WHERE id = p_challenge_id;

  RETURN jsonb_build_object(
    'action', v_action,
    'challenge_id', p_challenge_id,
    'verdict', p_verdict,
    'new_status', v_new_status,
    'new_calibration_status', v_new_cal_status,
    'reason', p_reason
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Helper: submit challenge for calibration (sets status to pending)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION queue_challenge_for_calibration(p_challenge_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_challenge challenges%ROWTYPE;
BEGIN
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'challenge not found');
  END IF;
  IF v_challenge.prompt IS NULL OR v_challenge.prompt = '' THEN
    RETURN jsonb_build_object('error', 'challenge has no prompt');
  END IF;

  UPDATE challenges SET
    calibration_status    = 'pending',
    calibration_queued_at = now(),
    updated_at            = now()
  WHERE id = p_challenge_id;

  RETURN jsonb_build_object('queued', true, 'challenge_id', p_challenge_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
