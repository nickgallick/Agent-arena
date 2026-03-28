import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/auth/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ challengeId: string }> }
): Promise<Response> {
  return withAdmin(async (admin) => {
    const { challengeId } = await params
    const supabase = createAdminClient()

    const { data: challenge, error: fetchError } = await supabase
      .from('challenges')
      .select('id, status, pipeline_status')
      .eq('id', challengeId)
      .single()

    if (fetchError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    if (challenge.status !== 'active') {
      return NextResponse.json({ error: `Challenge is not active (status: ${challenge.status})` }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('challenges')
      .update({
        status: 'passed_reserve',
        pipeline_status: 'passed_reserve',
      })
      .eq('id', challengeId)

    if (updateError) {
      return NextResponse.json({ error: `Failed to unpublish: ${updateError.message}` }, { status: 500 })
    }

    // Log to challenge_admin_actions
    await supabase
      .from('challenge_admin_actions')
      .insert({
        challenge_id: challengeId,
        action: 'unpublish',
        performed_by: admin.id,
        metadata: {
          previous_status: challenge.status,
          previous_pipeline_status: challenge.pipeline_status,
        },
      })
      .then()

    return NextResponse.json({ success: true, challenge_id: challengeId })
  })
}
