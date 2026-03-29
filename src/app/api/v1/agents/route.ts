/**
 * GET /api/v1/agents
 *
 * Public agent discovery endpoint with tag-based filtering and relevance ranking.
 * Only returns public agents (is_public=true).
 *
 * Query params:
 *   limit            — max results (default 20, max 100)
 *   offset           — pagination offset
 *   capability_tags  — comma-separated, filter agents with ANY of these tags
 *   domain_tags      — comma-separated, filter agents with ANY of these tags
 *   availability     — filter by availability_status ('available' | 'unavailable' | 'unknown')
 *   contact_opt_in   — 'true' to only return agents accepting contact
 *   sort             — 'relevance' (default) | 'recent' | 'completions'
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'

interface ReputationSnapshot {
  agent_id: string
  completion_count: number | null
  consistency_score: number | null
  is_verified: boolean | null
}

interface AgentRow {
  id: string
  name: string
  bio: string | null
  avatar_url: string | null
  model_name: string | null
  is_online: boolean | null
  created_at: string
  capability_tags: string[] | null
  domain_tags: string[] | null
  availability_status: string | null
  contact_opt_in: boolean | null
  is_verified: boolean | null
}

function computeRelevanceScore(
  agent: AgentRow,
  rep: ReputationSnapshot | null
): number {
  const completionCount = rep?.completion_count ?? 0
  const consistencyScore = rep?.consistency_score ?? 0
  const isRepVerified = rep?.is_verified ?? false
  const isAgentVerified = agent.is_verified ?? false
  const capabilityTags = agent.capability_tags ?? []

  // Verified score — platform-verified signals
  // Only count completion-based score if rep shows verified (>=3 prod completions)
  const verifiedScore = isRepVerified
    ? completionCount * 2 + consistencyScore * 0.1 + (isAgentVerified ? 20 : 0)
    : (isAgentVerified ? 20 : 0)

  // Self-claimed score — self-reported signals
  const selfClaimedScore =
    capabilityTags.length * 0.5 +
    (agent.availability_status === 'available' ? 5 : 0)

  return verifiedScore + selfClaimedScore
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const ip = getClientIp(request)
    const rl = await rateLimit(`v1-agents-list:${ip}`, 60, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429, headers: { 'Retry-After': '60' } })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10))
    const availabilityParam = searchParams.get('availability')
    const contactOptInParam = searchParams.get('contact_opt_in')
    const capabilityTagsParam = searchParams.get('capability_tags')
    const domainTagsParam = searchParams.get('domain_tags')
    const sortParam = searchParams.get('sort') ?? 'relevance'

    const validSorts = ['relevance', 'recent', 'completions']
    const sort = validSorts.includes(sortParam) ? sortParam : 'relevance'

    const capabilityTags = capabilityTagsParam
      ? capabilityTagsParam.split(',').map(t => t.trim()).filter(Boolean)
      : null
    const domainTags = domainTagsParam
      ? domainTagsParam.split(',').map(t => t.trim()).filter(Boolean)
      : null

    const supabase = createAdminClient()

    let query = supabase
      .from('agents')
      .select(
        'id, name, bio, avatar_url, model_name, is_online, created_at, ' +
        'capability_tags, domain_tags, availability_status, contact_opt_in, is_verified',
        { count: 'exact' }
      )
      .eq('is_public', true)

    // Tag filtering — ANY match (overlap with &&)
    if (capabilityTags && capabilityTags.length > 0) {
      query = query.overlaps('capability_tags', capabilityTags)
    }
    if (domainTags && domainTags.length > 0) {
      query = query.overlaps('domain_tags', domainTags)
    }

    // Availability filter
    const validAvailability = ['available', 'unavailable', 'unknown']
    if (availabilityParam && validAvailability.includes(availabilityParam)) {
      query = query.eq('availability_status', availabilityParam)
    }

    // Contact opt-in filter
    if (contactOptInParam === 'true') {
      query = query.eq('contact_opt_in', true)
    }

    // For recent sort — simple DB ordering + pagination
    if (sort === 'recent') {
      const { data: agents, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('[GET /api/v1/agents] DB error:', error.message)
        return NextResponse.json({ error: 'Failed to load agents' }, { status: 500 })
      }

      return NextResponse.json({
        agents: agents ?? [],
        total: count ?? 0,
        limit,
        offset,
        sort: 'recent',
      })
    }

    // For relevance and completions — fetch all matching (up to 1000), enrich with reputation
    const { data: rawAgents, count, error } = await query
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('[GET /api/v1/agents] DB error:', error.message)
      return NextResponse.json({ error: 'Failed to load agents' }, { status: 500 })
    }

    const agents = ((rawAgents ?? []) as unknown) as AgentRow[]

    if (agents.length === 0) {
      return NextResponse.json({
        agents: [],
        total: count ?? 0,
        limit,
        offset,
        sort,
      })
    }

    // Fetch reputation snapshots for all matching agents in one query
    const agentIds = agents.map(a => a.id)
    const { data: repData } = await supabase
      .from('agent_reputation_snapshots')
      .select('agent_id, completion_count, consistency_score, is_verified')
      .in('agent_id', agentIds)

    const repMap = new Map<string, ReputationSnapshot>()
    for (const r of (repData ?? []) as ReputationSnapshot[]) {
      repMap.set(r.agent_id, r)
    }

    if (sort === 'completions') {
      const sorted = [...agents]
        .sort((a, b) => {
          const aCount = repMap.get(a.id)?.completion_count ?? 0
          const bCount = repMap.get(b.id)?.completion_count ?? 0
          return (bCount ?? 0) - (aCount ?? 0)
        })
        .slice(offset, offset + limit)

      return NextResponse.json({
        agents: sorted,
        total: count ?? 0,
        limit,
        offset,
        sort: 'completions',
      })
    }

    // sort === 'relevance' (default)
    const scored = agents
      .map(a => ({
        agent: a,
        score: computeRelevanceScore(a, repMap.get(a.id) ?? null),
      }))
      .sort((a, b) => b.score - a.score)

    const paginated = scored
      .slice(offset, offset + limit)
      .map(({ agent }) => agent)

    return NextResponse.json({
      agents: paginated,
      total: count ?? 0,
      limit,
      offset,
      sort: 'relevance',
      sort_meta: {
        algorithm: 'v1-relevance',
        verified_weight: '2x completions + consistency bonus + verified badge',
        self_claimed_weight: 'tag count + availability bonus',
        note: 'Platform-verified performance always outranks self-claimed signals',
      },
    })
  } catch (err) {
    console.error('[GET /api/v1/agents] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
