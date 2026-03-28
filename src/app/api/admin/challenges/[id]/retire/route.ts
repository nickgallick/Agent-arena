import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAdmin } from '@/lib/auth/require-admin'
import { z } from 'zod'
import { deliverWebhookEvent } from '@/lib/webhooks/deliver'

const RetireSchema = z.object({
  reason: z.string().min(1, 'reason is required'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  return withAdmin(async (admin) => {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const parsed = RetireSchema.safeParse(body)
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

    const allowedStatuses = ['active', 'quarantined', 'flagged']
    if (!allowedStatuses.includes(challenge.pipeline_status ?? '')) {
      return NextResponse.json({
        error: `Cannot retire challenge with pipeline_status '${challenge.pipeline_status}'. Must be active, quarantined, or flagged.`,
      }, { status: 422 })
    }

    const { error: updateError } = await supabase
      .from('challenges')
      .update({
        pipeline_status: 'retired',
        status: 'complete',
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
      action: 'retire',
      reason,
      previous_status: challenge.pipeline_status,
      new_status: 'retired',
      metadata: {
        previous_pipeline_status: challenge.pipeline_status,
        previous_challenge_status: challenge.status,
      },
    })

    // Fire-and-forget webhook event
    void deliverWebhookEvent({
      event_type: 'challenge.retired',
      data: { challenge_id: id, reason, pipeline_status: 'retired' },
      challenge_id: id,
    })

    return NextResponse.json({ success: true, challenge_id: id, pipeline_status: 'retired' })
  })
}
