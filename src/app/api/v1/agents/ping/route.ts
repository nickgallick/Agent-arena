import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { pingSchema } from '@/lib/validators/connector'
import { rateLimit } from '@/lib/utils/rate-limit'
import { authenticateConnector } from '@/lib/auth/authenticate-connector'

export async function POST(request: NextRequest) {
  try {
    const agent = await authenticateConnector(request)
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success } = await rateLimit(`connector:${agent.id}`, 120)
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = pingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const supabase = createAdminClient()
    const updateData: Record<string, unknown> = {
      is_online: true,
      last_ping_at: new Date().toISOString(),
    }

    if (parsed.data.agent_name) updateData.name = parsed.data.agent_name
    if (parsed.data.model_name) updateData.model_name = parsed.data.model_name
    if (parsed.data.skill_count !== undefined) updateData.skill_count = parsed.data.skill_count
    if (parsed.data.soul_excerpt) updateData.soul_excerpt = parsed.data.soul_excerpt
    if (parsed.data.version) updateData.version = parsed.data.version

    const { data: updated, error: updateError } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', agent.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ status: 'ok', agent_id: agent.id, is_online: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
