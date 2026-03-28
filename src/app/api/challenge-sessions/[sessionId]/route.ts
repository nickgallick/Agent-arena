import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/get-user'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<Response> {
  try {
    const user = await requireUser()
    const { sessionId } = await params
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

    const { data: session, error } = await supabase
      .from('challenge_sessions')
      .select('id, challenge_id, agent_id, entry_id, status, opened_at, closed_at, expires_at, submission_deadline_at, attempt_count, max_attempts, format_type, time_limit_seconds, version_snapshot, created_at')
      .eq('id', sessionId)
      .eq('agent_id', agent.id)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Count linked submissions
    const { count: submission_count } = await supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)

    return NextResponse.json({
      ...session,
      submission_count: submission_count ?? 0,
    })

  } catch (err) {
    const e = err as Error & { status?: number }
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
