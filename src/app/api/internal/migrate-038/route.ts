/**
 * One-shot migration runner for RAI schema (00038).
 * Uses supabase-js rpc to execute SQL statements.
 * DELETE THIS FILE after running.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const GAUNTLET_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!GAUNTLET_KEY || authHeader !== `Bearer ${GAUNTLET_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceKey)

  async function runSql(name: string, sql: string): Promise<string> {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: sql.trim() })
      if (error) return `fail: ${error.message.slice(0, 200)}`
      return 'ok'
    } catch (e) {
      return `error: ${(e as Error).message.slice(0, 100)}`
    }
  }

  const statements: Array<[string, string]> = [
    ['agents_remote_endpoint_url', 'ALTER TABLE agents ADD COLUMN IF NOT EXISTS remote_endpoint_url text'],
    ['agents_remote_endpoint_secret_hash', 'ALTER TABLE agents ADD COLUMN IF NOT EXISTS remote_endpoint_secret_hash text'],
    ['agents_remote_endpoint_timeout_ms', 'ALTER TABLE agents ADD COLUMN IF NOT EXISTS remote_endpoint_timeout_ms integer DEFAULT 30000'],
    ['agents_remote_endpoint_max_retries', 'ALTER TABLE agents ADD COLUMN IF NOT EXISTS remote_endpoint_max_retries integer DEFAULT 1'],
    ['agents_remote_endpoint_last_ping_at', 'ALTER TABLE agents ADD COLUMN IF NOT EXISTS remote_endpoint_last_ping_at timestamptz'],
    ['agents_remote_endpoint_last_ping_status', 'ALTER TABLE agents ADD COLUMN IF NOT EXISTS remote_endpoint_last_ping_status text'],
    ['agents_remote_endpoint_configured_at', 'ALTER TABLE agents ADD COLUMN IF NOT EXISTS remote_endpoint_configured_at timestamptz'],
    ['agents_sandbox_endpoint_url', 'ALTER TABLE agents ADD COLUMN IF NOT EXISTS sandbox_endpoint_url text'],
    ['agents_sandbox_endpoint_secret_hash', 'ALTER TABLE agents ADD COLUMN IF NOT EXISTS sandbox_endpoint_secret_hash text'],
    ['agents_sandbox_endpoint_last_ping_at', 'ALTER TABLE agents ADD COLUMN IF NOT EXISTS sandbox_endpoint_last_ping_at timestamptz'],
    ['agents_sandbox_endpoint_last_ping_status', 'ALTER TABLE agents ADD COLUMN IF NOT EXISTS sandbox_endpoint_last_ping_status text'],
    ['rai_secrets_table', `CREATE TABLE IF NOT EXISTS agent_rai_secrets (agent_id uuid PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE, production_secret text NOT NULL, sandbox_secret text, created_at timestamptz NOT NULL DEFAULT now(), rotated_at timestamptz)`],
    ['rai_secrets_rls', `ALTER TABLE agent_rai_secrets ENABLE ROW LEVEL SECURITY`],
    ['rai_secrets_policy', `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agent_rai_secrets' AND policyname='service_role_only_rai_secrets') THEN CREATE POLICY "service_role_only_rai_secrets" ON agent_rai_secrets USING (false); END IF; END $$`],
    ['rai_nonces_table', `CREATE TABLE IF NOT EXISTS rai_invocation_nonces (nonce text PRIMARY KEY, agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE, used_at timestamptz NOT NULL DEFAULT now())`],
    ['rai_nonces_idx_used_at', `CREATE INDEX IF NOT EXISTS idx_rai_nonces_used_at ON rai_invocation_nonces(used_at)`],
    ['rai_nonces_idx_agent', `CREATE INDEX IF NOT EXISTS idx_rai_nonces_agent_id ON rai_invocation_nonces(agent_id)`],
    ['rai_log_table', `CREATE TABLE IF NOT EXISTS rai_invocation_log (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), submission_id uuid REFERENCES submissions(id) ON DELETE SET NULL, agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE, challenge_id uuid NOT NULL, entry_id uuid NOT NULL, invocation_id text NOT NULL UNIQUE, endpoint_url text NOT NULL, environment text NOT NULL CHECK (environment IN ('production','sandbox')), request_sent_at timestamptz NOT NULL, response_received_at timestamptz, response_status_code integer, response_latency_ms integer, response_content_hash text, execution_metadata jsonb, attempt_number integer NOT NULL DEFAULT 1, outcome text NOT NULL CHECK (outcome IN ('success','timeout','error','invalid_response','content_too_large')), error_message text, created_at timestamptz NOT NULL DEFAULT now())`],
    ['rai_log_idx_agent', `CREATE INDEX IF NOT EXISTS idx_rai_log_agent_id ON rai_invocation_log(agent_id)`],
    ['rai_log_idx_submission', `CREATE INDEX IF NOT EXISTS idx_rai_log_submission_id ON rai_invocation_log(submission_id)`],
    ['rai_log_idx_entry', `CREATE INDEX IF NOT EXISTS idx_rai_log_entry_id ON rai_invocation_log(entry_id)`],
    ['rai_log_idx_created', `CREATE INDEX IF NOT EXISTS idx_rai_log_created_at ON rai_invocation_log(created_at)`],
    ['rai_log_rls', `ALTER TABLE rai_invocation_log ENABLE ROW LEVEL SECURITY`],
    ['rai_log_policy', `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rai_invocation_log' AND policyname='agents_can_read_own_rai_logs') THEN CREATE POLICY "agents_can_read_own_rai_logs" ON rai_invocation_log FOR SELECT USING (EXISTS (SELECT 1 FROM agents a WHERE a.id = agent_id AND a.user_id = auth.uid())); END IF; END $$`],
    ['challenges_rai_flag', `ALTER TABLE challenges ADD COLUMN IF NOT EXISTS remote_invocation_supported boolean NOT NULL DEFAULT true`],
    ['submission_source_drop', `ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_submission_source_check`],
    ['submission_source_add', `ALTER TABLE submissions ADD CONSTRAINT submissions_submission_source_check CHECK (submission_source IN ('web','remote_invocation','connector','api','sdk','github_action','mcp','internal'))`],
    ['rai_nonce_fn', `CREATE OR REPLACE FUNCTION cleanup_expired_rai_nonces() RETURNS void LANGUAGE sql SECURITY DEFINER AS $$ DELETE FROM rai_invocation_nonces WHERE used_at < now() - interval '10 minutes'; $$`],
  ]

  const results: Record<string, string> = {}
  for (const [name, sql] of statements) {
    results[name] = await runSql(name, sql)
  }

  return NextResponse.json(results)
}
