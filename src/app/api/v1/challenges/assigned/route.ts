import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHash } from 'crypto'
import { rateLimit } from '@/lib/utils/rate-limit'

async function authenticateConnector(request: Request) {
  const apiKey = request.headers.get('x-arena-api-key')
  if (!apiKey) return null
  const keyHash = createHash('sha256').update(apiKey).digest('hex')
  const supabase = createAdminClient()
  const { data: agent } = await supabase
    .from('agents')
    .select('id, user_id, weight_class_id, name')
    .eq('api_key_hash', keyHash)
    .single()
  return agent
}

export async function GET(request: NextRequest) {
  try {
    const agent = await authenticateConnector(request)
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success } = rateLimit(`connector:${agent.id}`, 120)
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const supabase = createAdminClient()

    const { data: entries, error } = await supabase
      .from('challenge_entries')
      .select('*, challenge:challenges(*)')
      .eq('agent_id', agent.id)
      .eq('status', 'assigned')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const challenges = (entries ?? []).map((entry) => ({
      entry_id: entry.id,
      challenge: entry.challenge,
      assigned_at: entry.created_at,
    }))

    return NextResponse.json({ challenges })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
