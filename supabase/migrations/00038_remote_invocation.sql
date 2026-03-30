-- Migration 00038: Remote Agent Invocation (RAI)
-- Adds endpoint registration, secret vault, nonce table, invocation log
-- Date: 2026-03-30

-- ── 1. Extend agents table with RAI endpoint config ──
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS remote_endpoint_url text,
  ADD COLUMN IF NOT EXISTS remote_endpoint_secret_hash text,
  ADD COLUMN IF NOT EXISTS remote_endpoint_timeout_ms integer DEFAULT 30000,
  ADD COLUMN IF NOT EXISTS remote_endpoint_max_retries integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS remote_endpoint_last_ping_at timestamptz,
  ADD COLUMN IF NOT EXISTS remote_endpoint_last_ping_status text,
  ADD COLUMN IF NOT EXISTS remote_endpoint_configured_at timestamptz,
  ADD COLUMN IF NOT EXISTS sandbox_endpoint_url text,
  ADD COLUMN IF NOT EXISTS sandbox_endpoint_secret_hash text,
  ADD COLUMN IF NOT EXISTS sandbox_endpoint_last_ping_at timestamptz,
  ADD COLUMN IF NOT EXISTS sandbox_endpoint_last_ping_status text;

-- ── 2. Agent RAI secrets vault (service-role only access) ──
CREATE TABLE IF NOT EXISTS agent_rai_secrets (
  agent_id uuid PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
  production_secret text NOT NULL,
  sandbox_secret text,
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz
);

ALTER TABLE agent_rai_secrets ENABLE ROW LEVEL SECURITY;

-- Block ALL JWT-based access — only service_role (used server-side) can read/write
CREATE POLICY "service_role_only_rai_secrets"
  ON agent_rai_secrets
  USING (false);

-- ── 3. Nonce store for replay protection ──
CREATE TABLE IF NOT EXISTS rai_invocation_nonces (
  nonce text PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rai_nonces_used_at ON rai_invocation_nonces(used_at);
CREATE INDEX IF NOT EXISTS idx_rai_nonces_agent_id ON rai_invocation_nonces(agent_id);

-- ── 4. RAI invocation log (immutable provenance record) ──
CREATE TABLE IF NOT EXISTS rai_invocation_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id uuid REFERENCES submissions(id) ON DELETE SET NULL,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL,
  entry_id uuid NOT NULL,
  invocation_id text NOT NULL UNIQUE,
  endpoint_url text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('production', 'sandbox')),
  request_sent_at timestamptz NOT NULL,
  response_received_at timestamptz,
  response_status_code integer,
  response_latency_ms integer,
  response_content_hash text,
  execution_metadata jsonb,
  attempt_number integer NOT NULL DEFAULT 1,
  outcome text NOT NULL CHECK (outcome IN ('success', 'timeout', 'error', 'invalid_response', 'content_too_large')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rai_log_agent_id ON rai_invocation_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_rai_log_submission_id ON rai_invocation_log(submission_id);
CREATE INDEX IF NOT EXISTS idx_rai_log_entry_id ON rai_invocation_log(entry_id);
CREATE INDEX IF NOT EXISTS idx_rai_log_created_at ON rai_invocation_log(created_at);

ALTER TABLE rai_invocation_log ENABLE ROW LEVEL SECURITY;

-- Agents can read their own invocation logs
CREATE POLICY "agents_can_read_own_rai_logs"
  ON rai_invocation_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents a WHERE a.id = agent_id AND a.user_id = auth.uid()
    )
  );

-- ── 5. Extend submission_source check constraint ──
ALTER TABLE submissions
  DROP CONSTRAINT IF EXISTS submissions_submission_source_check;

ALTER TABLE submissions
  ADD CONSTRAINT submissions_submission_source_check
  CHECK (submission_source IN (
    'web', 'remote_invocation', 'connector', 'api',
    'sdk', 'github_action', 'mcp', 'internal'
  ));

-- ── 6. Add remote_invocation_supported to challenges ──
-- P0 FIX: default false — explicit admin opt-in per challenge required
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS remote_invocation_supported boolean NOT NULL DEFAULT false;

-- ── 7. Nonce cleanup function (called by cron) ──
CREATE OR REPLACE FUNCTION cleanup_expired_rai_nonces()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rai_invocation_nonces
  WHERE used_at < now() - interval '10 minutes';
END;
$$;
