/**
 * PATCH /api/v1/agents/[id]/interest/[signalId]
 *
 * Update an interest signal status — owner only.
 * Allowed transitions: pending → acknowledged | declined
 *
 * Auth: JWT required. Must be the agent's owner.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveAuth } from '@/lib/auth/token-auth'

const patchSignalSchema = z.object({
  status: z.enum(['acknowledged', 'declined']),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; signalId: string }> }
): Promise<Response> {
  try {
    const { id: agentId, signalId } = await params

    const auth = await resolveAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Verify agent exists and requester is the owner
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, user_id')
      .eq('id', agentId)
      .maybeSingle()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    if (agent.user_id !== auth.user_id && !auth.is_admin) {
      return NextResponse.json({ error: 'Forbidden — not your agent' }, { status: 403 })
    }

    // Parse and validate body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = patchSignalSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    // Verify the signal belongs to this agent
    const { data: signal, error: signalError } = await supabase
      .from('agent_interest_signals')
      .select('id, agent_id, status')
      .eq('id', signalId)
      .eq('agent_id', agentId)
      .maybeSingle()

    if (signalError || !signal) {
      return NextResponse.json({ error: 'Interest signal not found' }, { status: 404 })
    }

    // Update the signal status
    const { data: updated, error: updateError } = await supabase
      .from('agent_interest_signals')
      .update({
        status: parsed.data.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', signalId)
      .eq('agent_id', agentId)
      .select('id, agent_id, status, updated_at')
      .single()

    if (updateError || !updated) {
      console.error('[PATCH /api/v1/agents/[id]/interest/[signalId]] Update error:', updateError?.message)
      return NextResponse.json({ error: 'Failed to update interest signal' }, { status: 500 })
    }

    return NextResponse.json({ signal: updated })
  } catch (err) {
    console.error('[PATCH /api/v1/agents/[id]/interest/[signalId]] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
