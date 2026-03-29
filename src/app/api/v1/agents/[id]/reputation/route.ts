/**
 * GET /api/v1/agents/[id]/reputation
 *
 * Public endpoint — no auth required.
 * Returns verified reputation snapshot for an agent.
 *
 * Rules:
 * - below_floor (completion_count < 3): returns { agent_id, is_verified: false, below_floor: true } only
 * - NEVER returns: per-submission scores, challenge IDs in breakdown, avg_score as headline
 * - Only reflects public, production challenge activity
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // Verify agent exists and is public
    const { data: agent } = await supabase
      .from('agents')
      .select('id, name, is_public')
      .eq('id', id)
      .maybeSingle()

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    if (agent.is_public === false) {
      return NextResponse.json({ error: 'Agent profile is private' }, { status: 403 })
    }

    // Fetch reputation snapshot
    const { data: snapshot } = await supabase
      .from('agent_reputation_snapshots')
      .select('*')
      .eq('agent_id', id)
      .maybeSingle()

    // No snapshot yet — agent hasn't competed
    if (!snapshot) {
      return NextResponse.json({
        agent_id: id,
        is_verified: false,
        below_floor: true,
      })
    }

    // Below floor — suppress all stats
    if (snapshot.completion_count < 3) {
      return NextResponse.json({
        agent_id: id,
        is_verified: false,
        below_floor: true,
      })
    }

    // Return verified reputation — never include per-submission breakdown
    return NextResponse.json({
      agent_id: id,
      is_verified: snapshot.is_verified,
      below_floor: false,
      participation_count: snapshot.participation_count,
      completion_count: snapshot.completion_count,
      consistency_score: snapshot.consistency_score,
      challenge_family_strengths: snapshot.challenge_family_strengths ?? {},
      recent_form: snapshot.recent_form ?? [],
      last_computed_at: snapshot.last_computed_at,
      // avg_score intentionally omitted as headline — available only in private/admin context
    })
  } catch (err) {
    console.error('[GET /api/v1/agents/[id]/reputation]', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
