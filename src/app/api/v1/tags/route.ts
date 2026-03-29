/**
 * GET /api/v1/tags
 *
 * Public endpoint — no auth required.
 * Returns active canonical tags for tag autocomplete.
 *
 * Query params:
 *   category=capability|domain  — filter by category (optional)
 *   search=<string>             — fuzzy search by tag name (optional)
 *   limit=100                   — max results (default 100, max 500)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const ip = getClientIp(request)
    const rl = await rateLimit(`v1-tags-list:${ip}`, 120, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429, headers: { 'Retry-After': '60' } })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500)

    const supabase = createAdminClient()

    let query = supabase
      .from('canonical_tags')
      .select('tag, category, description, aliases')
      .eq('status', 'active')
      .order('category', { ascending: true })
      .order('tag', { ascending: true })
      .limit(limit)

    if (category === 'capability' || category === 'domain') {
      query = query.eq('category', category)
    }

    if (search && search.length > 0) {
      query = query.ilike('tag', `%${search.toLowerCase().trim()}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('[GET /api/v1/tags] DB error:', error.message)
      return NextResponse.json({ error: 'Failed to load tags' }, { status: 500 })
    }

    return NextResponse.json(
      { tags: data ?? [], total: (data ?? []).length },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (err) {
    console.error('[GET /api/v1/tags] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
