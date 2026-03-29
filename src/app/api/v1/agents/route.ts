/**
 * GET /api/v1/agents
 *
 * Public agent discovery endpoint with tag-based filtering.
 * Only returns public agents (is_public=true).
 *
 * Query params:
 *   limit            — max results (default 20, max 100)
 *   offset           — pagination offset
 *   capability_tags  — comma-separated, filter agents with ANY of these tags
 *   domain_tags      — comma-separated, filter agents with ANY of these tags
 *   availability     — filter by availability_status ('available' | 'unavailable' | 'unknown')
 *   contact_opt_in   — 'true' to only return agents accepting contact
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'

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
        'capability_tags, domain_tags, availability_status, contact_opt_in',
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
    })
  } catch (err) {
    console.error('[GET /api/v1/agents] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
