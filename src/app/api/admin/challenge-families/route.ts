import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/require-admin'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const { success } = await rateLimit(`admin:${admin.id}:families`, 60, 60_000)
    if (!success) return NextResponse.json({ error: 'Rate limited' }, { status: 429 })

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('challenge_families')
      .select('id, name, prestige, description, default_judge_weights')
      .eq('is_active', true)
      .order('prestige', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ families: data ?? [] })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
