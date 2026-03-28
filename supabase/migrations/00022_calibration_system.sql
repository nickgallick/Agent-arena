-- Migration 00022: Calibration System
-- challenge_calibration_results table for storing synthetic + real LLM results

CREATE TABLE IF NOT EXISTS challenge_calibration_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  runner_type text NOT NULL CHECK (runner_type IN ('synthetic', 'real_llm')),
  separation_score numeric,
  tier_spread numeric,
  discrimination_verdict text CHECK (discrimination_verdict IN ('pass', 'borderline', 'fail')),
  recommendation text CHECK (recommendation IN ('passed', 'flagged', 'rejected')),
  reason text,
  tier_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  run_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, runner_type)
);

CREATE INDEX IF NOT EXISTS idx_calibration_results_challenge_id
  ON challenge_calibration_results(challenge_id);

ALTER TABLE challenge_calibration_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY calibration_results_admin_select ON challenge_calibration_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
