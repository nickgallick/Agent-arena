/**
 * POST /api/challenges/[id]/invoke
 *
 * Remote Agent Invocation — the main trigger route.
 *
 * Flow:
 * 1. Validate entry ownership + challenge active + endpoint configured
 * 2. Resolve session for this agent+challenge
 * 3. Build challenge payload
 * 4. Invoke agent endpoint (signed HMAC request, timeout/retry)
 * 5. Log provenance to rai_invocation_log
 * 6. On success: store artifact + enqueue judging + update entry status
 * 7. Return submission_id for redirect to /submissions/[id]/status
 *
 * On failure: log to rai_invocation_log, return user-facing error,
 * entry stays 'workspace_open' (retryable failures).
 *
 * submission_source = 'remote_invocation' — same pipeline, different provenance.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/get-user'
import { rateLimit } from '@/lib/utils/rate-limit'
import { validateSubmission } from '@/lib/submissions/validate-submission'
import { storeArtifact } from '@/lib/submissions/artifact-store'
import { logSubmissionEvent } from '@/lib/submissions/event-logger'
import { captureVersionSnapshot } from '@/lib/submissions/version-snapshot'
import { logEvent } from '@/lib/analytics/log-event'
import { invokeAgent, logInvocation, RaiChallengePayload } from '@/lib/rai/invoke-agent'
import { isPrivateIp } from '@/lib/rai/ip-guard'

const InvokeSchema = z.object({
  environment: z.enum(['production', 'sandbox']).optional(),
})

const SUBMITTABLE_ENTRY_STATUSES = ['entered', 'workspace_open', 'assigned', 'in_progress']

// User-facing messages per outcome
const OUTCOME_MESSAGES: Record<string, string> = {
  timeout: 'Your agent endpoint did not respond in time. Check that your agent is running and reachable.',
  error: 'Your endpoint returned an error. Check your endpoint logs for details.',
  invalid_response: "Your endpoint returned a response Bouts couldn't parse. Ensure it returns { content: string }.",
  content_too_large: "Your agent's response exceeded the 100KB limit. Trim the output and try again.",
}

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

    // Rate limit: 5 invocations per user per hour
    const { success: rateLimitOk } = await rateLimit(`rai-invoke:${user.id}`, 5, 3_600_000)
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many invocation attempts. Try again later.' },
        { status: 429 }
      )
    }

    let rawBody: unknown
    try { rawBody = await request.json() } catch { rawBody = {} }

    const parsed = InvokeSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // ── 1. Load agent for this user ──
    const { data: agents } = await supabase
      .from('agents')
      .select(`
        id, user_id,
        remote_endpoint_url, remote_endpoint_timeout_ms, remote_endpoint_max_retries,
        sandbox_endpoint_url
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)

    const agent = agents?.[0] ?? null
    if (!agent) {
      return NextResponse.json(
        { error: 'No agent registered. Register an agent before invoking.' },
        { status: 400 }
      )
    }

    // ── 2. Load challenge ──
    const { data: challenge, error: challengeErr } = await supabase
      .from('challenges')
      .select(`
        id, title, description, status, prompt, format, weight_class_id,
        time_limit_minutes, remote_invocation_supported, is_sandbox
      `)
      .eq('id', challengeId)
      .single()

    if (challengeErr || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }
    if (challenge.status !== 'active') {
      return NextResponse.json({ error: 'Challenge is not currently active' }, { status: 400 })
    }
    if (!challenge.remote_invocation_supported) {
      return NextResponse.json(
        { error: 'This challenge does not support Remote Agent Invocation. Use the connector, API, SDK, or CLI.' },
        { status: 400 }
      )
    }

    // ── 3. Determine environment + endpoint ──
    const isSandbox = challenge.is_sandbox === true
    const environment: 'production' | 'sandbox' = parsed.data.environment ?? (isSandbox ? 'sandbox' : 'production')

    const endpointUrl = environment === 'sandbox'
      ? (agent.sandbox_endpoint_url ?? agent.remote_endpoint_url)
      : agent.remote_endpoint_url

    if (!endpointUrl) {
      return NextResponse.json(
        {
          error: 'No remote endpoint configured for this agent. Configure one in Settings → Agent → Remote Invocation.',
          configure_url: '/settings?tab=agent',
        },
        { status: 400 }
      )
    }

    // ── 4. SSRF protection: block private IPs ──
    try {
      const url = new URL(endpointUrl)
      if (url.protocol !== 'https:') {
        return NextResponse.json({ error: 'Endpoint must use HTTPS' }, { status: 400 })
      }
      const privateCheck = await isPrivateIp(url.hostname)
      if (privateCheck) {
        return NextResponse.json(
          { error: 'Endpoint resolved to a private/reserved IP address and cannot be reached.' },
          { status: 400 }
        )
      }
    } catch {
      return NextResponse.json({ error: 'Invalid endpoint URL' }, { status: 400 })
    }

    // ── 5. Load entry ──
    const { data: entry, error: entryErr } = await supabase
      .from('challenge_entries')
      .select('id, status, session_id')
      .eq('challenge_id', challengeId)
      .eq('agent_id', agent.id)
      .maybeSingle()

    if (entryErr || !entry) {
      return NextResponse.json({ error: 'You have not entered this challenge.' }, { status: 403 })
    }

    if (!SUBMITTABLE_ENTRY_STATUSES.includes(entry.status)) {
      if (['submitted', 'judged', 'scored'].includes(entry.status)) {
        return NextResponse.json({ error: 'You have already submitted for this challenge.' }, { status: 409 })
      }
      if (entry.status === 'expired') {
        return NextResponse.json({ error: 'This entry can no longer accept a submission.' }, { status: 409 })
      }
      return NextResponse.json({ error: `Entry cannot be submitted from status: ${entry.status}` }, { status: 409 })
    }

    // ── 6. Resolve session ──
    let resolvedSessionId: string | null = null

    const { data: existingSession } = await supabase
      .from('challenge_sessions')
      .select('id, status, expires_at')
      .eq('challenge_id', challengeId)
      .eq('agent_id', agent.id)
      .not('status', 'in', '("cancelled","expired")')
      .maybeSingle()

    if (existingSession) {
      if (existingSession.status !== 'open') {
        return NextResponse.json({ error: 'Your session is no longer open.' }, { status: 409 })
      }
      if (existingSession.expires_at && new Date(existingSession.expires_at) < new Date()) {
        await supabase.from('challenge_sessions').update({ status: 'expired' }).eq('id', existingSession.id)
        await supabase.from('challenge_entries').update({ status: 'expired' }).eq('id', entry.id)
        return NextResponse.json({ error: 'Your session has expired.' }, { status: 409 })
      }
      resolvedSessionId = existingSession.id
    }

    // ── 7. Build invocation payload ──
    const submissionDeadline = existingSession?.expires_at
      ? new Date(existingSession.expires_at)
      : new Date(Date.now() + (challenge.time_limit_minutes ?? 60) * 60_000)

    const { data: idempotencyData } = await supabase.rpc('gen_random_uuid')
    const idempotencyKey = Buffer.from(
      `${challengeId}:${agent.id}:${entry.id}:${Date.now()}`
    ).toString('hex').slice(0, 64).padEnd(64, '0')

    const invokePayload: RaiChallengePayload = {
      challengeId,
      sessionId: resolvedSessionId ?? '',
      entryId: entry.id,
      agentId: agent.id,
      challenge: {
        title: challenge.title,
        prompt: challenge.prompt ?? challenge.description,
        format: challenge.format ?? 'standard',
        weightClass: challenge.weight_class_id ?? 'middleweight',
        timeLimitSeconds: challenge.time_limit_minutes ? challenge.time_limit_minutes * 60 : null,
        expectedOutputFormat: 'text',
      },
      submissionDeadlineUtc: submissionDeadline.toISOString(),
      environment,
      idempotencyKey,
    }

    // ── 8. Invoke agent endpoint ──
    const invocationResult = await invokeAgent(supabase, agent.id, {
      endpointUrl,
      timeoutMs: agent.remote_endpoint_timeout_ms ?? 30_000,
      maxRetries: agent.remote_endpoint_max_retries ?? 1,
      environment,
    }, invokePayload)

    // ── 9. Log invocation (always — success or failure) ──
    // Will be linked to submission_id if we create one
    let submissionId: string | undefined

    if (invocationResult.outcome !== 'success' || !invocationResult.response) {
      // Log failure + return user-facing error
      await logInvocation(supabase, {
        result: invocationResult,
        agentId: agent.id,
        challengeId,
        entryId: entry.id,
        endpointUrl,
        environment,
      })

      const userMessage = OUTCOME_MESSAGES[invocationResult.outcome] ?? 'Invocation failed. Please try again.'

      return NextResponse.json(
        {
          error: userMessage,
          outcome: invocationResult.outcome,
          latency_ms: invocationResult.latencyMs ?? null,
        },
        { status: 422 }
      )
    }

    const { response } = invocationResult
    const submittedAt = new Date().toISOString()

    // ── 10. Validate content via shared submission validator ──
    const validation = await validateSubmission(supabase, {
      challenge_id: challengeId,
      agent_id: agent.id,
      content: response.content,
      session_id: resolvedSessionId ?? undefined,
    })

    if (!validation.valid) {
      await logInvocation(supabase, {
        result: { ...invocationResult, outcome: 'invalid_response', errorMessage: validation.rejection_reason ?? 'Submission validation failed' },
        agentId: agent.id,
        challengeId,
        entryId: entry.id,
        endpointUrl,
        environment,
      })
      return NextResponse.json(
        { error: validation.rejection_reason ?? 'Submission validation failed', outcome: 'invalid_response' },
        { status: 400 }
      )
    }

    // ── 11. Capture version snapshot ──
    const version_snapshot = await captureVersionSnapshot(supabase, challengeId)

    // ── 12. Insert submission ──
    const { data: submission, error: submitError } = await supabase
      .from('submissions')
      .insert({
        entry_id: entry.id,
        challenge_id: challengeId,
        agent_id: agent.id,
        user_id: user.id,
        content: response.content,
        submitted_at: submittedAt,
        submission_status: 'received',
        submission_source: 'remote_invocation',
        ...(resolvedSessionId ? { session_id: resolvedSessionId } : {}),
      })
      .select('id, submitted_at')
      .single()

    if (submitError || !submission) {
      await logInvocation(supabase, {
        result: invocationResult,
        agentId: agent.id,
        challengeId,
        entryId: entry.id,
        endpointUrl,
        environment,
      })
      return NextResponse.json({ error: 'Failed to record submission. Please try again.' }, { status: 500 })
    }

    submissionId = submission.id

    // ── 13. Log invocation with submission_id linked ──
    await logInvocation(supabase, {
      result: invocationResult,
      agentId: agent.id,
      challengeId,
      entryId: entry.id,
      endpointUrl,
      environment,
      submissionId,
    })

    // ── 14. Log received event ──
    await logSubmissionEvent(supabase, submission.id, 'received')

    // ── 15. Store immutable artifact ──
    const { content_hash } = await storeArtifact(supabase, {
      submission_id: submission.id,
      content: response.content,
      artifact_type: 'solution',
      version_snapshot,
    })

    await supabase
      .from('submissions')
      .update({ artifact_hash: content_hash })
      .eq('id', submission.id)

    // ── 16. Update entry status → submitted ──
    await supabase
      .from('challenge_entries')
      .update({
        status: 'submitted',
        submitted_at: submittedAt,
        submission_text: response.content,
      })
      .eq('id', entry.id)

    // ── 17. Close session ──
    if (resolvedSessionId) {
      await supabase
        .from('challenge_sessions')
        .update({ status: 'submitted', closed_at: submittedAt })
        .eq('id', resolvedSessionId)
    }

    // ── 18. Enqueue judging job ──
    const { error: enqueueError } = await supabase.rpc('enqueue_judging_job', {
      p_submission_id: submission.id,
      p_challenge_id: challengeId,
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

    // ── 19. Analytics ──
    logEvent({
      event_type: 'submission_received',
      auth: null,
      request,
      challenge_id: challengeId,
      submission_id: submission.id,
      metadata: {
        access_mode: 'remote_invocation',
        agent_id: agent.id,
        latency_ms: invocationResult.latencyMs,
        environment,
      },
    })

    return NextResponse.json(
      {
        submission_id: submission.id,
        submitted_at: submission.submitted_at,
        status: enqueueError ? 'received' : 'queued',
        latency_ms: invocationResult.latencyMs,
      },
      { status: 201 }
    )
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
