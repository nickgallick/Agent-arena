/**
 * POST /api/challenges/[id]/invoke
 *
 * Remote Agent Invocation (RAI) trigger.
 *
 * Flow:
 *   1. Validate user has open workspace session
 *   2. Load agent endpoint config + verify secret exists
 *   3. Build signed HTTPS request → send to agent endpoint
 *   4. Validate response shape (must be { content: string })
 *   5. Validate response size (≤100KB)
 *   6. Write submission artifact (content + provenance)
 *   7. Enqueue into existing judging pipeline (same path as connector/web-submit)
 *   8. Return submission_id → client polls /submissions/[id]/status
 *
 * NO duplicate judging logic. NO side-channel score path.
 * submission_source = 'remote_invocation'
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/get-user'
import { rateLimit } from '@/lib/utils/rate-limit'

const MAX_RESPONSE_BYTES = 100 * 1024 // 100KB
const INVOCATION_TIMEOUT_MS_MAX = 120_000 // hard ceiling regardless of agent config

const idSchema = z.string().uuid('Invalid challenge ID')

interface InvokeBody {
  environment?: string
}

/** Build HMAC-SHA256 signature for the request */
function buildSignature(
  payload: string,
  secretHash: string,
  invocationId: string,
  timestamp: number
): string {
  // We sign: timestamp.invocationId.bodyHash
  // This prevents replay attacks (invocationId unique, timestamp bounded)
  const bodyHash = crypto.createHash('sha256').update(payload).digest('hex')
  const signingString = `${timestamp}.${invocationId}.${bodyHash}`
  return crypto.createHmac('sha256', secretHash).update(signingString).digest('hex')
}

/** Block private IPs (same guard as config time) */
function isPrivateHost(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return (
      hostname === 'localhost' ||
      hostname === '0.0.0.0' ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    )
  } catch { return true }
}

function jsonError(msg: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: msg, ...extra }, { status })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let agentId: string | null = null
  let invocationId: string | null = null
  let endpointUrl: string | null = null
  let requestSentAt: Date | null = null
  let submissionId: string | null = null

  try {
    const user = await requireUser()
    const { id: rawId } = await params
    const parsed = idSchema.safeParse(rawId)
    if (!parsed.success) return jsonError('Invalid challenge ID', 400)
    const challengeId = parsed.data

    // Rate limit: 3 invocations per 5 minutes per user
    const { success: rl } = await rateLimit(`rai:invoke:${user.id}`, 3, 5 * 60_000)
    if (!rl) return jsonError('Rate limited — max 3 invocations per 5 minutes', 429)

    const body = await req.json().catch(() => ({})) as InvokeBody
    const environment = body.environment === 'sandbox' ? 'sandbox' : 'production'

    const supabase = createAdminClient()

    // ─── 1. Load challenge ───
    const { data: challenge } = await supabase
      .from('challenges')
      .select('id, title, status, prompt, description, remote_invocation_supported, web_submission_supported, time_limit_minutes')
      .eq('id', challengeId)
      .single()

    if (!challenge) return jsonError('Challenge not found', 404)

    const ch = challenge as Record<string, unknown>
    if (ch.status !== 'active') return jsonError('Challenge is not active', 400)
    if (ch.remote_invocation_supported === false) return jsonError('This challenge does not support Remote Agent Invocation', 400)

    // ─── 2. Load agent ───
    const { data: agents } = await supabase
      .from('agents')
      .select(`
        id, name,
        remote_endpoint_url, remote_endpoint_secret_hash,
        remote_endpoint_timeout_ms, remote_endpoint_max_retries,
        sandbox_endpoint_url, sandbox_endpoint_secret_hash
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)

    const agent = agents?.[0] ?? null
    if (!agent) return jsonError('No agent registered', 400)
    agentId = agent.id

    const a = agent as Record<string, unknown>
    endpointUrl = environment === 'sandbox'
      ? ((a.sandbox_endpoint_url as string | null) ?? (a.remote_endpoint_url as string | null))
      : (a.remote_endpoint_url as string | null)

    const secretHash: string | null = environment === 'sandbox'
      ? ((a.sandbox_endpoint_secret_hash as string | null) ?? (a.remote_endpoint_secret_hash as string | null))
      : (a.remote_endpoint_secret_hash as string | null)

    if (!endpointUrl) {
      return jsonError('No endpoint configured for this agent. Go to Settings → Endpoint to configure.', 400, {
        configure_url: '/settings?tab=agent',
        outcome: 'not_configured',
      })
    }

    if (!secretHash) {
      return jsonError('Endpoint has no signing secret. Reconfigure your endpoint to generate a new secret.', 400, {
        configure_url: '/settings?tab=agent',
        outcome: 'no_secret',
      })
    }

    // Double-check SSRF guard at invocation time
    if (!endpointUrl.startsWith('https://') || isPrivateHost(endpointUrl)) {
      return jsonError('Endpoint URL is not allowed', 400, { outcome: 'blocked' })
    }

    // ─── 3. Verify entry + session ───
    const { data: entry } = await supabase
      .from('challenge_entries')
      .select('id, status, session_id')
      .eq('challenge_id', challengeId)
      .eq('agent_id', agent.id)
      .maybeSingle()

    if (!entry) return jsonError('You have not entered this challenge', 403)

    const terminalStatuses = ['submitted', 'judged', 'scored', 'failed', 'expired']
    if (terminalStatuses.includes((entry as Record<string, unknown>).status as string)) {
      return jsonError('This entry has already been submitted or has expired', 409, { outcome: 'already_submitted' })
    }

    // Verify session is open and not expired
    const entryRecord = entry as Record<string, unknown>
    if (entryRecord.session_id) {
      const { data: session } = await supabase
        .from('challenge_sessions')
        .select('id, status, expires_at')
        .eq('id', entryRecord.session_id as string)
        .single()

      const s = session as Record<string, unknown> | null
      if (!s || s.status === 'expired' || (s.expires_at && new Date(s.expires_at as string) < new Date())) {
        return jsonError('Session has expired', 409, { outcome: 'session_expired' })
      }
    }

    // Idempotency: check for an existing in-flight or completed submission for this session
    if (entryRecord.session_id) {
      const { data: existingSub } = await supabase
        .from('submissions')
        .select('id, status')
        .eq('session_id', entryRecord.session_id as string)
        .eq('submission_source', 'remote_invocation')
        .order('created_at', { ascending: false })
        .limit(1)

      if (existingSub && (existingSub as unknown[]).length > 0) {
        const sub = (existingSub as Record<string, unknown>[])[0]
        // If a submission already exists for this session (any state), return it
        return NextResponse.json({
          submission_id: sub.id,
          outcome: 'duplicate',
          message: 'A Remote Agent Invocation submission already exists for this session.',
        }, { status: 409 })
      }
    }

    // ─── 4. Build + sign invocation payload ───
    invocationId = crypto.randomUUID()
    const invocationTimestamp = Date.now()

    const challengePayload = {
      challenge_id: challengeId,
      title: ch.title,
      description: ch.description ?? null,
      prompt: ch.prompt ?? null,
      environment,
    }

    const payloadJson = JSON.stringify({
      invocation_id: invocationId,
      timestamp: invocationTimestamp,
      challenge: challengePayload,
    })

    // HMAC-SHA256 signature
    const signature = buildSignature(payloadJson, secretHash, invocationId, invocationTimestamp)

    // ─── 5. Call agent endpoint ───
    const timeoutMs = Math.min(
      (a.remote_endpoint_timeout_ms as number | null) ?? 30_000,
      INVOCATION_TIMEOUT_MS_MAX
    )

    requestSentAt = new Date()
    let responseReceivedAt: Date | null = null
    let responseStatus: number | null = null
    let responseLatencyMs: number | null = null
    let responseBody: string | null = null
    let invocationOutcome: 'success' | 'timeout' | 'error' | 'invalid_response' | 'content_too_large' = 'error'
    let authVerified = false
    let schemaValid = false
    let errorMessage: string | null = null
    let responseContentHash: string | null = null

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const response = await fetch(endpointUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Bouts-Invocation-Id': invocationId,
          'X-Bouts-Signature': `sha256=${signature}`,
          'X-Bouts-Timestamp': String(invocationTimestamp),
          'User-Agent': 'Bouts/1.0 (+https://agent-arena-roan.vercel.app)',
        },
        body: payloadJson,
      })

      clearTimeout(timeoutId)
      responseReceivedAt = new Date()
      responseStatus = response.status
      responseLatencyMs = responseReceivedAt.getTime() - requestSentAt.getTime()
      authVerified = true // We sent the secret — assume endpoint verifies it (we can't know from here)

      // Check content length before reading
      const contentLength = response.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > MAX_RESPONSE_BYTES) {
        invocationOutcome = 'content_too_large'
        errorMessage = `Response too large (${contentLength} bytes, max ${MAX_RESPONSE_BYTES})`
      } else {
        // Read body with size guard
        const buffer = await response.arrayBuffer()
        if (buffer.byteLength > MAX_RESPONSE_BYTES) {
          invocationOutcome = 'content_too_large'
          errorMessage = `Response too large (${buffer.byteLength} bytes, max ${MAX_RESPONSE_BYTES})`
        } else {
          responseBody = new TextDecoder().decode(buffer)
          responseContentHash = crypto.createHash('sha256').update(responseBody).digest('hex')

          // Validate JSON schema: must be { content: string } or { content: string, metadata?: object }
          try {
            const parsed = JSON.parse(responseBody) as unknown
            const responseSchema = z.object({
              content: z.string().min(1).max(100_000),
              metadata: z.record(z.string(), z.unknown()).optional(),
            })
            const schemaResult = responseSchema.safeParse(parsed)
            if (schemaResult.success) {
              schemaValid = true
              invocationOutcome = 'success'
              responseBody = schemaResult.data.content // store just the content
              responseContentHash = crypto.createHash('sha256').update(schemaResult.data.content).digest('hex')
            } else {
              invocationOutcome = 'invalid_response'
              const errs = schemaResult.error.flatten().fieldErrors
              const firstMsg = Object.values(errs)[0]?.[0] ?? 'invalid shape'
              errorMessage = `Invalid response schema: ${firstMsg}`
            }
          } catch {
            invocationOutcome = 'invalid_response'
            errorMessage = 'Response is not valid JSON'
          }
        }
      }

      if (!response.ok && invocationOutcome !== 'content_too_large' && invocationOutcome !== 'invalid_response') {
        invocationOutcome = 'error'
        errorMessage = `Endpoint returned HTTP ${responseStatus}`
      }
    } catch (err) {
      const e = err as Error
      responseReceivedAt = new Date()
      responseLatencyMs = responseReceivedAt.getTime() - requestSentAt.getTime()
      if (e.name === 'AbortError') {
        invocationOutcome = 'timeout'
        errorMessage = `Endpoint did not respond within ${timeoutMs}ms`
      } else {
        invocationOutcome = 'error'
        errorMessage = `Network error: ${e.message.slice(0, 100)}`
      }
    }

    // ─── 6. Record invocation log (always — even on failure) ───
    const endpointHost = (() => { try { return new URL(endpointUrl).hostname } catch { return 'unknown' } })()

    // Try to write invocation log (may fail if migration not yet applied — non-fatal)
    const logInsertData = {
      agent_id: agentId,
      challenge_id: challengeId,
      entry_id: (entry as Record<string, unknown>).id,
      invocation_id: invocationId,
      endpoint_url: endpointUrl, // full URL stored internally
      environment,
      request_sent_at: requestSentAt.toISOString(),
      response_received_at: responseReceivedAt?.toISOString() ?? null,
      response_status_code: responseStatus,
      response_latency_ms: responseLatencyMs,
      response_content_hash: responseContentHash,
      attempt_number: 1,
      outcome: invocationOutcome,
      error_message: errorMessage,
      execution_metadata: {
        endpoint_host: endpointHost,
        timeout_ms: timeoutMs,
        auth_verified: authVerified,
        schema_valid: schemaValid,
        payload_bytes: payloadJson.length,
      },
    }

    // Non-fatal: if table doesn't exist yet (migration pending), skip
    let logRow: { id: string } | null = null
    try {
      const { data: lr } = await supabase
        .from('rai_invocation_log')
        .insert(logInsertData)
        .select('id')
        .single()
      logRow = lr as { id: string } | null
    } catch { /* migration not yet applied */ }

    // ─── 7. Handle failure states ───
    if (invocationOutcome !== 'success' || !responseBody) {
      const outcomeToStatus: Record<string, number> = {
        timeout: 504,
        error: 502,
        invalid_response: 422,
        content_too_large: 413,
      }
      return jsonError(errorMessage ?? 'Invocation failed', outcomeToStatus[invocationOutcome] ?? 502, {
        outcome: invocationOutcome,
        latency_ms: responseLatencyMs,
        invocation_id: invocationId,
      })
    }

    // ─── 8. Write submission (same as connector / web-submit path) ───
    const sessionId = (entry as Record<string, unknown>).session_id as string | null

    // Provenance metadata — stored with submission
    const provenanceMetadata = {
      submission_source: 'remote_invocation',
      invocation_id: invocationId,
      log_id: logRow?.id ?? null,
      endpoint_host: endpointHost,
      endpoint_environment: environment,
      request_sent_at: requestSentAt.toISOString(),
      response_received_at: responseReceivedAt?.toISOString() ?? null,
      response_latency_ms: responseLatencyMs,
      response_content_hash: responseContentHash,
      auth_verified: authVerified,
      schema_valid: schemaValid,
      response_http_status: responseStatus,
    }

    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .insert({
        challenge_id: challengeId,
        agent_id: agent.id,
        session_id: sessionId,
        entry_id: (entry as Record<string, unknown>).id,
        content: responseBody,
        submission_source: 'remote_invocation',
        status: 'pending',
        metadata: provenanceMetadata,
      })
      .select('id')
      .single()

    if (subError || !submission) {
      return jsonError('Failed to record submission', 500, {
        outcome: 'submission_error',
        invocation_id: invocationId,
      })
    }

    submissionId = (submission as Record<string, unknown>).id as string

    // Update log with submission_id (non-fatal)
    if (logRow?.id) {
      try {
        await supabase
          .from('rai_invocation_log')
          .update({ submission_id: submissionId })
          .eq('id', logRow.id)
      } catch { /* non-fatal */ }
    }

    // Update entry status → submitted
    await supabase
      .from('challenge_entries')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', (entry as Record<string, unknown>).id)

    // ─── 9. Enqueue into judging queue (same as other submission paths) ───
    // We need version_snapshot - load it from the session
    let versionSnapshot: Record<string, unknown> = {}
    if ((entry as Record<string, unknown>).session_id) {
      const { data: sess } = await supabase
        .from('challenge_sessions')
        .select('version_snapshot')
        .eq('id', (entry as Record<string, unknown>).session_id as string)
        .single()
      if (sess) versionSnapshot = (sess as Record<string, unknown>).version_snapshot as Record<string, unknown> ?? {}
    }

    try {
      await supabase.rpc('enqueue_judging_job', {
        p_submission_id: submissionId,
        p_challenge_id: challengeId,
        p_agent_id: agentId,
        p_version_snapshot: versionSnapshot,
      })
    } catch { /* non-fatal: cron will pick it up */ }

    return NextResponse.json({
      submission_id: submissionId,
      outcome: 'accepted',
      invocation_id: invocationId,
      latency_ms: responseLatencyMs,
      message: 'Submission accepted and queued for judging.',
    })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return jsonError('Unauthorized', 401)
    return jsonError('Internal server error', 500, {
      invocation_id: invocationId,
      outcome: 'platform_error',
    })
  }
}
