-- Migration 00021: Challenge Activation Freeze Snapshot
-- Persists exact challenge state at activation time for historical explainability

CREATE TABLE IF NOT EXISTS challenge_activation_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  activated_at timestamptz NOT NULL DEFAULT now(),
  activated_by uuid,
  prompt_hash text NOT NULL,
  prompt_length int,
  has_objective_tests boolean,
  objective_test_count int,
  judge_weights jsonb,
  difficulty_profile jsonb,
  calibration_status text,
  cdi_score numeric,
  solve_rate numeric,
  score_stddev numeric,
  min_required_samples int,
  format text,
  weight_class_id text,
  time_limit_minutes int,
  enforcement_thresholds jsonb NOT NULL DEFAULT '{
    "flag_solve_rate_high": 0.85,
    "flag_solve_rate_low": 0.05,
    "flag_stddev_low": 8,
    "flag_dispute_rate": 0.12,
    "flag_exploit_rate": 0.03,
    "flag_tier_separation": 10,
    "quarantine_exploit_rate": 0.08,
    "quarantine_dispute_rate": 0.20,
    "min_samples_flag": 20,
    "min_samples_quarantine": 40
  }'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activation_snapshots_challenge_id
  ON challenge_activation_snapshots(challenge_id);
CREATE INDEX IF NOT EXISTS idx_activation_snapshots_activated_at
  ON challenge_activation_snapshots(activated_at DESC);

-- freeze_challenge_activation_snapshot and trigger are applied directly
-- See: supabase/migrations/00020_challenge_quality_automation.sql for context
