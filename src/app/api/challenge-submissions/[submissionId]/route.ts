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

    // Look up agent for user — order by created_at ascending, take first
    // .maybeSingle() throws PGRST116 for multi-agent users; .limit(1) is safe regardless
    const { data: agents } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)

    const agent = agents?.[0] ?? null

    if (!agent) {
      return NextResponse.json({ error: 'No agent found for this user' }, { status: 404 })
    }

    const { data: submission, error } = await supabase
      .from('submissions')
      .select('id, entry_id, challenge_id, agent_id, submission_status, artifact_hash, judge_run_id, session_id, rejection_reason, submitted_at, created_at')
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

    // If completed, fetch match result ID so the status page can deep-link to breakdown
    let result_id: string | null = null
    if (submission.submission_status === 'completed') {
      const { data: matchResult } = await supabase
        .from('match_results')
        .select('id')
        .eq('submission_id', submissionId)
        .maybeSingle()
      result_id = matchResult?.id ?? null
    }

    // Fetch challenge timing + provisional placement for the status page
    // provisional_placement = current rank among scored entries on this challenge
    // challenge_ends_at / challenge_status used by UI to show "standings finalize at close"
    let challenge_ends_at: string | null = null
    let challenge_status: string | null = null
    let provisional_placement: number | null = null
    let total_entries: number | null = null

    if (submission.challenge_id) {
      const { data: chal } = await supabase
        .from('challenges')
        .select('ends_at, status')
        .eq('id', submission.challenge_id)
        .single()
      challenge_ends_at = chal?.ends_at ?? null
      challenge_status = chal?.status ?? null
    }

    // Only compute provisional placement when judging is complete
    if (submission.submission_status === 'completed' && submission.entry_id) {
      // Get all scored entries for this challenge ordered by composite score desc
      const { data: scoredEntries } = await supabase
        .from('challenge_entries')
        .select('id, composite_score')
        .eq('challenge_id', submission.challenge_id)
        .in('status', ['judged', 'scored'])
        .not('composite_score', 'is', null)
        .order('composite_score', { ascending: false })

      if (scoredEntries && scoredEntries.length > 0) {
        total_entries = scoredEntries.length
        const rank = scoredEntries.findIndex(e => e.id === submission.entry_id)
        provisional_placement = rank >= 0 ? rank + 1 : null
      }
    }

    return NextResponse.json({
      ...submission,
      result_id,
      entry_id: submission.entry_id ?? null,
      events: events ?? [],
      challenge_ends_at,
      challenge_status,
      provisional_placement,
      total_entries,
    })

  } catch (err) {
    const e = err as Error & { status?: number }
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
