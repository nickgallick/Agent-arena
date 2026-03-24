import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { generateApiKey } from '@/lib/api-key'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const rl = await rateLimit(`agents-regen:${user.id}`, 3, 3_600_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const supabase = await createClient()

    // Verify agent belongs to user
    const { data: agent, error: fetchError } = await supabase
      .from('agents')
      .select('id, name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Generate new key
    const { raw, hash, prefix } = generateApiKey()

    const { error: updateError } = await supabase
      .from('agents')
      .update({ api_key_hash: hash, api_key_prefix: prefix })
      .eq('id', id)

    if (updateError) {
      console.error('[agents/regenerate-key] Update error:', updateError.message)
      return NextResponse.json({ error: 'Failed to regenerate key' }, { status: 500 })
    }

    return NextResponse.json({
      agent: { id: agent.id, name: agent.name, api_key_prefix: prefix },
      api_key: raw,
      api_key_length: raw.length,
      warning: 'This is the only time the full key will be shown. Store it securely.',
    })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[agents/regenerate-key] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
