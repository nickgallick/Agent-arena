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

interface AgentWithReputation {
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
  is_verified?: boolean | null
  // Reputation snapshot (from LEFT JOIN — raw Supabase shape)
  agent_reputation_snapshots?: { completion_count?: number | null; consistency_score?: number | null; is_verified?: boolean | null } | null
  // Enriched reputation fields (flattened for scoring)
  rep_completion_count?: number | null
  rep_consistency_score?: number | null
  rep_is_verified?: boolean | null
  // Computed
  relevance_score?: number
}

function computeRelevanceScore(agent: AgentWithReputation): number {
  const completionCount = agent.rep_completion_count ?? 0
  const consistencyScore = agent.rep_consistency_score ?? 0
  const isRepVerified = agent.rep_is_verified ?? false
  const isAgentVerified = agent.is_verified ?? false
  const capabilityTags = agent.capability_tags ?? []
  const availabilityStatus = agent.availability_status

  // Verified score — platform-verified signals
  // Only count if agent has verified reputation (rep_is_verified=true means >=3 completions, production, public)
  const verifiedScore = isRepVerified
    ? completionCount * 2 + consistencyScore * 0.1 + (isAgentVerified ? 20 : 0)
    : (isAgentVerified ? 20 : 0) // unverified rep agents: only badge counts

  // Self-claimed score — self-reported signals
  const selfClaimedScore =
    capabilityTags.length * 0.5 +
    (availabilityStatus === 'available' ? 5 : 0)

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

    // For relevance and completions sort, we need reputation data
    // Fetch agents with LEFT JOIN to agent_reputation_snapshots
    const needsReputation = sort === 'relevance' || sort === 'completions'

    let query = supabase
      .from('agents')
      .select(
        needsReputation
          ? 'id, name, bio, avatar_url, model_name, is_online, created_at, ' +
            'capability_tags, domain_tags, availability_status, contact_opt_in, is_verified, ' +
            'agent_reputation_snapshots(completion_count, consistency_score, is_verified)'
          : 'id, name, bio, avatar_url, model_name, is_online, created_at, ' +
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

    // For non-relevance sorts, apply DB ordering and pagination directly
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

    if (sort === 'completions') {
      // Fetch all matching agents (up to 1000), sort in-memory by completion_count
      const { data: rawAgents, count, error } = await query
        .order('created_at', { ascending: false })
        .limit(1000)

      if (error) {
        console.error('[GET /api/v1/agents] DB error:', error.message)
        return NextResponse.json({ error: 'Failed to load agents' }, { status: 500 })
      }

      interface AgentRow {
        agent_reputation_snapshots?: { completion_count?: number | null; consistency_score?: number | null; is_verified?: boolean | null } | null
        [key: string]: unknown
      }

      const sorted = ((rawAgents as unknown) as AgentRow[] ?? [])
        .map(a => ({
          ...a,
          _completion_count: (a.agent_reputation_snapshots as { completion_count?: number | null } | null)?.completion_count ?? 0,
        }))
        .sort((a, b) => (b._completion_count as number) - (a._completion_count as number))
        .slice(offset, offset + limit)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({ _completion_count: _cc, agent_reputation_snapshots: _rep, ...rest }) => rest)

      return NextResponse.json({
        agents: sorted,
        total: count ?? 0,
        limit,
        offset,
        sort: 'completions',
      })
    }

    // sort === 'relevance' (default)
    // Fetch all matching agents (up to 1000 for scoring), score in TS, paginate
    const { data: rawAgents, count, error } = await query
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('[GET /api/v1/agents] DB error:', error.message)
      return NextResponse.json({ error: 'Failed to load agents' }, { status: 500 })
    }

    interface AgentRow {
      agent_reputation_snapshots?: { completion_count?: number | null; consistency_score?: number | null; is_verified?: boolean | null } | null
      [key: string]: unknown
    }

    const scored: (AgentWithReputation & { relevance_score: number })[] = ((rawAgents as unknown) as AgentRow[] ?? [])
      .map(a => {
        const rep = a.agent_reputation_snapshots as { completion_count?: number | null; consistency_score?: number | null; is_verified?: boolean | null } | null
        const enriched: AgentWithReputation = {
          ...(a as unknown as AgentWithReputation),
          rep_completion_count: rep?.completion_count ?? null,
          rep_consistency_score: rep?.consistency_score ?? null,
          rep_is_verified: rep?.is_verified ?? null,
        }
        return {
          ...enriched,
          relevance_score: computeRelevanceScore(enriched),
        }
      })
      .sort((a, b) => b.relevance_score - a.relevance_score)

    const paginated = scored
      .slice(offset, offset + limit)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ rep_completion_count: _rc, rep_consistency_score: _rcs, rep_is_verified: _ri, relevance_score: _rs, agent_reputation_snapshots: _aRep, ...rest }) => rest)

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
