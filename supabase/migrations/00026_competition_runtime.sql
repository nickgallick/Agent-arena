-- ============================================================
-- Migration 00026: Competition Runtime — Phase 1
-- Async judging queue, sessions, artifacts, events, judge runs,
-- lane scores, artifacts, execution logs, match results, breakdowns,
-- audit trigger rules
-- ============================================================

-- Ensure set_updated_at function exists
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Table: judging_jobs (async queue)
-- ============================================================
CREATE TABLE judging_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','claimed','running','completed','failed','dead_letter')),
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 2,

  current_stage text,
  claimed_at timestamptz,
  claimed_by text,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  error_stage text,

  version_snapshot jsonb NOT NULL DEFAULT '{}',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_judging_jobs_submission_active
  ON judging_jobs(submission_id)
  WHERE status IN ('pending','claimed','running');

CREATE INDEX idx_judging_jobs_status ON judging_jobs(status) WHERE status IN ('pending','claimed','running');
CREATE INDEX idx_judging_jobs_claimed_at ON judging_jobs(claimed_at) WHERE status = 'claimed';

-- ============================================================
-- Table: challenge_sessions
-- ============================================================
CREATE TABLE challenge_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  entry_id uuid REFERENCES challenge_entries(id) ON DELETE SET NULL,

  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','submitted','judging','completed','expired','cancelled')),

  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  expires_at timestamptz,
  submission_deadline_at timestamptz,

  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 1,
  format_type text,
  time_limit_seconds integer,

  version_snapshot jsonb NOT NULL DEFAULT '{}',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_sessions_agent_challenge ON challenge_sessions(challenge_id, agent_id) WHERE status NOT IN ('cancelled','expired');
CREATE INDEX idx_sessions_challenge ON challenge_sessions(challenge_id);
CREATE INDEX idx_sessions_agent ON challenge_sessions(agent_id);
CREATE INDEX idx_sessions_status ON challenge_sessions(status) WHERE status = 'open';

-- ============================================================
-- Table: submission_artifacts (immutable)
-- ============================================================
CREATE TABLE submission_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,

  artifact_type text NOT NULL DEFAULT 'solution',
  content text NOT NULL,
  content_hash text NOT NULL,
  content_size_bytes integer,

  version_snapshot jsonb NOT NULL DEFAULT '{}',

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_artifacts_submission_hash ON submission_artifacts(submission_id, content_hash);
CREATE INDEX idx_artifacts_content_hash ON submission_artifacts(content_hash);

-- ============================================================
-- Table: submission_events (append-only)
-- ============================================================
CREATE TABLE submission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,

  event_type text NOT NULL,
  stage text,
  metadata jsonb DEFAULT '{}',
  error text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_submission_events_submission ON submission_events(submission_id);
CREATE INDEX idx_submission_events_type ON submission_events(event_type);

-- ============================================================
-- Table: judge_runs
-- ============================================================
CREATE TABLE judge_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  judging_job_id uuid REFERENCES judging_jobs(id) ON DELETE SET NULL,

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','lanes_complete','audit_check','aggregating','finalized','failed','dead_letter')),

  current_stage text,

  objective_complete boolean NOT NULL DEFAULT false,
  process_complete boolean NOT NULL DEFAULT false,
  strategy_complete boolean NOT NULL DEFAULT false,
  integrity_complete boolean NOT NULL DEFAULT false,
  audit_triggered boolean NOT NULL DEFAULT false,
  audit_complete boolean NOT NULL DEFAULT false,

  version_snapshot jsonb NOT NULL DEFAULT '{}',

  started_at timestamptz,
  completed_at timestamptz,
  error_message text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_judge_runs_submission ON judge_runs(submission_id) WHERE status NOT IN ('failed','dead_letter');
CREATE INDEX idx_judge_runs_status ON judge_runs(status);

-- ============================================================
-- Table: judge_lane_scores
-- ============================================================
CREATE TABLE judge_lane_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_run_id uuid NOT NULL REFERENCES judge_runs(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,

  lane text NOT NULL CHECK (lane IN ('objective','process','strategy','integrity','audit')),

  raw_score numeric NOT NULL,
  weighted_contribution numeric,
  weight_applied numeric,
  confidence text CHECK (confidence IN ('low','medium','high')),

  evidence_package_hash text,

  model_used text,
  model_family text,
  prompt_version_id text,
  latency_ms integer,

  rationale_summary text,
  flags jsonb DEFAULT '[]',

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_lane_scores_run_lane ON judge_lane_scores(judge_run_id, lane);
CREATE INDEX idx_lane_scores_submission ON judge_lane_scores(submission_id);

-- ============================================================
-- Table: judge_lane_artifacts
-- ============================================================
CREATE TABLE judge_lane_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_run_id uuid NOT NULL REFERENCES judge_runs(id) ON DELETE CASCADE,

  lane text NOT NULL CHECK (lane IN ('objective','process','strategy','integrity','audit')),
  artifact_type text NOT NULL DEFAULT 'evidence_package',

  content jsonb NOT NULL,
  content_hash text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_lane_artifacts_run_lane_type ON judge_lane_artifacts(judge_run_id, lane, artifact_type);

-- ============================================================
-- Table: judge_execution_logs
-- ============================================================
CREATE TABLE judge_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_run_id uuid NOT NULL REFERENCES judge_runs(id) ON DELETE CASCADE,
  judging_job_id uuid REFERENCES judging_jobs(id) ON DELETE SET NULL,

  stage text NOT NULL,
  event text NOT NULL,

  lane text,
  model_used text,
  attempt_number integer DEFAULT 1,
  duration_ms integer,
  error text,
  metadata jsonb DEFAULT '{}',

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_exec_logs_run ON judge_execution_logs(judge_run_id);
CREATE INDEX idx_exec_logs_stage ON judge_execution_logs(stage, event);

-- ============================================================
-- Table: match_results (IMMUTABLE)
-- ============================================================
CREATE TABLE match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  judge_run_id uuid NOT NULL REFERENCES judge_runs(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  final_score numeric NOT NULL,
  pre_audit_score numeric,
  post_audit_score numeric,

  result_state text NOT NULL DEFAULT 'clean'
    CHECK (result_state IN ('clean','audited','flagged','disputed','failed','invalidated','exploit_penalized')),
  confidence_level text CHECK (confidence_level IN ('low','medium','high')),

  audit_triggered boolean NOT NULL DEFAULT false,
  audit_reason text,
  dispute_delta numeric,

  version_snapshot jsonb NOT NULL DEFAULT '{}',

  percentile numeric,
  rank_at_finalization integer,

  finalized_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_match_results_submission ON match_results(submission_id);
CREATE INDEX idx_match_results_challenge ON match_results(challenge_id);
CREATE INDEX idx_match_results_agent ON match_results(agent_id);

-- ============================================================
-- Table: match_result_overrides
-- ============================================================
CREATE TABLE match_result_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_result_id uuid NOT NULL REFERENCES match_results(id) ON DELETE CASCADE,

  override_reason text NOT NULL,
  override_by text NOT NULL,

  original_score numeric NOT NULL,
  original_state text NOT NULL,
  new_score numeric NOT NULL,
  new_state text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Table: match_lane_scores
-- ============================================================
CREATE TABLE match_lane_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_result_id uuid NOT NULL REFERENCES match_results(id) ON DELETE CASCADE,

  lane text NOT NULL CHECK (lane IN ('objective','process','strategy','integrity','audit')),
  raw_score numeric NOT NULL,
  weighted_contribution numeric NOT NULL,
  weight_applied numeric NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_match_lane_scores_result_lane ON match_lane_scores(match_result_id, lane);

-- ============================================================
-- Table: match_breakdowns
-- ============================================================
CREATE TABLE match_breakdowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_result_id uuid NOT NULL REFERENCES match_results(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,

  audience text NOT NULL CHECK (audience IN ('competitor','spectator','admin')),
  version integer NOT NULL DEFAULT 1,

  content jsonb NOT NULL,
  content_hash text NOT NULL,

  leakage_audit_passed boolean NOT NULL DEFAULT false,
  leakage_warnings jsonb DEFAULT '[]',

  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_breakdowns_result_audience_version ON match_breakdowns(match_result_id, audience, version);
CREATE INDEX idx_breakdowns_submission ON match_breakdowns(submission_id);

-- ============================================================
-- Table: audit_trigger_rules
-- ============================================================
CREATE TABLE audit_trigger_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  rule_name text NOT NULL UNIQUE,
  rule_type text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,

  params jsonb NOT NULL DEFAULT '{}',
  applies_to_formats jsonb DEFAULT '[]',
  priority integer NOT NULL DEFAULT 100,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO audit_trigger_rules (rule_name, rule_type, params, priority) VALUES
  ('process_strategy_divergence', 'divergence_threshold', '{"lanes": ["process","strategy"], "threshold": 15}', 10),
  ('divergence_weak_objective', 'divergence_threshold', '{"lanes": ["process","strategy"], "threshold": 12, "requires_objective_below": 60}', 20),
  ('high_score_integrity_anomaly', 'score_anomaly', '{"min_final_score": 85, "max_integrity_score": 30}', 30),
  ('prize_challenge_override', 'prize_override', '{"min_prize_pool_cents": 5000}', 5);

-- ============================================================
-- Schema additions to existing tables
-- ============================================================

-- submissions
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS artifact_hash text,
  ADD COLUMN IF NOT EXISTS submission_status text NOT NULL DEFAULT 'received'
    CHECK (submission_status IN ('received','validated','queued','judging','completed','failed','rejected')),
  ADD COLUMN IF NOT EXISTS judge_run_id uuid REFERENCES judge_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES challenge_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- challenge_entries
ALTER TABLE challenge_entries
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES challenge_sessions(id) ON DELETE SET NULL;

-- challenges
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS judging_config jsonb,
  ADD COLUMN IF NOT EXISTS content_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS content_hash text;

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON judging_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON challenge_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON judge_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON audit_trigger_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Concurrency-safe claim function
-- ============================================================
CREATE OR REPLACE FUNCTION claim_judging_job(p_worker_id text DEFAULT 'worker-1')
RETURNS TABLE (
  job_id uuid,
  submission_id uuid,
  challenge_id uuid,
  agent_id uuid,
  attempt_count integer,
  version_snapshot jsonb
) AS $$
DECLARE
  v_job judging_jobs%ROWTYPE;
BEGIN
  -- Try to claim a pending job first
  SELECT * INTO v_job
  FROM judging_jobs
  WHERE status = 'pending'
    AND attempt_count < max_attempts
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- If no pending, try recovering stale claimed jobs (> 5 min with no progress)
  IF NOT FOUND OR v_job.id IS NULL THEN
    SELECT * INTO v_job
    FROM judging_jobs
    WHERE status = 'claimed'
      AND claimed_at < now() - interval '5 minutes'
      AND attempt_count < max_attempts
    ORDER BY claimed_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
  END IF;

  IF NOT FOUND OR v_job.id IS NULL THEN
    RETURN;
  END IF;

  UPDATE judging_jobs SET
    status = 'claimed',
    claimed_at = now(),
    claimed_by = p_worker_id,
    attempt_count = attempt_count + 1,
    updated_at = now()
  WHERE id = v_job.id;

  RETURN QUERY SELECT
    v_job.id,
    v_job.submission_id,
    v_job.challenge_id,
    v_job.agent_id,
    v_job.attempt_count + 1,
    v_job.version_snapshot;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Enqueue function
-- ============================================================
CREATE OR REPLACE FUNCTION enqueue_judging_job(
  p_submission_id uuid,
  p_challenge_id uuid,
  p_agent_id uuid,
  p_version_snapshot jsonb DEFAULT '{}'
) RETURNS uuid AS $$
DECLARE
  v_job_id uuid;
BEGIN
  SELECT id INTO v_job_id FROM judging_jobs
  WHERE submission_id = p_submission_id
  LIMIT 1;

  IF FOUND THEN
    RETURN v_job_id;
  END IF;

  INSERT INTO judging_jobs (submission_id, challenge_id, agent_id, version_snapshot)
  VALUES (p_submission_id, p_challenge_id, p_agent_id, p_version_snapshot)
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
