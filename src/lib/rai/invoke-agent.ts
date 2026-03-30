/**
 * RAI Agent Invocation
 *
 * Executes a server-side HTTP request to the user's registered remote endpoint.
 * Handles signing, timeout, retry, response validation, and provenance logging.
 *
 * This is the core of the Remote Agent Invocation path.
 * It does NOT write to the judging queue — that happens in the API route after
 * a successful invocation.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { signRequest } from './sign-request'
import { generateNonce, claimNonce } from './nonce-store'
import { getEndpointSecret } from './secret-manager'
import { validateRaiResponse, ValidatedRaiResponse } from './validate-response'
import { randomUUID } from 'crypto'

const DEFAULT_TIMEOUT_MS = 30_000
const MAX_TIMEOUT_MS = 120_000
const RETRY_DELAY_MS = 2_000

export interface RaiChallengePayload {
  challengeId: string
  sessionId: string
  entryId: string
  agentId: string
  challenge: {
    title: string
    prompt: string | null
    format: string
    weightClass: string
    timeLimitSeconds: number | null
    expectedOutputFormat: 'text' | 'json' | 'code'
  }
  submissionDeadlineUtc: string
  environment: 'production' | 'sandbox'
  idempotencyKey: string
}

export type RaiOutcome =
  | 'success'
  | 'timeout'
  | 'error'
  | 'invalid_response'
  | 'content_too_large'

export interface RaiInvocationResult {
  outcome: RaiOutcome
  response?: ValidatedRaiResponse
  statusCode?: number
  latencyMs?: number
  errorMessage?: string
  invocationId: string
  requestSentAt: Date
  responseReceivedAt?: Date
}

interface AgentEndpointConfig {
  endpointUrl: string
  timeoutMs: number
  maxRetries: number
  environment: 'production' | 'sandbox'
}

export async function invokeAgent(
  supabase: SupabaseClient,
  agentId: string,
  endpointConfig: AgentEndpointConfig,
  payload: RaiChallengePayload
): Promise<RaiInvocationResult> {
  const { endpointUrl, timeoutMs: rawTimeout, maxRetries, environment } = endpointConfig

  const effectiveTimeout = Math.min(rawTimeout || DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS)
  const invocationId = randomUUID()
  const requestSentAt = new Date()

  // Retrieve plaintext secret for signing
  const secret = await getEndpointSecret(supabase, agentId, environment)
  if (!secret) {
    return {
      outcome: 'error',
      errorMessage: 'No endpoint secret configured — cannot sign request',
      invocationId,
      requestSentAt,
    }
  }

  // Build request body
  const body = JSON.stringify({
    schema_version: '1.0',
    invocation_id: invocationId,
    challenge_id: payload.challengeId,
    session_id: payload.sessionId,
    entry_id: payload.entryId,
    agent_id: payload.agentId,
    challenge: {
      title: payload.challenge.title,
      prompt: payload.challenge.prompt,
      format: payload.challenge.format,
      weight_class: payload.challenge.weightClass,
      time_limit_seconds: payload.challenge.timeLimitSeconds,
      expected_output_format: payload.challenge.expectedOutputFormat,
    },
    submission_deadline_utc: payload.submissionDeadlineUtc,
    environment: payload.environment,
    idempotency_key: payload.idempotencyKey,
  })

  // Attempt invocation with retries
  let lastResult: RaiInvocationResult | null = null
  const maxAttempts = maxRetries + 1

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Generate and claim a fresh nonce per attempt
    const nonce = generateNonce()
    const nonceClaimed = await claimNonce(supabase, nonce, agentId)
    if (!nonceClaimed) {
      // Extremely unlikely — retry with new nonce on next loop iteration
      continue
    }

    // Sign the request
    const headers = signRequest({
      method: 'POST',
      url: endpointUrl,
      body,
      secret,
      environment,
      idempotencyKey: payload.idempotencyKey,
    })

    // Execute with timeout
    const result = await executeWithTimeout(endpointUrl, body, headers, effectiveTimeout)

    lastResult = {
      ...result,
      invocationId,
      requestSentAt,
    }

    // Determine if we should retry
    if (result.outcome === 'success') break
    if (!isRetryable(result)) break
    if (attempt < maxAttempts) {
      await delay(RETRY_DELAY_MS)
    }
  }

  return lastResult ?? {
    outcome: 'error',
    errorMessage: 'No invocation attempts completed',
    invocationId,
    requestSentAt,
  }
}

async function executeWithTimeout(
  url: string,
  body: string,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<Omit<RaiInvocationResult, 'invocationId' | 'requestSentAt'>> {
  const start = Date.now()

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
      redirect: 'error', // fail closed on any redirect — SSRF protection
    })

    const responseReceivedAt = new Date()
    const latencyMs = Date.now() - start
    const statusCode = res.status

    if (!res.ok) {
      let errorMessage = `HTTP ${statusCode}`
      let retryable = false
      try {
        const errBody = await res.json() as { error?: string; retryable?: boolean }
        if (errBody.error) errorMessage = `HTTP ${statusCode}: ${sanitizeErrorMessage(errBody.error)}`
        if (typeof errBody.retryable === 'boolean') retryable = errBody.retryable
      } catch {
        // Ignore parse errors on error bodies
      }

      return {
        outcome: 'error',
        statusCode,
        latencyMs,
        errorMessage,
        responseReceivedAt,
      }
    }

    // Parse response body
    let rawBody: unknown
    try {
      rawBody = await res.json()
    } catch {
      return {
        outcome: 'invalid_response',
        statusCode,
        latencyMs,
        errorMessage: 'Response body is not valid JSON',
        responseReceivedAt,
      }
    }

    // Validate response shape
    const validation = validateRaiResponse(rawBody)
    if (!validation.valid) {
      const isSizeError = validation.reason.includes('exceeds 100KB')
      return {
        outcome: isSizeError ? 'content_too_large' : 'invalid_response',
        statusCode,
        latencyMs,
        errorMessage: validation.reason,
        responseReceivedAt,
      }
    }

    return {
      outcome: 'success',
      response: validation.data,
      statusCode,
      latencyMs,
      responseReceivedAt,
    }
  } catch (err) {
    const e = err as Error
    const isTimeout = e.name === 'AbortError' || e.message?.includes('abort')
    return {
      outcome: isTimeout ? 'timeout' : 'error',
      latencyMs: Date.now() - start,
      responseReceivedAt: new Date(),
      errorMessage: isTimeout
        ? `Endpoint did not respond within ${timeoutMs}ms`
        : sanitizeErrorMessage(e.message),
    }
  } finally {
    clearTimeout(timer)
  }
}

function isRetryable(result: Omit<RaiInvocationResult, 'invocationId' | 'requestSentAt'>): boolean {
  // NOTHING is retryable in production RAI.
  // Retry logic is disabled by defaulting maxRetries=0.
  // Even if maxRetries is somehow set >0, we only allow retry on a pure
  // TCP-level connection failure (no HTTP response at all, no status code).
  // This is the only case where no submission could have been created on the
  // remote side — so there is zero ambiguity about whether the agent ran.
  //
  // Non-retryable (terminal):
  //   timeout           — agent may have partially processed; no retry
  //   invalid_response  — response received but bad schema; fix endpoint
  //   content_too_large — response received but oversized; fix endpoint
  //   5xx               — agent received the request; state is ambiguous; no retry
  //   4xx               — agent rejected the request; no retry
  if (result.outcome === 'timeout') return false
  if (result.outcome === 'invalid_response') return false
  if (result.outcome === 'content_too_large') return false
  if (result.outcome === 'error') {
    // Only retry on pure TCP connection failure (no HTTP response at all)
    if (!result.statusCode) return true
    // Any HTTP status (including 5xx) = agent received the request = not retryable
    return false
  }
  return false
}

function sanitizeErrorMessage(msg: string): string {
  if (!msg) return 'Unknown error'
  // Strip stack traces and internal paths
  const firstLine = msg.split('\n')[0]
  return firstLine.slice(0, 200)
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Write provenance record to rai_invocation_log.
 * Called after every invocation attempt (success or failure).
 */
export async function logInvocation(
  supabase: SupabaseClient,
  params: {
    result: RaiInvocationResult
    agentId: string
    challengeId: string
    entryId: string
    endpointUrl: string
    environment: 'production' | 'sandbox'
    submissionId?: string
    attemptNumber?: number
  }
): Promise<void> {
  const { result, agentId, challengeId, entryId, endpointUrl, environment, submissionId, attemptNumber } = params

  await supabase.from('rai_invocation_log').insert({
    submission_id: submissionId ?? null,
    agent_id: agentId,
    challenge_id: challengeId,
    entry_id: entryId,
    invocation_id: result.invocationId,
    endpoint_url: endpointUrl,
    environment,
    request_sent_at: result.requestSentAt.toISOString(),
    response_received_at: result.responseReceivedAt?.toISOString() ?? null,
    response_status_code: result.statusCode ?? null,
    response_latency_ms: result.latencyMs ?? null,
    response_content_hash: result.response?.contentHash ?? null,
    execution_metadata: result.response?.executionMetadata ?? null,
    attempt_number: attemptNumber ?? 1,
    outcome: result.outcome,
    error_message: result.errorMessage ?? null,
  })
}
