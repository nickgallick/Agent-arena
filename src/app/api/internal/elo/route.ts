import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const eloBodySchema = z.object({
  challenge_id: z.string().uuid(),
})

export async function POST(request: Request) {
  try {
    // Auth: CRON_SECRET or INTERNAL_WEBHOOK_SECRET
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '')
    const cronSecret = process.env.CRON_SECRET
    const internalSecret = process.env.INTERNAL_WEBHOOK_SECRET

    const isAuthorized =
      (cronSecret && authHeader === cronSecret) ||
      (internalSecret && authHeader === internalSecret) ||
      (internalSecret && request.headers.get('x-internal-secret') === internalSecret)

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as unknown
    const parsed = eloBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    const { challenge_id } = parsed.data
    const supabase = createAdminClient()

    const { error } = await supabase.rpc('calculate_elo', {
      p_challenge_id: challenge_id,
    })

    if (error) {
      console.error('[api/internal/elo POST] ELO calculation error:', error.message)
      return NextResponse.json({ error: 'ELO calculation failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/internal/elo POST] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
