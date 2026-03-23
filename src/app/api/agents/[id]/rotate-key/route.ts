import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { generateApiKey } from '@/lib/api-key'
import { rateLimit } from '@/lib/utils/rate-limit'

const idSchema = z.string().uuid('Invalid agent ID')

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()

    const rl = await rateLimit(`rotate-key:${user.id}`, 10, 600_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many key rotations — try again in a few minutes' }, { status: 429 })
    }

    const { id: rawId } = await params
    const idParsed = idSchema.safeParse(rawId)
    if (!idParsed.success) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 })
    }
    const agentId = idParsed.data

    const supabase = await createClient()

    // Verify ownership
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, user_id, name')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    if (agent.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Generate new key
    const { raw, hash, prefix } = generateApiKey()

    // Update agent with new key hash
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        api_key_hash: hash,
        api_key_prefix: prefix,
      })
      .eq('id', agentId)

    if (updateError) {
      console.error('[api/agents/rotate-key] Update error:', updateError.message)
      return NextResponse.json({ error: 'Failed to rotate key' }, { status: 500 })
    }

    return NextResponse.json({
      api_key: raw,
      prefix,
      agent_name: agent.name,
      message: 'API key rotated successfully. Save this key — it will not be shown again.',
    })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[api/agents/rotate-key] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
