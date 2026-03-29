import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/get-user'
import { rateLimit } from '@/lib/utils/rate-limit'
import { validateSubmission } from '@/lib/submissions/validate-submission'
import { hashContent, storeArtifact } from '@/lib/submissions/artifact-store'
import { logSubmissionEvent } from '@/lib/submissions/event-logger'
import { captureVersionSnapshot } from '@/lib/submissions/version-snapshot'
import { logEvent } from '@/lib/analytics/log-event'

const submitSchema = z.object({
  content:    z.string().min(1, 'Content is required').max(100_000, 'Submission too large (max 100KB)'),
  session_id: z.string().uuid('Invalid session ID').optional(),
  entry_id:   z.string().uuid('Invalid entry ID').optional(),
})

/**
 * POST /api/challenges/[id]/web-submit
 *
 * Manual browser submission path. Reuses the exact same pipeline as
 * connector/submit — same validation, same artifact store, same judging queue.
 * The only differences are:
 *   - Auth: JWT (user session) instead of connector API token
 *   - submission_source: 'web'
 *   - Agent identity resolved from user account, not API key
 *   - Dual-session conflict handled explicitly (not via DB error)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()

    const { id: challengeId } = await params
    if (!z.string().uuid().safeParse(challengeId).success) {
      return NextResponse.json({ error: 'Invalid challenge ID' }, { status: 400 })
    }

    // Rate limit: 3 web submissions per minute per user (stricter than connector)
    const { success } = await rateLimit(`web-submit:${user.id}`, 3, 60_000)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests — please wait before resubmitting' }, { status: 429 })
    }

    // Parse body
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = submitSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { content, session_id: clientSessionId } = parsed.data

    const supabase = createAdminClient()

    // ── 1. Load agent for this user ──
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'No agent registered. Register an agent before submitting.' }, { status: 400 })
    }

    // ── 2. Verify challenge is active ──
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, status, web_submission_supported')
      .eq('id', challengeId)
      .single()

    if (challengeError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }
    if (challenge.status !== 'active') {
      return NextResponse.json({ error: 'Challenge is not currently active' }, { status: 400 })
    }
    if (!challenge.web_submission_supported) {
      return NextResponse.json({ error: 'This challenge does not support web submission. Use the connector, API, SDK, or CLI.' }, { status: 400 })
    }

    // ── 3. Verify user has an entry ──
    const { data: entry, error: entryError } = await supabase
      .from('challenge_entries')
      .select('id, status, session_id')
      .eq('challenge_id', challengeId)
      .eq('agent_id', agent.id)
      .maybeSingle()

    if (entryError || !entry) {
      return NextResponse.json({ error: 'You have not entered this challenge.' }, { status: 403 })
    }

    // ── 4. Check entry is in a submittable state ──
    const SUBMITTABLE_ENTRY_STATUSES = ['entered', 'workspace_open', 'assigned', 'in_progress']
    if (!SUBMITTABLE_ENTRY_STATUSES.includes(entry.status)) {
      if (entry.status === 'submitted' || entry.status === 'judged' || entry.status === 'scored') {
        return NextResponse.json({ error: 'You have already submitted for this challenge.' }, { status: 409 })
      }
      if (entry.status === 'expired') {
        return NextResponse.json({ error: 'This entry can no longer accept a submission.' }, { status: 409 })
      }
      return NextResponse.json({ error: `Entry cannot be submitted from status: ${entry.status}` }, { status: 409 })
    }

    // ── 5. Resolve session — handle dual-session conflict explicitly ──
    // Prefer the session linked to this entry (from workspace open).
    // If a connector created a different session, we reuse that rather than
    // attempting a new insert (which would fail the unique index).
    let resolvedSessionId: string | null = null

    // Check for any existing open session for this agent+challenge
    const { data: existingSession } = await supabase
      .from('challenge_sessions')
      .select('id, status, expires_at')
      .eq('challenge_id', challengeId)
      .eq('agent_id', agent.id)
      .not('status', 'in', '("cancelled","expired")')
      .maybeSingle()

    if (existingSession) {
      // Validate session is still open and not expired
      if (existingSession.status !== 'open') {
        return NextResponse.json({ error: 'Your session is no longer open.' }, { status: 409 })
      }
      if (existingSession.expires_at && new Date(existingSession.expires_at) < new Date()) {
        // Mark expired
        await supabase.from('challenge_sessions').update({ status: 'expired' }).eq('id', existingSession.id)
        await supabase.from('challenge_entries').update({ status: 'expired' }).eq('id', entry.id)
        return NextResponse.json({ error: 'This entry can no longer accept a submission.' }, { status: 409 })
      }
      resolvedSessionId = existingSession.id
    } else if (clientSessionId) {
      // Fallback: use client-provided session_id — verify ownership before trusting it
      const { data: clientSession } = await supabase
        .from('challenge_sessions')
        .select('id, status, expires_at, agent_id, challenge_id')
        .eq('id', clientSessionId)
        .maybeSingle()

      if (
        clientSession &&
        clientSession.agent_id === agent.id &&
        clientSession.challenge_id === challengeId &&
        clientSession.status === 'open' &&
        (!clientSession.expires_at || new Date(clientSession.expires_at) >= new Date())
      ) {
        resolvedSessionId = clientSession.id
      }
      // If ownership check fails, proceed without session — submission is still valid
    }
    // If no session exists at all, proceed without one (sessionless submission is valid)

    // ── 6. Validate submission via shared lib ──
    const validation = await validateSubmission(supabase, {
      challenge_id: challengeId,
      agent_id: agent.id,
      content,
      session_id: resolvedSessionId ?? undefined,
    })

    if (!validation.valid) {
      return NextResponse.json({ error: validation.rejection_reason ?? 'Submission validation failed' }, { status: 400 })
    }

    // ── 7. Capture version snapshot ──
    const version_snapshot = await captureVersionSnapshot(supabase, challengeId)
    const submittedAt = new Date().toISOString()

    // ── 8. Insert submission with submission_source = 'web' ──
    const { data: submission, error: submitError } = await supabase
      .from('submissions')
      .insert({
        entry_id:         entry.id,
        challenge_id:     challengeId,
        agent_id:         agent.id,
        user_id:          user.id,
        content,
        submitted_at:     submittedAt,
        submission_status: 'received',
        submission_source: 'web',          // Explicit — Sentinel requirement
        ...(resolvedSessionId ? { session_id: resolvedSessionId } : {}),
      })
      .select('id, submitted_at')
      .single()

    if (submitError) {
      return NextResponse.json({ error: 'Failed to record submission. Please try again.' }, { status: 500 })
    }

    // ── 9. Log received event ──
    await logSubmissionEvent(supabase, submission.id, 'received')

    // ── 10. Store immutable artifact ──
    const { content_hash } = await storeArtifact(supabase, {
      submission_id:    submission.id,
      content,
      artifact_type:    'solution',
      version_snapshot,
    })

    await supabase
      .from('submissions')
      .update({ artifact_hash: content_hash })
      .eq('id', submission.id)

    // ── 11. Update entry status → submitted ──
    const { error: entryUpdateError } = await supabase
      .from('challenge_entries')
      .update({
        status:           'submitted',
        submitted_at:     submittedAt,
        submission_text:  content,
      })
      .eq('id', entry.id)

    if (entryUpdateError) {
      // Submission is recorded — don't fail the user, but log it
      await logSubmissionEvent(supabase, submission.id, 'failed', {
        error: `Entry status update failed: ${entryUpdateError.message}`,
      })
    }

    // ── 12. Close the workspace session ──
    if (resolvedSessionId) {
      await supabase
        .from('challenge_sessions')
        .update({ status: 'submitted', closed_at: submittedAt })
        .eq('id', resolvedSessionId)
    }

    // ── 13. Enqueue judging job ──
    const { error: enqueueError } = await supabase.rpc('enqueue_judging_job', {
      p_submission_id:    submission.id,
      p_challenge_id:     challengeId,
      p_agent_id:         agent.id,
      p_version_snapshot: version_snapshot as unknown as Record<string, unknown>,
    })

    if (enqueueError) {
      await logSubmissionEvent(supabase, submission.id, 'failed', {
        error: `Failed to enqueue judging job: ${enqueueError.message}`,
      })
    } else {
      await logSubmissionEvent(supabase, submission.id, 'queued')
      await supabase
        .from('submissions')
        .update({ submission_status: 'queued' })
        .eq('id', submission.id)
    }

    // ── 14. Analytics (non-blocking) ──
    logEvent({
      event_type:    'submission_received',
      auth:          null,
      request,
      challenge_id:  challengeId,
      submission_id: submission.id,
      metadata:      { access_mode: 'web', agent_id: agent.id },
    })

    // ── 15. Return submission_id for redirect to status page ──
    return NextResponse.json({
      submission_id:  submission.id,
      submitted_at:   submission.submitted_at,
      status:         enqueueError ? 'received' : 'queued',
    }, { status: 201 })

  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Always return JSON — never let this dead-end
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
