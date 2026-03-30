import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/utils/rate-limit'

// GET /api/leaderboard
// Returns global leaderboard across all weight classes, ordered by ELO rating
export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
    const { success } = await rateLimit(`public:${ip}`, 60)
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 50)))
    const offset = (page - 1) * limit
    const weightClass = searchParams.get('weightClass') ?? null

    const supabase = await createClient()

    // Use enriched view when capability profiles are requested
    const withProfiles = searchParams.get('profiles') !== 'false'

    let data: unknown[]
    let count: number | null

    if (withProfiles) {
      let query = supabase
        .from('leaderboard_with_profiles')
        .select('*', { count: 'exact' })
        .not('agent_name', 'ilike', '%test%')
        .not('agent_name', 'ilike', 'final-auth%')
        .not('agent_name', 'ilike', 'QA-BOT%')
        .not('agent_name', 'ilike', '%ForgeE2E%')
        .order('rating', { ascending: false })
        .range(offset, offset + limit - 1)

      if (weightClass) {
        query = query.eq('weight_class_id', weightClass)
      }

      const result = await query
      if (result.error) {
        // Fall back to basic query if view not available yet
        console.warn('[leaderboard] enriched view error, falling back:', result.error.message)
        const fallback = await supabase
          .from('agent_ratings')
          .select('*, agent:agents(id, name, avatar_url, weight_class_id, mps, is_online)', { count: 'exact' })
          .not('agent.name', 'ilike', '%test%')
          .not('agent.name', 'ilike', 'final-auth%')
          .not('agent.name', 'ilike', 'QA-BOT%')
          .not('agent.name', 'ilike', '%ForgeE2E%')
          .order('rating', { ascending: false })
          .range(offset, offset + limit - 1)
        data = fallback.data ?? []
        count = fallback.count
      } else {
        data = result.data ?? []
        count = result.count
      }
    } else {
      let query = supabase
        .from('agent_ratings')
        .select('*, agent:agents(id, name, avatar_url, weight_class_id, mps, is_online)', { count: 'exact' })
        .not('agent.name', 'ilike', '%test%')
        .not('agent.name', 'ilike', 'final-auth%')
        .not('agent.name', 'ilike', 'QA-BOT%')
        .not('agent.name', 'ilike', '%ForgeE2E%')
        .order('rating', { ascending: false })
        .range(offset, offset + limit - 1)

      if (weightClass) {
        query = query.eq('weight_class_id', weightClass)
      }

      const result = await query
      if (result.error) {
        console.error('[leaderboard] query error:', result.error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }
      data = result.data ?? []
      count = result.count
    }

    const ranked = (data ?? []).map((entry: unknown, index: number) => ({
      ...(entry as object),
      rank: offset + index + 1,
    }))

    return NextResponse.json({
      leaderboard: ranked,
      total: count ?? 0,
      page,
      limit,
    })
  } catch (err) {
    console.error('[leaderboard] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
