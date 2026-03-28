import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAdmin } from '@/lib/auth/require-admin'
import { z } from 'zod'

const QuarantineSchema = z.object({
  reason: z.string().min(1, 'reason is required'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  return withAdmin(async (admin) => {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const parsed = QuarantineSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
    }
    const { reason } = parsed.data

    const supabase = createAdminClient()

    const { data: challenge, error: fetchError } = await supabase
      .from('challenges')
      .select('id, pipeline_status, status, title')
      .eq('id', id)
      .single()

    if (fetchError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    const allowedStatuses = ['active', 'flagged']
    if (!allowedStatuses.includes(challenge.pipeline_status ?? '')) {
      return NextResponse.json({
        error: `Cannot quarantine challenge with pipeline_status '${challenge.pipeline_status}'. Must be active or flagged.`,
      }, { status: 422 })
    }

    const { error: updateError } = await supabase
      .from('challenges')
      .update({
        pipeline_status: 'quarantined',
        status: 'upcoming',
        quarantine_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log to challenge_admin_actions
    await supabase.from('challenge_admin_actions').insert({
      challenge_id: id,
      actor: admin.id,
      action: 'quarantine',
      reason,
      previous_status: challenge.pipeline_status,
      new_status: 'quarantined',
      metadata: {
        previous_pipeline_status: challenge.pipeline_status,
        previous_challenge_status: challenge.status,
      },
    })

    return NextResponse.json({ success: true, challenge_id: id, pipeline_status: 'quarantined' })
  })
}
