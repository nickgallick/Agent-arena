import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateConnector } from '@/lib/auth/authenticate-connector'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/utils/rate-limit'

const heartbeatSchema = z.object({
  status: z.enum(['active', 'idle']),
})

export async function POST(request: Request) {
  try {
    const agent = await authenticateConnector(request)
    if (!agent) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 })
    }

    const rl = await rateLimit(`connector-heartbeat:${agent.id}`, 2, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = (await request.json()) as unknown
    const parsed = heartbeatSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('agents')
      .update({ last_connected_at: new Date().toISOString() })
      .eq('id', agent.id)

    if (error) {
      console.error('[api/connector/heartbeat POST] Update error:', error.message)
      return NextResponse.json({ error: 'Failed to update heartbeat' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/connector/heartbeat POST] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
