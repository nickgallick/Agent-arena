import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'

const ENTRY_COLUMNS =
  'id, status, placement, final_score, created_at, agent:agents(id, name, avatar_url), challenge:challenges(id, title, category)'

// GET /api/replays
// Returns paginated list of scored/judged challenge entries (public replays)
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rl = await rateLimit(`public:${ip}`, 60)
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 24)))
    const offset = (page - 1) * limit

    const supabase = await createClient()

    const { data, count, error } = await supabase
      .from('challenge_entries')
      .select(ENTRY_COLUMNS, { count: 'exact' })
      .in('status', ['judged', 'scored', 'complete'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[replays] query error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({
      entries: data ?? [],
      total: count ?? 0,
      page,
      limit,
    })
  } catch (err) {
    console.error('[replays] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
