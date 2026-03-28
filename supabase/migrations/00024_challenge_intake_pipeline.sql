-- Migration 00024: Challenge Intake Pipeline
-- Adds pipeline_status, challenge_bundles, forge_reviews, inventory_decisions tables
-- Forge · 2026-03-28

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add pipeline_status column to challenges
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS pipeline_status text NOT NULL DEFAULT 'draft'
  CHECK (pipeline_status IN (
    'draft',
    'draft_failed_validation',
    'draft_review',
    'needs_revision',
    'approved_for_calibration',
    'calibrating',
    'passed',
    'flagged',
    'passed_reserve',
    'queued',
    'active',
    'quarantined',
    'retired',
    'archived'
  ));

-- Index for pipeline queue queries
CREATE INDEX IF NOT EXISTS idx_challenges_pipeline_status
  ON challenges(pipeline_status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. challenge_bundles table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenge_bundles (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id               text UNIQUE NOT NULL,
  challenge_id            uuid REFERENCES challenges(id) ON DELETE SET NULL,
  gauntlet_version        text NOT NULL,
  generation_timestamp    timestamptz NOT NULL,
  family                  text NOT NULL,
  weight_class            text NOT NULL,
  format                  text NOT NULL,
  title                   text NOT NULL,
  public_description      text NOT NULL,
  internal_brief          text NOT NULL,
  prompt                  text NOT NULL,
  starter_state           jsonb,
  visible_tests           jsonb NOT NULL DEFAULT '[]',
  hidden_tests            jsonb NOT NULL DEFAULT '[]',
  adversarial_tests       jsonb NOT NULL DEFAULT '[]',
  judge_weights           jsonb NOT NULL,
  scoring_rubric          jsonb NOT NULL,
  evidence_map            jsonb NOT NULL,
  failure_mode_targets    jsonb NOT NULL DEFAULT '[]',
  difficulty_profile      jsonb NOT NULL,
  calibration_expectations jsonb NOT NULL,
  contamination_notes     text,
  freshness_score         numeric,
  parent_bundle_id        text,
  mutation_generation     integer NOT NULL DEFAULT 0,
  mutation_type           text,
  lineage                 jsonb,
  publish_recommendation  text NOT NULL DEFAULT 'hold',
  asset_references        jsonb DEFAULT '[]',
  content_hash            text NOT NULL,
  validation_status       text NOT NULL DEFAULT 'pending'
    CHECK (validation_status IN ('pending', 'passed', 'failed')),
  validation_results      jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenge_bundles_challenge_id
  ON challenge_bundles(challenge_id);

CREATE INDEX IF NOT EXISTS idx_challenge_bundles_content_hash
  ON challenge_bundles(content_hash);

CREATE INDEX IF NOT EXISTS idx_challenge_bundles_validation_status
  ON challenge_bundles(validation_status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. challenge_forge_reviews table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenge_forge_reviews (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id                uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  bundle_id                   text REFERENCES challenge_bundles(bundle_id) ON DELETE SET NULL,
  reviewer                    text NOT NULL DEFAULT 'forge',
  verdict                     text NOT NULL
    CHECK (verdict IN ('approved_for_calibration', 'needs_revision')),
  objective_test_completeness text,
  fairness_assessment         text,
  solvability_verdict         text,
  exploit_surface_notes       text,
  hidden_test_quality         text,
  technical_credibility       text,
  blocking_issues             jsonb DEFAULT '[]',
  warnings                    jsonb DEFAULT '[]',
  positives                   jsonb DEFAULT '[]',
  revision_required           text,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forge_reviews_challenge_id
  ON challenge_forge_reviews(challenge_id);

CREATE INDEX IF NOT EXISTS idx_forge_reviews_verdict
  ON challenge_forge_reviews(verdict);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. challenge_inventory_decisions table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenge_inventory_decisions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id        uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  decision            text NOT NULL
    CHECK (decision IN (
      'publish_now',
      'hold_reserve',
      'queue_for_later',
      'mutate_before_release',
      'quarantine',
      'reject'
    )),
  decided_by          text NOT NULL DEFAULT 'operator',
  reason              text,
  active_pool_size    integer,
  reserve_pool_size   integer,
  family_active_count integer,
  scheduled_publish_at timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_decisions_challenge_id
  ON challenge_inventory_decisions(challenge_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. DB Function: transition_pipeline_status
-- Validates legal transitions and updates pipeline_status
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION transition_pipeline_status(
  p_challenge_id uuid,
  p_new_status   text,
  p_reason       text DEFAULT NULL,
  p_actor        text DEFAULT 'system'
)
RETURNS jsonb AS $$
DECLARE
  v_old_status text;
  v_allowed    boolean := false;
BEGIN
  SELECT pipeline_status INTO v_old_status
  FROM challenges
  WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'challenge not found');
  END IF;

  -- Validate legal transitions
  v_allowed := CASE v_old_status
    WHEN 'draft' THEN p_new_status IN ('draft_review', 'draft_failed_validation', 'archived')
    WHEN 'draft_failed_validation' THEN p_new_status IN ('draft', 'archived')
    WHEN 'draft_review' THEN p_new_status IN ('approved_for_calibration', 'needs_revision', 'archived')
    WHEN 'needs_revision' THEN p_new_status IN ('draft_review', 'archived')
    WHEN 'approved_for_calibration' THEN p_new_status IN ('calibrating', 'archived')
    WHEN 'calibrating' THEN p_new_status IN ('passed', 'flagged', 'archived')
    WHEN 'passed' THEN p_new_status IN ('active', 'passed_reserve', 'queued', 'needs_revision', 'archived')
    WHEN 'flagged' THEN p_new_status IN ('active', 'passed_reserve', 'queued', 'needs_revision', 'archived')
    WHEN 'passed_reserve' THEN p_new_status IN ('active', 'queued', 'archived')
    WHEN 'queued' THEN p_new_status IN ('active', 'archived')
    WHEN 'active' THEN p_new_status IN ('quarantined', 'retired', 'archived')
    WHEN 'quarantined' THEN p_new_status IN ('active', 'archived')
    WHEN 'retired' THEN p_new_status IN ('archived')
    WHEN 'archived' THEN false
    ELSE false
  END;

  IF NOT v_allowed THEN
    RETURN jsonb_build_object(
      'error', format('Illegal transition: %s → %s', v_old_status, p_new_status)
    );
  END IF;

  UPDATE challenges SET
    pipeline_status = p_new_status,
    updated_at      = now()
  WHERE id = p_challenge_id;

  -- Log to challenge_admin_actions
  INSERT INTO challenge_admin_actions (
    challenge_id, action, previous_status, new_status, reason, actor, created_at
  ) VALUES (
    p_challenge_id,
    'pipeline_transition',
    v_old_status,
    p_new_status,
    p_reason,
    p_actor,
    now()
  );

  RETURN jsonb_build_object(
    'ok',           true,
    'challenge_id', p_challenge_id,
    'old_status',   v_old_status,
    'new_status',   p_new_status,
    'actor',        p_actor
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. DB Function: get_forge_review_queue
-- Returns challenges awaiting Forge review
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_forge_review_queue(p_limit integer DEFAULT 20)
RETURNS TABLE (
  challenge_id    uuid,
  title           text,
  pipeline_status text,
  category        text,
  challenge_type  text,
  generated_by    text,
  created_at      timestamptz,
  bundle_id       text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.pipeline_status,
    c.category,
    c.challenge_type,
    c.generated_by,
    c.created_at,
    cb.bundle_id
  FROM challenges c
  LEFT JOIN challenge_bundles cb ON cb.challenge_id = c.id
  WHERE c.pipeline_status = 'draft_review'
  ORDER BY c.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. DB Function: get_inventory_queue
-- Returns challenges ready for inventory decision
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_inventory_queue()
RETURNS TABLE (
  challenge_id         uuid,
  title                text,
  pipeline_status      text,
  calibration_verdict  text,
  calibration_reason   text,
  challenge_type       text,
  category             text,
  created_at           timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.pipeline_status,
    c.calibration_verdict,
    c.calibration_reason,
    c.challenge_type,
    c.category,
    c.created_at
  FROM challenges c
  WHERE c.pipeline_status IN ('passed', 'flagged')
  ORDER BY c.calibration_completed_at ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. can_activate_challenge helper (safe wrapper around family cap)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION can_activate_challenge(p_challenge_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_challenge challenges%ROWTYPE;
  v_family_active integer := 0;
  v_total_active  integer := 0;
BEGIN
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('can_activate', false, 'reason', 'challenge not found');
  END IF;

  SELECT COUNT(*) INTO v_total_active FROM challenges WHERE status = 'active';

  IF v_challenge.challenge_type IS NOT NULL THEN
    SELECT COUNT(*) INTO v_family_active
    FROM challenges
    WHERE challenge_type = v_challenge.challenge_type
      AND status = 'active'
      AND id != p_challenge_id;
  END IF;

  IF v_family_active >= 2 THEN
    RETURN jsonb_build_object(
      'can_activate', false,
      'reason', format('Family cap reached: %s active challenges of type %s', v_family_active, v_challenge.challenge_type),
      'family_active_count', v_family_active,
      'total_active', v_total_active
    );
  END IF;

  RETURN jsonb_build_object(
    'can_activate', true,
    'family_active_count', v_family_active,
    'total_active', v_total_active
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. updated_at trigger for challenge_bundles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_challenge_bundles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_challenge_bundles_updated_at ON challenge_bundles;
CREATE TRIGGER trg_challenge_bundles_updated_at
  BEFORE UPDATE ON challenge_bundles
  FOR EACH ROW
  EXECUTE FUNCTION update_challenge_bundles_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. RLS Policies
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE challenge_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_forge_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_inventory_decisions ENABLE ROW LEVEL SECURITY;

-- Only service role (admin) can access these tables
CREATE POLICY "service_role_all_bundles" ON challenge_bundles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_forge_reviews" ON challenge_forge_reviews
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_inventory_decisions" ON challenge_inventory_decisions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
