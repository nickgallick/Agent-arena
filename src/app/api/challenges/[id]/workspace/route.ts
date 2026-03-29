import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/get-user'
import { rateLimit } from '@/lib/utils/rate-limit'
import { captureVersionSnapshot } from '@/lib/submissions/version-snapshot'

const idSchema = z.string().uuid('Invalid challenge ID')

/**
 * GET /api/challenges/[id]/workspace
 * Returns workspace data for the authenticated user.
 * Creates a session idempotently when the user opens the workspace.
 *
 * Session creation is the timer-start event — happens exactly once per entry.
 * Subsequent visits return the existing open session with the same expires_at.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id: rawId } = await params
    const parsed = idSchema.safeParse(rawId)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid challenge ID' }, { status: 400 })
    }
    const challengeId = parsed.data

    const { success } = await rateLimit(`workspace:${user.id}:${challengeId}`, 30, 60_000)
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const supabase = createAdminClient()

    // 1. Load challenge — must include web_submission_supported
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, title, description, status, format, weight_class_id, time_limit_minutes, web_submission_supported, starts_at, ends_at, prompt')
      .eq('id', challengeId)
      .single()

    if (challengeError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    if (challenge.status !== 'active') {
      return NextResponse.json({ error: 'Challenge is not active' }, { status: 400 })
    }

    // 2. Look up user's agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, model_name')
      .eq('user_id', user.id)
      .maybeSingle()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'No agent registered. Register an agent before entering a challenge.' }, { status: 400 })
    }

    // 3. Verify user has an entry for this challenge
    const { data: entry, error: entryError } = await supabase
      .from('challenge_entries')
      .select('id, status, session_id, submitted_at')
      .eq('challenge_id', challengeId)
      .eq('agent_id', agent.id)
      .maybeSingle()

    if (entryError || !entry) {
      return NextResponse.json({ error: 'You have not entered this challenge.' }, { status: 403 })
    }

    // 4. Determine workspace state from entry status
    const terminalStatuses = ['submitted', 'judged', 'scored', 'failed']
    if (terminalStatuses.includes(entry.status)) {
      return NextResponse.json({
        workspace_state: 'already_submitted',
        challenge: { id: challenge.id, title: challenge.title },
        agent: { id: agent.id, name: agent.name },
        session: null,
        already_submitted: true,
        web_submission_supported: challenge.web_submission_supported ?? false,
      })
    }

    if (entry.status === 'expired') {
      return NextResponse.json({
        workspace_state: 'expired',
        challenge: { id: challenge.id, title: challenge.title },
        agent: { id: agent.id, name: agent.name },
        session: null,
        web_submission_supported: challenge.web_submission_supported ?? false,
      })
    }

    // 5. Idempotent session creation
    // If entry already has a session_id, return that session.
    // If session is expired, mark entry as expired and return expired state.
    // Otherwise create a new session (timer starts now).
    let session: {
      id: string
      status: string
      expires_at: string | null
      opened_at: string
    } | null = null

    if (entry.session_id) {
      // Fetch existing session
      const { data: existingSession } = await supabase
        .from('challenge_sessions')
        .select('id, status, expires_at, opened_at')
        .eq('id', entry.session_id)
        .single()

      if (existingSession) {
        // Check if session expired
        if (
          existingSession.status === 'expired' ||
          (existingSession.expires_at && new Date(existingSession.expires_at) < new Date())
        ) {
          // Mark entry as expired
          await supabase
            .from('challenge_entries')
            .update({ status: 'expired' })
            .eq('id', entry.id)

          return NextResponse.json({
            workspace_state: 'expired',
            challenge: { id: challenge.id, title: challenge.title },
            agent: { id: agent.id, name: agent.name },
            session: null,
            web_submission_supported: challenge.web_submission_supported ?? false,
          })
        }

        session = existingSession
      }
    }

    // No existing session — create one (timer starts now)
    if (!session) {
      const version_snapshot = await captureVersionSnapshot(supabase, challengeId)
      const timeLimitSeconds = (challenge.time_limit_minutes as number | null)
        ? (challenge.time_limit_minutes as number) * 60
        : null
      const expires_at = timeLimitSeconds
        ? new Date(Date.now() + timeLimitSeconds * 1000).toISOString()
        : null

      const { data: newSession, error: sessionError } = await supabase
        .from('challenge_sessions')
        .insert({
          challenge_id: challengeId,
          agent_id: agent.id,
          entry_id: entry.id,
          status: 'open',
          expires_at,
          submission_deadline_at: expires_at,
          format_type: challenge.format as string ?? null,
          time_limit_seconds: timeLimitSeconds,
          version_snapshot: version_snapshot as unknown as Record<string, unknown>,
        })
        .select('id, status, expires_at, opened_at')
        .single()

      if (sessionError || !newSession) {
        return NextResponse.json({ error: 'Failed to create workspace session' }, { status: 500 })
      }

      session = newSession

      // Update entry: status → workspace_open, link session_id
      await supabase
        .from('challenge_entries')
        .update({
          status: 'workspace_open',
          session_id: newSession.id,
        })
        .eq('id', entry.id)
    }

    return NextResponse.json({
      workspace_state: 'open',
      challenge: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        format: challenge.format,
        weight_class_id: challenge.weight_class_id,
        time_limit_minutes: challenge.time_limit_minutes,
        web_submission_supported: challenge.web_submission_supported ?? false,
        prompt: (challenge as Record<string, unknown>).prompt ?? null,
      },
      agent: {
        id: agent.id,
        name: agent.name,
        model_name: (agent as Record<string, unknown>).model_name ?? null,
      },
      session: {
        id: session.id,
        status: session.status,
        expires_at: session.expires_at,
        opened_at: session.opened_at,
      },
      entry_id: entry.id,
      already_submitted: false,
      web_submission_supported: challenge.web_submission_supported ?? false,
    })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
