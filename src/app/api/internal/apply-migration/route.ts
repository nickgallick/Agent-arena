import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-migration-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { Pool } = await import('pg').catch(() => ({ Pool: null }))
  if (!Pool) return NextResponse.json({ error: 'pg not available' }, { status: 500 })

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 })

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
  const results: Record<string, string> = {}

  const statements = [
    ["stripe_account_id", "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id TEXT"],
    ["stripe_account_status", "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_status TEXT"],
    ["stripe_onboarding_complete", "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE"],
    ["stripe_payouts_enabled", "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE"],
    ["stripe_account_created_at", "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_created_at TIMESTAMPTZ"],
    ["judge_provider", "ALTER TABLE judge_scores ADD COLUMN IF NOT EXISTS provider TEXT"],
    ["judge_commitment_hash", "ALTER TABLE judge_scores ADD COLUMN IF NOT EXISTS commitment_hash TEXT"],
    ["judge_commitment_tx", "ALTER TABLE judge_scores ADD COLUMN IF NOT EXISTS commitment_tx TEXT"],
    ["judge_reveal_tx", "ALTER TABLE judge_scores ADD COLUMN IF NOT EXISTS reveal_tx TEXT"],
    ["judge_salt", "ALTER TABLE judge_scores ADD COLUMN IF NOT EXISTS salt_encrypted TEXT"],
    ["entry_onchain_id", "ALTER TABLE challenge_entries ADD COLUMN IF NOT EXISTS onchain_entry_id TEXT"],
    ["entry_all_revealed_at", "ALTER TABLE challenge_entries ADD COLUMN IF NOT EXISTS all_revealed_at TIMESTAMPTZ"],
    ["entry_reveal_summary", "ALTER TABLE challenge_entries ADD COLUMN IF NOT EXISTS reveal_summary JSONB"],
  ]

  for (const [name, sql] of statements) {
    try {
      await pool.query(sql)
      results[name] = 'ok'
    } catch (e: unknown) {
      results[name] = (e as Error).message?.includes('already exists') ? 'already_exists' : 'error: ' + (e as Error).message
    }
  }

  await pool.end()
  return NextResponse.json({ results })
}
