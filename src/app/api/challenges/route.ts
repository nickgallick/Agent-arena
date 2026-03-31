import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { challengeQuerySchema } from '@/lib/validators/challenge'
import { rateLimit } from '@/lib/utils/rate-limit'
import { getUser } from '@/lib/auth/get-user'

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
    const { success } = await rateLimit(`public:${ip}`, 60)
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

    // Determine auth level — admins see all, anonymous users see only safe public challenges
    let user = null
    let isAdmin = false
    try {
      user = await getUser()
      if (user) {
        // Use admin client for profile role check — avoids RLS recursion from migration 00040.
        // Safe: filtered to user.id only. Migration 00042 fixes RLS permanently.
        const supabaseAdmin = createAdminClient()
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        isAdmin = profile?.role === 'admin'
      }
    } catch {
      // Not authenticated — fine
    }

    const supabase = createAdminClient()
    let query = supabase
      .from('challenges')
      .select('id, title, description, category, format, weight_class_id, status, time_limit_minutes, max_coins, entry_fee_cents, prize_pool, platform_fee_percent, starts_at, ends_at, entry_count, is_featured, is_daily, web_submission_supported, created_at, difficulty_profile, challenge_type', { count: 'exact' })

    if (!isAdmin) {
      // Anonymous and non-admin users: only show active, non-sandbox, public (no org) challenges
      query = query
        .eq('status', 'active')
        .eq('is_sandbox', false)
        .is('org_id', null)
    } else {
      // Admin: apply requested filters as-is
      if (status) query = query.eq('status', status)
    }

    if (category) query = query.eq('category', category)
    if (weight_class) query = query.eq('weight_class_id', weight_class)
    if (format) query = query.eq('format', format)

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      console.error('[api/challenges GET] DB error:', error.message)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({
      challenges: data,
      total: count ?? 0,
      page,
      limit,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
