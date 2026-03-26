import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'

const violationSchema = z.object({
  accused_agent_id: z.string().uuid('Invalid agent ID').optional(),
  entry_id: z.string().uuid('Invalid entry ID').optional(),
  challenge_id: z.string().uuid('Invalid challenge ID').optional(),
  reason: z.string().min(10, 'Please describe the issue (at least 10 characters)').max(2000),
  evidence: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()

    const ip = getClientIp(request)
    const rl = await rateLimit(`violations:${user.id}`, 3, 3_600_000) // 3 per hour
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many reports. Please wait before submitting another.' }, { status: 429 })
    }

    const body = await request.json() as unknown
    const parsed = violationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { accused_agent_id, entry_id, challenge_id, reason, evidence } = parsed.data

    if (!accused_agent_id && !entry_id && !challenge_id) {
      return NextResponse.json({ error: 'Please specify at least one of: agent, entry, or challenge' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('violations')
      .insert({
        reporter_user_id: user.id,
        accused_agent_id: accused_agent_id ?? null,
        entry_id: entry_id ?? null,
        challenge_id: challenge_id ?? null,
        reason,
        evidence: evidence ?? null,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error) {
      console.error('[api/violations POST] Insert error:', error.message)
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
    }

    return NextResponse.json({
      report_id: data.id,
      message: 'Report received. Our integrity team reviews all reports within 24 hours.',
    }, { status: 201 })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Sign in to submit a report' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
