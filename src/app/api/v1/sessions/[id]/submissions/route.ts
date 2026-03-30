/**
 * POST /api/v1/sessions/:id/submissions
 *
 * Create a submission for a session with idempotency support.
 * Scope: submission:create
 * Rate limit: submission:create (5/min per agent)
 *
 * Idempotency-Key header: required for API callers, optional for web.
 * If key already exists, returns existing submission with 200.
 * If new, creates submission and returns 201.
 */

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireScope } from '@/lib/auth/token-auth'
import { applyRateLimit } from '@/lib/utils/rate-limit-policy'
import { v1Success, v1Error } from '@/lib/api/response-helpers'
import { validateSubmission } from '@/lib/submissions/validate-submission'
import { storeArtifact } from '@/lib/submissions/artifact-store'
import { logSubmissionEvent } from '@/lib/submissions/event-logger'
import { captureVersionSnapshot } from '@/lib/submissions/version-snapshot'
import { logEvent } from '@/lib/analytics/log-event'

const idSchema = z.string().uuid('Invalid session ID')

const fileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  language: z.string().optional(),
})

const submissionSchema = z.object({
  content: z.string().min(1, 'Content is required').max(100_000, 'Submission too large (max 100KB)'),
  files: z.array(fileSchema).optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  let auth
  try {
    auth = await requireScope(request, 'submission:create')
  } catch (err) {
    const e = err as Error & { status?: number }
    return v1Error(e.message, 'UNAUTHORIZED', e.status ?? 401)
  }

  const { id: rawId } = await params
  const idParsed = idSchema.safeParse(rawId)
  if (!idParsed.success) {
    return v1Error('Invalid session ID', 'INVALID_ID', 400)
  }
  const sessionId = idParsed.data

  const supabase = createAdminClient()

  // Look up agent — order by created_at, take first (safe for multi-agent users)
  const { data: agents, error: agentError } = await supabase
    .from('agents')
    .select('id, user_id')
    .eq('user_id', auth.user_id)
    .order('created_at', { ascending: true })
    .limit(1)

  const agent = agents?.[0] ?? null

  if (agentError || !agent) {
    return v1Error('No agent found for this user', 'NOT_FOUND', 404)
  }

  // Rate limit per agent
  const rl = await applyRateLimit('submission:create', agent.id)
  if (!rl.success) {
    return v1Error('Rate limit exceeded — max 5 submissions per minute', 'RATE_LIMITED', 429)
  }

  // Check idempotency key
  const idempotencyKey = request.headers.get('Idempotency-Key')
  if (idempotencyKey) {
    if (idempotencyKey.length !== 64) {
      return v1Error('Idempotency-Key must be 64 hex chars', 'INVALID_IDEMPOTENCY_KEY', 400)
    }

    const { data: existing, error: idemError } = await supabase
      .from('submission_idempotency_keys')
      .select('submission_id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (idemError) {
      return v1Error('Failed to check idempotency key', 'DB_ERROR', 500)
    }

    if (existing) {
      const { data: sub } = await supabase
        .from('submissions')
        .select('id, challenge_id, agent_id, submission_status, submitted_at, created_at')
        .eq('id', existing.submission_id)
        .single()

      return v1Success(
        { ...sub, idempotent: true },
        { status: 200 }
      )
    }
  }

  // Fetch session — must belong to this agent and be open
  const { data: session, error: sessionError } = await supabase
    .from('challenge_sessions')
    .select('id, challenge_id, agent_id, status, entry_id')
    .eq('id', sessionId)
    .eq('agent_id', agent.id)
    .single()

  if (sessionError || !session) {
    return v1Error('Session not found', 'NOT_FOUND', 404)
  }

  if (session.status !== 'open') {
    return v1Error('Session is not open', 'SESSION_CLOSED', 400)
  }

  // App-level duplicate check (secondary guard — DB unique index is primary).
  // Decision: DB unique index idx_submissions_one_per_entry is the authoritative guard.
  // This app-level check provides a user-friendly error before hitting the DB constraint.
  if (session.entry_id) {
    const { data: existingSubmission } = await supabase
      .from('submissions')
      .select('id, submission_status')
      .eq('entry_id', session.entry_id)
      .maybeSingle()

    if (existingSubmission) {
      return v1Error('A submission already exists for this entry.', 'DUPLICATE_SUBMISSION', 409)
    }
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return v1Error('Invalid JSON body', 'INVALID_JSON', 400)
  }

  const parsed = submissionSchema.safeParse(body)
  if (!parsed.success) {
    return v1Error(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
  }

  const { content, files } = parsed.data

  // Validate submission against challenge rules
  const validation = await validateSubmission(supabase, {
    challenge_id: session.challenge_id,
    agent_id: agent.id,
    content,
  })

  if (!validation.valid) {
    return v1Error(validation.rejection_reason ?? 'Submission rejected', 'SUBMISSION_REJECTED', 400)
  }

  const submittedAt = new Date().toISOString()
  const version_snapshot = await captureVersionSnapshot(supabase, session.challenge_id)

  const { data: submission, error: submitError } = await supabase
    .from('submissions')
    .insert({
      entry_id: session.entry_id,
      challenge_id: session.challenge_id,
      agent_id: agent.id,
      user_id: auth.user_id,
      session_id: sessionId,
      content,
      files: files ?? null,
      submitted_at: submittedAt,
      submission_status: 'received',
    })
    .select('id, challenge_id, agent_id, submission_status, submitted_at')
    .single()

  if (submitError || !submission) {
    return v1Error('Failed to create submission', 'DB_ERROR', 500)
  }

  await logSubmissionEvent(supabase, submission.id, 'received')

  const { content_hash } = await storeArtifact(supabase, {
    submission_id: submission.id,
    content,
    artifact_type: 'solution',
    version_snapshot,
  })

  await supabase
    .from('submissions')
    .update({ artifact_hash: content_hash })
    .eq('id', submission.id)

  // Update entry
  await supabase
    .from('challenge_entries')
    .update({
      status: 'submitted',
      submitted_at: submittedAt,
      submission_text: content,
      submission_files: files ?? null,
    })
    .eq('id', session.entry_id)

  // Store idempotency key if provided
  if (idempotencyKey) {
    await supabase
      .from('submission_idempotency_keys')
      .insert({
        idempotency_key: idempotencyKey,
        submission_id: submission.id,
        agent_id: agent.id,
        challenge_id: session.challenge_id,
      })
  }

  // Enqueue judging job
  const { error: enqueueError } = await supabase.rpc('enqueue_judging_job', {
    p_submission_id: submission.id,
    p_challenge_id: session.challenge_id,
    p_agent_id: agent.id,
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

  logEvent({
    event_type: 'submission_received',
    auth,
    request,
    session_id: sessionId,
    submission_id: submission.id,
    challenge_id: submission.challenge_id,
  })

  // Fire-and-forget: check if this is the agent's second submission (first repeat)
  void (async () => {
    try {
      const { count } = await supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agent.id)
      if (count === 2) {
        logEvent({
          event_type: 'first_repeat_submission',
          auth,
          request,
          submission_id: submission.id,
          challenge_id: submission.challenge_id,
          metadata: { agent_id: agent.id },
        })
      }
    } catch {
      // never throw — analytics must never break requests
    }
  })()

  return v1Success(
    {
      ...submission,
      submission_status: enqueueError ? 'received' : 'queued',
      idempotent: false,
    },
    { status: 201 }
  )
}
