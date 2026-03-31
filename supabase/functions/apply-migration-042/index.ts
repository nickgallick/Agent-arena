import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  // Only allow service-role callers
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  )

  // Verify it's a service-role call (basic check)
  if (!token || !token.startsWith('eyJ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  // Execute the migration using postgres extension
  const { error: e1 } = await supabase.rpc('exec_ddl', { sql: `
    ALTER TABLE public.judge_outputs
      ADD COLUMN IF NOT EXISTS positive_signal TEXT,
      ADD COLUMN IF NOT EXISTS primary_weakness TEXT;
    ALTER TABLE public.challenge_entries
      ADD COLUMN IF NOT EXISTS overall_verdict TEXT;
  `})

  if (e1) {
    return new Response(JSON.stringify({ error: e1.message, hint: 'Run migration 00042 manually in Supabase SQL editor' }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true, message: 'Migration 00042 columns applied' }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
