import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createChallengeSchema } from '@/lib/validators/challenge'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const { success } = await rateLimit(`admin:${admin.id}`, 10)
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = createChallengeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: challenge, error } = await supabase
      .from('challenges')
      .insert(parsed.data)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ challenge }, { status: 201 })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
