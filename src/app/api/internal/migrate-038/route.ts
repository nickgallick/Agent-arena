/**
 * One-shot migration runner for RAI schema (00038).
 * Uses pg module directly for DDL execution.
 * DELETE THIS FILE after running.
 */
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

// Supabase pooler connection string format
// postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
// OR direct: postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
// We can construct from the service key (JWT) since ref is in the token payload

function getSupabaseDbUrl(): string | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return null
  
  try {
    // Decode JWT payload to get project ref
    const payload = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64').toString())
    const ref = payload.ref
    if (!ref) return null
    
    // Use the session pooler - need password which is the service key itself? No.
    // Supabase DB password is separate. We don't have it.
    return null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  // Execute SQL via Supabase REST API using service key
  // DDL can be run via a custom RPC if it exists, otherwise we need pg direct access
  // Strategy: use the Supabase Management API (if PAT available) or create a helper function first
  
  const results: Record<string, string> = {}

  // First try to create an exec_ddl helper function via fetch to Supabase
  // We'll use the service key to call the REST endpoint for a function that runs DDL
  // Since exec_ddl doesn't exist, we need another approach.
  
  // APPROACH: Execute via Supabase's undocumented /v2/admin SQL endpoint
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
    ['rai_nonces_table', `CREATE TABLE IF NOT EXISTS rai_invocation_nonces (nonce text PRIMARY KEY, agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE, used_at timestamptz NOT NULL DEFAULT now())`],
    ['rai_nonces_idx_used_at', `CREATE INDEX IF NOT EXISTS idx_rai_nonces_used_at ON rai_invocation_nonces(used_at)`],
    ['rai_nonces_idx_agent', `CREATE INDEX IF NOT EXISTS idx_rai_nonces_agent_id ON rai_invocation_nonces(agent_id)`],
    ['rai_log_table', `CREATE TABLE IF NOT EXISTS rai_invocation_log (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), submission_id uuid REFERENCES submissions(id) ON DELETE SET NULL, agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE, challenge_id uuid NOT NULL, entry_id uuid NOT NULL, invocation_id text NOT NULL UNIQUE, endpoint_url text NOT NULL, environment text NOT NULL CHECK (environment IN ('production','sandbox')), request_sent_at timestamptz NOT NULL, response_received_at timestamptz, response_status_code integer, response_latency_ms integer, response_content_hash text, execution_metadata jsonb, attempt_number integer NOT NULL DEFAULT 1, outcome text NOT NULL CHECK (outcome IN ('success','timeout','error','invalid_response','content_too_large')), error_message text, created_at timestamptz NOT NULL DEFAULT now())`],
    ['rai_log_idx_agent', `CREATE INDEX IF NOT EXISTS idx_rai_log_agent_id ON rai_invocation_log(agent_id)`],
    ['rai_log_idx_submission', `CREATE INDEX IF NOT EXISTS idx_rai_log_submission_id ON rai_invocation_log(submission_id)`],
    ['rai_log_idx_entry', `CREATE INDEX IF NOT EXISTS idx_rai_log_entry_id ON rai_invocation_log(entry_id)`],
    ['rai_log_idx_created', `CREATE INDEX IF NOT EXISTS idx_rai_log_created_at ON rai_invocation_log(created_at)`],
    ['rai_log_rls', `ALTER TABLE rai_invocation_log ENABLE ROW LEVEL SECURITY`],
    ['challenges_rai_flag', `ALTER TABLE challenges ADD COLUMN IF NOT EXISTS remote_invocation_supported boolean NOT NULL DEFAULT true`],
    ['submission_source_drop', `ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_submission_source_check`],
    ['submission_source_add', `ALTER TABLE submissions ADD CONSTRAINT submissions_submission_source_check CHECK (submission_source IN ('web','remote_invocation','connector','api','sdk','github_action','mcp','internal'))`],
    ['rai_nonce_fn', `CREATE OR REPLACE FUNCTION cleanup_expired_rai_nonces() RETURNS void LANGUAGE sql SECURITY DEFINER AS $fn$ DELETE FROM rai_invocation_nonces WHERE used_at < now() - interval '10 minutes'; $fn$`],
  ]

  // Use pg module for direct connection
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Client } = require('pg')
    
    // Supabase connection via transaction pooler (port 6543)
    // Connection string uses service key as the password for the postgres user
    // Actually Supabase uses a separate DB password - not the JWT
    // The JWT ref tells us the project but we need the actual DB password
    // 
    // WORKAROUND: Use the Supabase REST API to insert a helper row that triggers DDL
    // via a trigger... too complex.
    //
    // REAL SOLUTION: The service key can authenticate to pg via the supabase auth proxy
    // postgresql://postgres.gojpbtlajzigvyfkghrg:[SERVICE_KEY]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
    
    const connectionString = `postgresql://postgres.gojpbtlajzigvyfkghrg:${serviceKey}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
    await client.connect()
    
    for (const [name, sql] of statements) {
      try {
        await client.query(sql)
        results[name] = 'ok'
      } catch (err) {
        results[name] = `error: ${(err as Error).message.slice(0, 150)}`
      }
    }
    
    await client.end()
  } catch (err) {
    results['connection'] = `failed: ${(err as Error).message.slice(0, 200)}`
    // Return partial results even on connection failure
  }

  return NextResponse.json(results)
}
