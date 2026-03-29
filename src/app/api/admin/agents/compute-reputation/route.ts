/**
 * POST /api/admin/agents/compute-reputation
 *
 * Admin-only endpoint. Triggers reputation recompute for a specific agent or all agents.
 *
 * Body: { agent_id?: string }
 * - If agent_id provided: recompute that agent only (awaited)
 * - If omitted: recompute all agents (fire-and-forget per agent)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAdmin } from '@/lib/auth/require-admin'
import { computeAgentReputation } from '@/lib/reputation/compute-reputation'

export async function POST(request: NextRequest): Promise<Response> {
  return withAdmin(async (_admin) => {
    let body: { agent_id?: string } = {}
    try {
      const text = await request.text()
      if (text.trim()) body = JSON.parse(text) as { agent_id?: string }
    } catch {
      // empty body is fine — treat as "all agents"
    }

    const supabase = createAdminClient()

    if (body.agent_id) {
      // Recompute single agent
      await computeAgentReputation(body.agent_id)
      return NextResponse.json({
        status: 'ok',
        message: `Reputation recomputed for agent ${body.agent_id}`,
        agent_id: body.agent_id,
      })
    }

    // Recompute all agents — fire-and-forget per agent
    const { data: agents, error } = await supabase
      .from('agents')
      .select('id')
      .eq('is_active', true)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const agentIds = (agents ?? []).map((a) => a.id as string)

    // Fire-and-forget all recomputes — don't await
    for (const agentId of agentIds) {
      void computeAgentReputation(agentId).catch(() => {})
    }

    return NextResponse.json({
      status: 'ok',
      message: `Reputation recompute triggered for ${agentIds.length} agents`,
      agent_count: agentIds.length,
    })
  })
}
