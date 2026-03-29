// Migration runner for 00035_web_submission
// One-time use — invoke once, then delete.
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts"

const MIGRATION_SECRET = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DB_URL = Deno.env.get('SUPABASE_DB_URL')!

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  
  const auth = req.headers.get('authorization') || ''
  if (!auth.includes(MIGRATION_SECRET)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const pool = new Pool(DB_URL, 1, true)
  const results: Record<string, string> = {}
  
  const statements: [string, string][] = [
    // 1. challenges.web_submission_supported
    ['add_web_submission_supported', `
      ALTER TABLE public.challenges
        ADD COLUMN IF NOT EXISTS web_submission_supported boolean NOT NULL DEFAULT false
    `],
    ['comment_web_submission_supported', `
      COMMENT ON COLUMN public.challenges.web_submission_supported IS
        'When true, this challenge supports manual browser submission via the web workspace. Only sprint/standard text-artifact challenges should be flagged. Set by admin.'
    `],
    ['index_web_submission_supported', `
      CREATE INDEX IF NOT EXISTS idx_challenges_web_submission
        ON public.challenges(web_submission_supported)
        WHERE web_submission_supported = true
    `],

    // 2. submissions.submission_source
    ['add_submission_source', `
      ALTER TABLE public.submissions
        ADD COLUMN IF NOT EXISTS submission_source text NOT NULL DEFAULT 'connector'
          CHECK (submission_source IN ('web', 'connector', 'api', 'sdk', 'github_action', 'mcp', 'internal'))
    `],
    ['comment_submission_source', `
      COMMENT ON COLUMN public.submissions.submission_source IS
        'Which path was used to submit: web=manual browser, connector=arena-connect CLI, api=v1 REST, sdk=TypeScript/Python SDK, github_action=CI/CD, mcp=MCP tool, internal=test/admin.'
    `],

    // 3. challenge_entries.status — extend CHECK constraint
    ['drop_entries_status_check', `
      ALTER TABLE public.challenge_entries
        DROP CONSTRAINT IF EXISTS challenge_entries_status_check
    `],
    ['add_entries_status_check', `
      ALTER TABLE public.challenge_entries
        ADD CONSTRAINT challenge_entries_status_check
          CHECK (status IN (
            'entered',
            'workspace_open',
            'assigned',
            'in_progress',
            'submitted',
            'judged',
            'failed',
            'expired'
          ))
    `],
    ['comment_entries_status', `
      COMMENT ON COLUMN public.challenge_entries.status IS
        'Explicit participation state. entered: entered, no workspace. workspace_open: web workspace open, timer running. assigned: connector/agent associated. in_progress: connector active. submitted: artifact received. judged: result finalized. failed: pipeline error. expired: session timed out with no submission.'
    `],

    // 4. Flag sandbox challenges
    ['flag_sandbox_challenges', `
      UPDATE public.challenges
        SET web_submission_supported = true
        WHERE id IN (
          '00000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000002',
          '00000000-0000-0000-0000-000000000003'
        )
    `],
  ]

  const client = await pool.connect()
  try {
    for (const [name, sql] of statements) {
      try {
        await client.queryObject(sql)
        results[name] = 'ok'
      } catch (e) {
        results[name] = `error: ${(e as Error).message.slice(0, 200)}`
      }
    }
  } finally {
    client.release()
    await pool.end()
  }

  const allOk = Object.values(results).every(v => v === 'ok')
  return new Response(JSON.stringify({ ok: allOk, results }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
    status: allOk ? 200 : 207,
  })
})
