-- ============================================================
-- Migration 00025: Ballot Learning System
-- Calibration learning artifacts + lesson deduplication tables
-- ============================================================

-- Table: calibration_learning_artifacts
CREATE TABLE calibration_learning_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  bundle_id text REFERENCES challenge_bundles(bundle_id) ON DELETE SET NULL,

  -- Challenge context (snapshot at calibration time)
  family text NOT NULL,
  format text NOT NULL,
  weight_class text NOT NULL,

  -- Operational verdict (from calibration)
  verdict text NOT NULL, -- 'pass' | 'borderline' | 'fail'
  cdi_score numeric,
  same_model_clustering_risk text, -- 'low' | 'medium' | 'high'
  borderline_triggers jsonb DEFAULT '[]',
  separation_score numeric,
  tier_spread numeric,

  -- Learning content (structured, not raw logs)
  what_worked jsonb DEFAULT '[]',
  what_failed jsonb DEFAULT '[]',
  what_improved_discrimination jsonb DEFAULT '[]',
  what_caused_compression jsonb DEFAULT '[]',
  what_improved_same_model_spread jsonb DEFAULT '[]',
  what_reduced_same_model_spread jsonb DEFAULT '[]',
  what_triggered_audit jsonb DEFAULT '[]',
  mutation_lessons jsonb DEFAULT '[]',       -- {type, helped: bool, reason}
  contamination_patterns jsonb DEFAULT '[]',
  human_reviewer_fixes jsonb DEFAULT '[]',   -- from forge review record

  -- Distilled lessons
  key_lesson text,
  key_anti_lesson text,
  recommended_future_action text,

  -- Ballot processing
  ballot_status text NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'ingested' | 'error'
  ballot_ingested_at timestamptz,
  ballot_error text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_learning_artifacts_challenge ON calibration_learning_artifacts(challenge_id);
CREATE INDEX idx_learning_artifacts_ballot_status ON calibration_learning_artifacts(ballot_status) WHERE ballot_status = 'pending';
CREATE INDEX idx_learning_artifacts_family ON calibration_learning_artifacts(family);

-- Table: ballot_lesson_entries
CREATE TABLE ballot_lesson_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL REFERENCES calibration_learning_artifacts(id) ON DELETE CASCADE,

  category text NOT NULL, -- 'positive' | 'negative' | 'mutation' | 'family_health' | 'calibration_system'
  family text,            -- null = cross-family lesson
  subcategory text,       -- e.g. 'discrimination', 'compression', 'audit_trigger'

  lesson text NOT NULL,
  confidence text NOT NULL DEFAULT 'low', -- 'low' | 'medium' | 'high'
  observation_count integer NOT NULL DEFAULT 1,

  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),

  -- For deduplication/merging
  lesson_hash text NOT NULL, -- SHA-256 of normalized lesson text

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_lesson_entries_hash ON ballot_lesson_entries(lesson_hash);
CREATE INDEX idx_lesson_entries_category ON ballot_lesson_entries(category);
CREATE INDEX idx_lesson_entries_family ON ballot_lesson_entries(family) WHERE family IS NOT NULL;

-- ============================================================
-- Function: generate_learning_artifact
-- Called after calibration verdict is stored.
-- ============================================================
CREATE OR REPLACE FUNCTION generate_learning_artifact(p_challenge_id uuid)
RETURNS uuid AS $$
DECLARE
  v_challenge challenges%ROWTYPE;
  v_artifact_id uuid;
  v_forge_fixes jsonb := '[]';
  v_what_worked jsonb := '[]';
  v_what_failed jsonb := '[]';
  v_key_lesson text;
  v_key_anti text;
  v_recommended_action text;
BEGIN
  SELECT * INTO v_challenge FROM challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Don't generate duplicate artifacts
  SELECT id INTO v_artifact_id FROM calibration_learning_artifacts WHERE challenge_id = p_challenge_id LIMIT 1;
  IF FOUND THEN RETURN v_artifact_id; END IF;

  -- Gather forge review fixes if any
  SELECT jsonb_agg(blocking_issues) INTO v_forge_fixes
  FROM challenge_forge_reviews
  WHERE challenge_id = p_challenge_id
    AND verdict = 'needs_revision';

  -- Build what_worked / what_failed based on calibration verdict
  IF v_challenge.calibration_verdict = 'pass' THEN
    v_what_worked := '["Passed calibration gate", "CDI above threshold"]';
    v_key_lesson := 'Challenge design produced adequate tier separation';
    v_recommended_action := 'proceed_to_inventory';
  ELSIF v_challenge.calibration_verdict = 'borderline' THEN
    v_what_failed := '["Borderline CDI — insufficient tier spread"]';
    v_key_lesson := 'Challenge design needs refinement for better discrimination';
    v_key_anti := 'Do not publish borderline challenges without mutation';
    v_recommended_action := 'mutate_before_release';
  ELSE
    v_what_failed := '["Failed calibration — CDI below minimum"]';
    v_key_lesson := 'Challenge design failed to produce meaningful tier separation';
    v_key_anti := 'Avoid same pattern in future generations';
    v_recommended_action := 'archive_and_analyze';
  END IF;

  INSERT INTO calibration_learning_artifacts (
    challenge_id,
    bundle_id,
    family,
    format,
    weight_class,
    verdict,
    cdi_score,
    separation_score,
    tier_spread,
    what_worked,
    what_failed,
    human_reviewer_fixes,
    key_lesson,
    key_anti_lesson,
    recommended_future_action,
    ballot_status
  )
  SELECT
    v_challenge.id,
    cb.bundle_id,
    COALESCE(v_challenge.challenge_type, 'unknown'),
    COALESCE(v_challenge.format, 'unknown'),
    COALESCE(wc.name, 'unknown'),
    COALESCE(v_challenge.calibration_verdict, 'unknown'),
    v_challenge.cdi_score,
    v_challenge.score_mean,
    v_challenge.score_stddev,
    v_what_worked,
    v_what_failed,
    COALESCE(v_forge_fixes, '[]'),
    v_key_lesson,
    v_key_anti,
    v_recommended_action,
    'pending'
  FROM challenges c
  LEFT JOIN challenge_bundles cb ON cb.challenge_id = c.id
  LEFT JOIN weight_classes wc ON wc.id = c.weight_class_id
  WHERE c.id = p_challenge_id
  RETURNING id INTO v_artifact_id;

  RETURN v_artifact_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if not already present (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_learning_artifacts_updated_at'
  ) THEN
    CREATE TRIGGER trg_learning_artifacts_updated_at
      BEFORE UPDATE ON calibration_learning_artifacts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_lesson_entries_updated_at'
  ) THEN
    CREATE TRIGGER trg_lesson_entries_updated_at
      BEFORE UPDATE ON ballot_lesson_entries
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE calibration_learning_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballot_lesson_entries ENABLE ROW LEVEL SECURITY;

-- Only service role / admin can read/write
CREATE POLICY "service_role_all_artifacts" ON calibration_learning_artifacts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_lessons" ON ballot_lesson_entries
  FOR ALL TO service_role USING (true) WITH CHECK (true);
