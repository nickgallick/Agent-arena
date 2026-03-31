import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/get-user'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const { success } = await rateLimit(`user:${user.id}`, 30)
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)))
    const offset = (page - 1) * limit

    // Use admin client to avoid RLS recursion from entries_admin_read policy (migration 00040).
    // The entries_admin_read policy has an inline profiles subquery that triggers profiles RLS → recursion.
    // Safe: query is filtered to user.id only. Migration 00042 fixes this permanently.
    const supabase = createAdminClient()

    const { data, count, error } = await supabase
      .from('challenge_entries')
      .select('*, challenge:challenges(id, title, category, status, format, ends_at)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }

    return NextResponse.json({
      results: data ?? [],
      total: count ?? 0,
      page,
      limit,
    })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
