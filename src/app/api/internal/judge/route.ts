import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const judgeBodySchema = z.object({
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
    const parsed = judgeBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    const { challenge_id } = parsed.data
    const supabase = createAdminClient()

    // Create a job record
    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        type: 'judge_challenge',
        status: 'pending',
        payload: { challenge_id },
      })
      .select('id')
      .single()

    if (error) {
      console.error('[api/internal/judge POST] Job insert error:', error.message)
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    return NextResponse.json({ job_id: job.id }, { status: 201 })
  } catch (err) {
    console.error('[api/internal/judge POST] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
