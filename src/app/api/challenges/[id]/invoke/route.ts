/**
 * POST /api/challenges/[id]/invoke
 *
 * Remote Agent Invocation (RAI) trigger.
 *
 * Flow:
 *   1. Validate user has open workspace session
 *   2. Load agent endpoint config
 *   3. Call invokeAgent() → signed HTTPS request → validated response
 *   4. Write submission artifact with provenance metadata
 *   5. Enqueue into existing judging pipeline (same path as connector/web-submit)
 *   6. Return submission_id → client polls /submissions/[id]/status
 *
 * NO duplicate judging logic. NO side-channel score path.
 * submission_source = 'remote_invocation'
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/get-user'
import { rateLimit } from '@/lib/utils/rate-limit'
import { invokeAgent, logInvocation } from '@/lib/rai/invoke-agent'
import { isPrivateIp, validateEndpointUrl } from '@/lib/rai/ip-guard'

const idSchema = z.string().uuid('Invalid challenge ID')

function jsonError(msg: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: msg, ...extra }, { status })
}

export const maxDuration = 130 // slightly above max timeout

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id: rawId } = await params
    const parsed = idSchema.safeParse(rawId)
    if (!parsed.success) return jsonError('Invalid challenge ID', 400)
    const challengeId = parsed.data

    // Rate limit: 3 invocations per 5 minutes per user (abuse protection)
    const { success: rl } = await rateLimit(`rai:invoke:${user.id}`, 3, 5 * 60_000)
    if (!rl) return jsonError('Rate limited — max 3 invocations per 5 minutes', 429)

    const body = await req.json().catch(() => ({})) as { environment?: string }
    const environment: 'production' | 'sandbox' = body.environment === 'sandbox' ? 'sandbox' : 'production'

    const supabase = createAdminClient()

    // ─── 1. Load challenge ───
    const { data: challengeRaw } = await supabase
      .from('challenges')
      .select('id, title, status, ends_at, prompt, description, remote_invocation_supported, time_limit_minutes, format, weight_class_id')
      .eq('id', challengeId)
      .single()

    if (!challengeRaw) return jsonError('Challenge not found', 404)
    const ch = challengeRaw as Record<string, unknown>
    if (ch.status !== 'active') return jsonError('Challenge is not active', 400)
    // P2 fix: enforce ends_at as hard deadline in addition to status check.
    // This aligns code with docs ("must submit before the challenge window closes").
    // Normally status and ends_at are kept in sync by admin at close.
    // This guard catches the edge case where ends_at has passed but status wasn't updated.
    if (ch.ends_at && new Date(ch.ends_at as string) < new Date()) {
      return jsonError('Challenge window has closed — submissions are no longer accepted', 400)
    }
    if (ch.remote_invocation_supported === false) {
      return jsonError('This challenge does not support Remote Agent Invocation', 400)
    }

    // ─── 2. Load agent + endpoint config ───
    const { data: agents } = await supabase
      .from('agents')
      .select(`
        id, name,
        remote_endpoint_url, remote_endpoint_timeout_ms, remote_endpoint_max_retries,
        sandbox_endpoint_url
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)

    const agent = agents?.[0] ?? null
    if (!agent) return jsonError('No agent registered', 400)

    const a = agent as Record<string, unknown>
    const endpointUrl = environment === 'sandbox'
      ? ((a.sandbox_endpoint_url as string | null) ?? (a.remote_endpoint_url as string | null))
      : (a.remote_endpoint_url as string | null)

    if (!endpointUrl) {
      return jsonError(
        'No endpoint configured for this agent. Go to Settings → Endpoint to configure.',
        400,
        { configure_url: '/settings?tab=agent', outcome: 'not_configured' }
      )
    }

    // P1 FIX: SSRF protection at invocation time — synchronous format check first
    const urlCheck = validateEndpointUrl(endpointUrl)
    if (!urlCheck.valid) {
      return jsonError(`Endpoint blocked: ${urlCheck.reason}`, 400, { outcome: 'blocked' })
    }

    // DNS-level check: resolves hostname and checks all returned IPs (DNS rebinding protection)
    try {
      const hostname = new URL(endpointUrl).hostname
      const isPrivate = await isPrivateIp(hostname)
      if (isPrivate) {
        return jsonError('Endpoint resolves to a private/reserved IP address and cannot be invoked', 400, { outcome: 'blocked_ssrf' })
      }
    } catch {
      // URL parse failure already caught by validateEndpointUrl above
    }

    // ─── 3. Load entry + session ───
    const { data: entry } = await supabase
      .from('challenge_entries')
      .select('id, status, session_id')
      .eq('challenge_id', challengeId)
      .eq('agent_id', agent.id)
      .maybeSingle()

    if (!entry) return jsonError('You have not entered this challenge', 403)

    const e = entry as Record<string, unknown>
    const terminalStatuses = ['submitted', 'judged', 'scored', 'failed', 'expired']
    if (terminalStatuses.includes(e.status as string)) {
      return jsonError('This entry has already been submitted or has expired', 409, { outcome: 'already_submitted' })
    }

    // Verify session is open + not expired
    if (e.session_id) {
      const { data: sess } = await supabase
        .from('challenge_sessions')
        .select('id, status, expires_at')
        .eq('id', e.session_id as string)
        .single()

      const s = sess as Record<string, unknown> | null
      if (!s || s.status === 'expired' || (s.expires_at && new Date(s.expires_at as string) < new Date())) {
        return jsonError('Session has expired', 409, { outcome: 'session_expired' })
      }
    }

    // Idempotency: if a RAI submission already exists for this session, return it
    if (e.session_id) {
      const { data: existingSubs } = await supabase
        .from('submissions')
        .select('id, status')
        .eq('session_id', e.session_id as string)
        .eq('submission_source', 'remote_invocation')
        .order('created_at', { ascending: false })
        .limit(1)

      const existingSub = (existingSubs as Record<string, unknown>[] | null)?.[0]
      if (existingSub) {
        return NextResponse.json({
          submission_id: existingSub.id,
          outcome: 'duplicate',
          message: 'A Remote Agent Invocation submission already exists for this session.',
        }, { status: 409 })
      }
    }

    // ─── 4. Invoke agent ───
    const timeLimitMinutes = (ch.time_limit_minutes as number | null)
    const timeLimitSeconds = timeLimitMinutes ? timeLimitMinutes * 60 : null

    // Session deadline: if session has expires_at use it, else null
    let submissionDeadlineUtc = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h fallback
    if (e.session_id) {
      const { data: sessionForDeadline } = await supabase
        .from('challenge_sessions')
        .select('expires_at')
        .eq('id', e.session_id as string)
        .single()
      if ((sessionForDeadline as Record<string, unknown> | null)?.expires_at) {
        submissionDeadlineUtc = (sessionForDeadline as Record<string, unknown>).expires_at as string
      }
    }

    const result = await invokeAgent(
      supabase,
      agent.id as string,
      {
        endpointUrl,
        timeoutMs: (a.remote_endpoint_timeout_ms as number | null) ?? 30_000,
        // Default 0 retries — explicit safety. Only a pure TCP connection
        // failure (no HTTP response) may retry once if max_retries=1.
        // Everything else is terminal on first attempt.
        maxRetries: 0,
        environment,
      },
      {
        challengeId,
        sessionId: (e.session_id as string | null) ?? challengeId,
        entryId: e.id as string,
        agentId: agent.id as string,
        challenge: {
          title: ch.title as string,
          prompt: (ch.prompt as string | null) ?? (ch.description as string | null),
          format: (ch.format as string | null) ?? 'standard',
          weightClass: (ch.weight_class_id as string | null) ?? 'middleweight',
          timeLimitSeconds,
          expectedOutputFormat: 'text',
        },
        submissionDeadlineUtc,
        idempotencyKey: `${challengeId}:${e.id}:${Date.now()}`,
        environment,
      }
    )

    // ─── 5. Handle failure ───
    if (result.outcome !== 'success' || !result.response) {
      // Log failed invocation (non-fatal if table missing)
      try {
        await logInvocation(supabase, {
          result,
          agentId: agent.id as string,
          challengeId,
          entryId: e.id as string,
          endpointUrl,
          environment,
        })
      } catch { /* non-fatal */ }

      const outcomeToStatus: Record<string, number> = {
        timeout: 504,
        error: 502,
        invalid_response: 422,
        content_too_large: 413,
      }
      // Entry is NOT consumed on invocation failure — user may retry
      return jsonError(result.errorMessage ?? 'Invocation failed', outcomeToStatus[result.outcome] ?? 502, {
        outcome: result.outcome,
        latency_ms: result.latencyMs,
        invocation_id: result.invocationId,
        entry_consumed: false,
        retry_allowed: result.outcome === 'timeout' || result.outcome === 'error',
      })
    }

    // ─── 6. Log successful invocation ───
    try {
      await logInvocation(supabase, {
        result,
        agentId: agent.id as string,
        challengeId,
        entryId: e.id as string,
        endpointUrl,
        environment,
      })
    } catch { /* non-fatal */ }

    // ─── 7. Build provenance metadata ───
    const endpointHost = (() => { try { return new URL(endpointUrl).hostname } catch { return 'unknown' } })()
    const provenanceMetadata = {
      submission_source: 'remote_invocation',
      invocation_id: result.invocationId,
      endpoint_host: endpointHost,
      endpoint_environment: environment,
      request_sent_at: result.requestSentAt.toISOString(),
      response_received_at: result.responseReceivedAt?.toISOString() ?? null,
      response_latency_ms: result.latencyMs ?? null,
      response_content_hash: result.response.contentHash,
      schema_valid: true,
      response_http_status: result.statusCode,
    }

    // ─── 8. Write submission ───
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .insert({
        challenge_id: challengeId,
        agent_id: agent.id,
        session_id: (e.session_id as string | null) ?? null,
        entry_id: e.id,
        content: result.response.content,
        submission_source: 'remote_invocation',
        status: 'pending',
        metadata: provenanceMetadata,
      })
      .select('id')
      .single()

    // ── ONE-SHOT SEMANTICS ──
    // An entry is only "consumed" when:
    //   1. submission row is written (content + provenance), AND
    //   2. enqueue_judging_job() succeeds (or cron picks it up)
    //
    // Failures that do NOT burn the entry:
    //   - endpoint timeout      → entry stays open, user can retry
    //   - endpoint invalid resp → entry stays open, user fixes endpoint and retries
    //   - content_too_large     → entry stays open
    //   - submission INSERT fails (platform error) → entry stays open
    //
    // Failure that DOES burn the entry:
    //   - submission written + enqueue failed (cron will recover) → entry consumed,
    //     submission_id returned so user can track status
    //
    // Entry status is updated to 'submitted' only after submission row is confirmed.

    if (subError || !submission) {
      // Platform-side failure — entry NOT consumed. User can retry.
      return jsonError('Failed to record submission — your entry has not been consumed. Please try again.', 500, {
        outcome: 'platform_error',
        invocation_id: result.invocationId,
        entry_consumed: false,
      })
    }

    const submissionId = (submission as Record<string, unknown>).id as string

    // ─── 9. Load version snapshot + enqueue judging ───
    let versionSnapshot: Record<string, unknown> = {}
    if (e.session_id) {
      const { data: sess } = await supabase
        .from('challenge_sessions')
        .select('version_snapshot')
        .eq('id', e.session_id as string)
        .single()
      if (sess) versionSnapshot = (sess as Record<string, unknown>).version_snapshot as Record<string, unknown> ?? {}
    }

    let enqueueError: unknown = null
    try {
      await supabase.rpc('enqueue_judging_job', {
        p_submission_id: submissionId,
        p_challenge_id: challengeId,
        p_agent_id: agent.id,
        p_version_snapshot: versionSnapshot,
      })
    } catch (err) {
      enqueueError = err
      // Non-fatal: cron (every 2min) will pick up pending submissions without jobs
    }

    // Update entry → submitted (entry is now consumed — submission row exists)
    await supabase
      .from('challenge_entries')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', e.id)

    return NextResponse.json({
      submission_id: submissionId,
      outcome: 'accepted',
      invocation_id: result.invocationId,
      latency_ms: result.latencyMs,
      entry_consumed: true,
      enqueue_note: enqueueError ? 'Queued via cron fallback — judging will begin within 2 minutes.' : undefined,
      message: 'Submission accepted and queued for judging.',
    })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return jsonError('Unauthorized', 401)
    return jsonError('Internal server error', 500)
  }
}
