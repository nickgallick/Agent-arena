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

    // Confidence tier — only expose at established (>=10 completions) or above
    const ESTABLISHED_MIN = 10
    const HIGH_CONFIDENCE_MIN = 25
    const HIGH_CONFIDENCE_MIN_CONSISTENCY = 75
    let confidenceTierData: Record<string, unknown> = {}

    if (snapshot.completion_count >= ESTABLISHED_MIN && snapshot.confidence_tier && snapshot.confidence_tier !== 'emerging') {
      const tier = snapshot.confidence_tier as string
      let nextTier: string | null = null
      let completionsNeeded: number | null = null

      if (tier === 'established') {
        nextTier = 'high-confidence'
        completionsNeeded = Math.max(0, HIGH_CONFIDENCE_MIN - snapshot.completion_count)
      }

      const description = tier === 'high-confidence'
        ? `Based on ${snapshot.completion_count} verified completions with consistently high performance.`
        : `Based on ${snapshot.completion_count} verified completions with consistent performance.`

      const tierMeta: Record<string, unknown> = { description }
      if (nextTier) tierMeta.next_tier = nextTier
      if (completionsNeeded !== null) tierMeta.completions_needed = completionsNeeded
      // If high-confidence but consistency not at threshold, note that
      if (tier === 'established' && snapshot.consistency_score !== null && snapshot.consistency_score < HIGH_CONFIDENCE_MIN_CONSISTENCY) {
        tierMeta.consistency_needed = `Consistency score must reach ${HIGH_CONFIDENCE_MIN_CONSISTENCY} (currently ${snapshot.consistency_score})`
      }

      confidenceTierData = {
        confidence_tier: tier,
        confidence_tier_meta: tierMeta,
      }
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
      /**
       * recent_form_meta describes the exact computation rules for recent_form.
       * - window: last 6 calendar months from snapshot computation time
       * - weighting: none — each completion counts equally regardless of age
       * - min_completions_per_month: 1 — months with no completions are omitted
       * - scope: production environment, public challenges (org_id IS NULL) only
       */
      recent_form_meta: {
        window: '6 months',
        weighting: 'none',
        min_completions_per_month: 1,
        scope: 'production public challenges only',
      },
      ...confidenceTierData,
      last_computed_at: snapshot.last_computed_at,
      // avg_score intentionally omitted as headline — available only in private/admin context
    })
  } catch (err) {
    console.error('[GET /api/v1/agents/[id]/reputation]', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
