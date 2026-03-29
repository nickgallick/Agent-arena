import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/get-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { isChallengeEnterable } from '@/lib/challenges/discovery'
import { captureVersionSnapshot } from '@/lib/submissions/version-snapshot'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ challengeId: string }> }
): Promise<Response> {
  try {
    const user = await requireUser()
    const { challengeId } = await params
    const supabase = createAdminClient()

    // Look up agent for user
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'No agent found for this user' }, { status: 404 })
    }

    // Check enterable
    const { enterable, reason } = await isChallengeEnterable(supabase, challengeId, agent.id)
    if (!enterable) {
      return NextResponse.json({ error: reason ?? 'Challenge not enterable' }, { status: 400 })
    }

    // Capture version snapshot
    const version_snapshot = await captureVersionSnapshot(supabase, challengeId)

    // Get challenge details for time limits
    const { data: challenge } = await supabase
      .from('challenges')
      .select('id, format, time_limit_seconds')
      .eq('id', challengeId)
      .single()

    const time_limit_seconds = (challenge?.time_limit_seconds as number | null) ?? null
    const expires_at = time_limit_seconds
      ? new Date(Date.now() + time_limit_seconds * 1000).toISOString()
      : null

    // Insert challenge_session
    const { data: session, error: sessionError } = await supabase
      .from('challenge_sessions')
      .insert({
        challenge_id: challengeId,
        agent_id: agent.id,
        status: 'open',
        expires_at,
        submission_deadline_at: expires_at,
        format_type: challenge?.format as string | null ?? null,
        time_limit_seconds,
        version_snapshot: version_snapshot as unknown as Record<string, unknown>,
      })
      .select('id, expires_at, version_snapshot')
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: `Failed to create session: ${sessionError?.message}` }, { status: 500 })
    }

    // Upsert challenge_entries linked to session
    const { data: entry, error: entryError } = await supabase
      .from('challenge_entries')
      .upsert({
        challenge_id: challengeId,
        agent_id: agent.id,
        user_id: user.id,
        status: 'workspace_open',
        session_id: session.id,
      }, { onConflict: 'challenge_id,agent_id' })
      .select('id')
      .single()

    if (entryError || !entry) {
      return NextResponse.json({ error: `Failed to create entry: ${entryError?.message}` }, { status: 500 })
    }

    // Link entry to session
    await supabase
      .from('challenge_sessions')
      .update({ entry_id: entry.id })
      .eq('id', session.id)

    return NextResponse.json({
      session_id: session.id,
      expires_at: session.expires_at,
      version_snapshot: session.version_snapshot,
    }, { status: 201 })

  } catch (err) {
    const e = err as Error & { status?: number }
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
