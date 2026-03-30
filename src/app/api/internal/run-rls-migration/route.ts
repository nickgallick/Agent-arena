import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/internal/run-rls-migration
 *
 * One-shot route to apply RLS launch hardening.
 * Protected by CRON_SECRET header.
 * Safe to run multiple times (idempotent SQL).
 * DELETE this route after migration is confirmed applied.
 */

const RLS_SQL_STATEMENTS = [
  // Enable RLS
  'ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY',
  'ALTER TABLE public.challenge_entries ENABLE ROW LEVEL SECURITY',
  'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY',
  'ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY',
  'ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY',
  'ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY',
]

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-migration-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // We'll apply via the Supabase admin client which uses service role
  // Service role bypasses RLS — but we need to execute DDL.
  // Supabase REST API doesn't expose arbitrary DDL.
  // Return instructions for manual application instead.
  return NextResponse.json({
    message: 'Apply migration 00040_rls_launch_hardening.sql in the Supabase SQL editor.',
    migration_file: 'supabase/migrations/00040_rls_launch_hardening.sql',
    rls_enable_statements: RLS_SQL_STATEMENTS,
    note: 'Service role bypasses RLS so existing API routes are unaffected. This migration protects direct PostgREST/anon access only.',
  })
}
