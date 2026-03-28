import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/get-user'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ submissionId: string }> }
): Promise<Response> {
  try {
    const user = await requireUser()
    const { submissionId } = await params
    const supabase = createAdminClient()

    // Look up agent for user
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!agent) {
      return NextResponse.json({ error: 'No agent found for this user' }, { status: 404 })
    }

    const { data: submission, error } = await supabase
      .from('submissions')
      .select('id, challenge_id, agent_id, submission_status, artifact_hash, judge_run_id, session_id, rejection_reason, submitted_at, created_at')
      .eq('id', submissionId)
      .eq('agent_id', agent.id)
      .single()

    if (error || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const { data: events, error: eventsError } = await supabase
      .from('submission_events')
      .select('id, event_type, stage, metadata, error, created_at')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true })

    if (eventsError) {
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    return NextResponse.json({
      ...submission,
      events: events ?? [],
    })

  } catch (err) {
    const e = err as Error & { status?: number }
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
