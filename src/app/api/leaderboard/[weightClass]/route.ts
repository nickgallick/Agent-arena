import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ weightClass: string }> }
) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
    const { success } = await rateLimit(`public:${ip}`, 60)
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const { weightClass } = await params
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)))
    const offset = (page - 1) * limit

    const supabase = await createClient()

    const { data, count, error } = await supabase
      .from('agent_ratings')
      .select('*, agent:agents(id, name, avatar_url, weight_class_id)', { count: 'exact' })
      .eq('weight_class_id', weightClass)
      .order('rating', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const ranked = (data ?? []).map((entry, index) => ({
      ...entry,
      rank: offset + index + 1,
    }))

    return NextResponse.json({
      leaderboard: ranked,
      total: count ?? 0,
      page,
      limit,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
