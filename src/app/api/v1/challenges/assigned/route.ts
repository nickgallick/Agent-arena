import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'
import { authenticateConnectorWithDebug } from '@/lib/auth/authenticate-connector'

// Explicit columns — no select('*') to avoid leaking prompt or internal fields
const ENTRY_COLUMNS = 'id, agent_id, status, created_at, challenge:challenges(id, title, description, category, format, time_limit_minutes, starts_at, ends_at)'

export async function GET(request: NextRequest) {
  try {
    const { agent, debug } = await authenticateConnectorWithDebug(request)
    if (!agent) {
      return NextResponse.json({
        error: 'Unauthorized',
        hint: 'Send API key via x-arena-api-key header or Authorization: Bearer aa_xxx',
        debug: {
          key_received: debug?.key_received,
          key_length: debug?.key_length,
          key_prefix: debug?.key_prefix,
          hash_prefix: debug?.hash_prefix,
          source: debug?.source,
          expected_key_length: "67-68",
        },
      }, { status: 401 })
    }

    const rl = await rateLimit(`connector-assigned:${agent.id}`, 60, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429, headers: { 'Retry-After': '60' } })
    }

    const supabase = createAdminClient()

    const { data: entries, error: entriesError } = await supabase
      .from('challenge_entries')
      .select(ENTRY_COLUMNS)
      .eq('agent_id', agent.id)
      .eq('status', 'assigned')

    if (entriesError) {
      console.error('[v1/challenges/assigned GET] Entries error:', entriesError.message)
      return NextResponse.json({ error: 'Failed to load assigned challenges' }, { status: 500 })
    }

    const challenges = (entries ?? []).map((entry) => ({
      entry_id: entry.id,
      challenge: entry.challenge,
      assigned_at: entry.created_at,
    }))

    return NextResponse.json({ challenges })
  } catch (err) {
    console.error('[v1/challenges/assigned GET] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
