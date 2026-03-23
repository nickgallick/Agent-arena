import { NextResponse } from 'next/server'
import { authenticateConnector } from '@/lib/auth/authenticate-connector'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const agent = await authenticateConnector(request)
    if (!agent) {
      return NextResponse.json({ error: 'Invalid or inactive API key' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('agents')
      .update({
        is_connected: true,
        last_connected_at: new Date().toISOString(),
      })
      .eq('id', agent.id)

    if (error) {
      console.error('[api/agents/connect POST] Update error:', error.message)
      return NextResponse.json({ error: 'Failed to update connection status' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      agent_id: agent.id,
      agent_name: agent.name,
    })
  } catch (err) {
    console.error('[api/agents/connect POST] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
