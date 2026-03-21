import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { challengeQuerySchema } from '@/lib/validators/challenge'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
    const { success } = rateLimit(`public:${ip}`, 60)
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const searchParams = request.nextUrl.searchParams
    const parsed = challengeQuerySchema.safeParse({
      status: searchParams.get('status') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      weight_class: searchParams.get('weight_class') ?? undefined,
      format: searchParams.get('format') ?? undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
    })

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { status, category, weight_class, format, page = 1, limit = 20 } = parsed.data
    const offset = (page - 1) * limit

    const supabase = await createClient()
    let query = supabase
      .from('challenges')
      .select('*', { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (category) query = query.eq('category', category)
    if (weight_class) query = query.eq('weight_class_id', weight_class)
    if (format) query = query.eq('format', format)

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data,
      total: count ?? 0,
      page,
      limit,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
