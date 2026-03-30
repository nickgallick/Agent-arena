/**
 * POST /api/v1/agents/[id]/endpoint/validate
 *
 * Contract validation — sends a real signed test invocation to the endpoint
 * using a synthetic challenge payload. Validates:
 *   1. Endpoint is reachable (network)
 *   2. Request signing works (HMAC-SHA256 headers sent)
 *   3. Endpoint can parse the request body
 *   4. Response matches required schema { content: string }
 *   5. Response is within size limits
 *
 * This is NOT a judged submission. No entry, no session, no queue.
 * The synthetic payload is clearly marked environment=validate.
 * Returns a detailed report of exactly what passed and what failed.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/get-user'
import { rateLimit } from '@/lib/utils/rate-limit'
import { signRequest } from '@/lib/rai/sign-request'
import { getEndpointSecret } from '@/lib/rai/secret-manager'
import { v1Success, v1Error } from '@/lib/api/response-helpers'
import crypto from 'crypto'

const MAX_RESPONSE_BYTES = 100 * 1024
const VALIDATE_TIMEOUT_MS = 15_000

type ValidationStep =
  | 'reachability'
  | 'signing'
  | 'request_parse'
  | 'response_schema'
  | 'response_size'

interface StepResult {
  passed: boolean
  detail: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id: agentId } = await params

    if (!z.string().uuid().safeParse(agentId).success) return v1Error('Invalid agent ID', 'ERROR', 400)

    const { success: rl } = await rateLimit(`endpoint:validate:${user.id}`, 5, 60_000)
    if (!rl) return v1Error('Rate limited — max 5 validations/min', 'ERROR', 429)

    const body = await req.json().catch(() => ({})) as { environment?: string }
    const environment: 'production' | 'sandbox' = body.environment === 'sandbox' ? 'sandbox' : 'production'

    const supabase = createAdminClient()

    // Verify ownership
    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, user_id, remote_endpoint_url, sandbox_endpoint_url')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single()

    if (error || !agent) return v1Error('Agent not found', 'ERROR', 404)

    const a = agent as Record<string, unknown>
    const endpointUrl = environment === 'sandbox'
      ? ((a.sandbox_endpoint_url as string | null) ?? (a.remote_endpoint_url as string | null))
      : (a.remote_endpoint_url as string | null)

    if (!endpointUrl) return v1Error('No endpoint configured for this environment', 'ERROR', 400)

    // Get secret for signing
    const secret = await getEndpointSecret(supabase, agentId, environment).catch(() => null)
    if (!secret) return v1Error('No signing secret found — reconfigure your endpoint to generate one', 'ERROR', 400)

    // Build synthetic test payload
    const invocationId = crypto.randomUUID()
    const testPayload = JSON.stringify({
      invocation_id: invocationId,
      timestamp: Date.now(),
      challenge: {
        challenge_id: '00000000-0000-0000-0000-000000000000',
        session_id: '00000000-0000-0000-0000-000000000000',
        entry_id: '00000000-0000-0000-0000-000000000000',
        agent_id: agentId,
        title: '[Bouts Validation Test]',
        prompt: 'This is a synthetic validation request from Bouts. Respond with { "content": "validation ok" } to confirm your endpoint is working correctly.',
        format: 'standard',
        time_limit_seconds: null,
        expected_output_format: 'text',
        submission_deadline_utc: new Date(Date.now() + 3600_000).toISOString(),
      },
      environment: 'validate',
    })

    // Sign the request
    const signedHeaders = signRequest({
      method: 'POST',
      url: endpointUrl,
      body: testPayload,
      secret,
      environment,
      idempotencyKey: `validate:${agentId}:${invocationId}`,
    })

    const steps: Record<ValidationStep, StepResult> = {
      reachability: { passed: false, detail: 'Not tested' },
      signing: { passed: true, detail: 'HMAC-SHA256 signature generated and attached' },
      request_parse: { passed: false, detail: 'No response received' },
      response_schema: { passed: false, detail: 'No response to validate' },
      response_size: { passed: false, detail: 'No response to check' },
    }

    let overallPassed = false
    let httpStatus: number | null = null
    let latencyMs: number | null = null
    let rawResponsePreview: string | null = null

    const start = Date.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), VALIDATE_TIMEOUT_MS)

      const response = await fetch(endpointUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          ...signedHeaders,
          'Content-Type': 'application/json',
          'X-Bouts-Validation': '1',
        },
        body: testPayload,
      })

      clearTimeout(timeoutId)
      latencyMs = Date.now() - start
      httpStatus = response.status

      steps.reachability = {
        passed: true,
        detail: `Endpoint responded with HTTP ${response.status} in ${latencyMs}ms`,
      }

      // Read body
      const buffer = await response.arrayBuffer()
      const bodyText = new TextDecoder().decode(buffer)
      rawResponsePreview = bodyText.slice(0, 500)

      if (buffer.byteLength > MAX_RESPONSE_BYTES) {
        steps.response_size = {
          passed: false,
          detail: `Response is ${buffer.byteLength} bytes — exceeds 100KB limit`,
        }
        steps.request_parse = { passed: true, detail: 'Response received (but oversized)' }
        steps.response_schema = { passed: false, detail: 'Not validated — response too large' }
      } else {
        steps.response_size = {
          passed: true,
          detail: `Response is ${buffer.byteLength} bytes (within 100KB limit)`,
        }

        // Try parsing JSON
        let parsed: unknown
        try {
          parsed = JSON.parse(bodyText)
          steps.request_parse = { passed: true, detail: 'Response is valid JSON' }
        } catch {
          steps.request_parse = {
            passed: false,
            detail: `Response is not valid JSON. Got: ${bodyText.slice(0, 100)}`,
          }
        }

        if (parsed !== undefined) {
          // Validate schema
          const schemaResult = z.object({
            content: z.string().min(1).max(100_000),
            metadata: z.record(z.string(), z.unknown()).optional(),
          }).safeParse(parsed)

          if (schemaResult.success) {
            steps.response_schema = {
              passed: true,
              detail: `Response has valid content field (${schemaResult.data.content.length} chars)`,
            }
            overallPassed = true
          } else {
            const errs = schemaResult.error.flatten().fieldErrors
            const msg = Object.entries(errs).map(([k, v]) => `${k}: ${v?.[0]}`).join(', ')
            steps.response_schema = {
              passed: false,
              detail: `Schema validation failed — ${msg}. Expected: { content: string }`,
            }
          }
        }
      }
    } catch (err) {
      const e = err as Error
      latencyMs = Date.now() - start
      const isTimeout = e.name === 'AbortError'
      steps.reachability = {
        passed: false,
        detail: isTimeout
          ? `Endpoint did not respond within ${VALIDATE_TIMEOUT_MS / 1000}s`
          : `Network error: ${e.message.slice(0, 100)}`,
      }
    }

    const passCount = Object.values(steps).filter(s => s.passed).length
    const totalSteps = Object.keys(steps).length

    return v1Success({
      overall: overallPassed,
      steps_passed: passCount,
      steps_total: totalSteps,
      latency_ms: latencyMs,
      http_status: httpStatus,
      environment,
      endpoint_host: (() => { try { return new URL(endpointUrl).hostname } catch { return 'unknown' } })(),
      steps,
      response_preview: rawResponsePreview,
      note: overallPassed
        ? 'Endpoint is ready for Remote Agent Invocation.'
        : 'Fix the failing steps before entering a challenge with this endpoint.',
    })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return v1Error('Unauthorized', 'ERROR', 401)
    return v1Error('Internal server error', 'ERROR', 500)
  }
}
