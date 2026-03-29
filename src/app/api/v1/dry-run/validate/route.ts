/**
 * POST /api/v1/dry-run/validate
 *
 * Validates an API action without making any DB writes.
 * Designed for integration testing and pre-flight checks.
 *
 * mode: 'validation_only' — checks only (current)
 * mode: 'simulated'       — future: deterministic simulated execution
 */

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { optionalAuth, hasScope } from '@/lib/auth/token-auth'
import { enforceEnvironmentBoundary } from '@/lib/auth/sandbox-guard'
import { v1Success, v1Error } from '@/lib/api/response-helpers'
import { applyRateLimit, readCategory, rateLimitIdentity } from '@/lib/utils/rate-limit-policy'
import { logEvent } from '@/lib/analytics/log-event'

type CheckStatus = 'pass' | 'fail' | 'warn' | 'skipped'

interface Check {
  check: string
  status: CheckStatus
  detail?: string
}

const dryRunSchema = z.object({
  mode: z.enum(['validation_only', 'simulated']).default('validation_only'),
  action: z.enum(['session_create', 'submission_create', 'auth_check']),
  challenge_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
  agent_id: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  idempotency_key: z.string().optional(),
})

export async function POST(request: Request): Promise<Response> {
  const auth = await optionalAuth(request)

  // Rate limit
  const category = readCategory(auth)
  const identity = rateLimitIdentity(auth, request)
  const rl = await applyRateLimit(category, identity)
  if (!rl.success) {
    return v1Error('Rate limit exceeded', 'RATE_LIMITED', 429)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return v1Error('Invalid JSON body', 'INVALID_JSON', 400)
  }

  const parsed = dryRunSchema.safeParse(body)
  if (!parsed.success) {
    return v1Error(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
  }

  const { mode, action, challenge_id, session_id, agent_id, idempotency_key } = parsed.data

  // Simulated mode is not yet implemented
  if (mode === 'simulated') {
    return v1Error(
      'Simulated mode is not yet available. Use mode: "validation_only" for pre-flight validation. Simulated execution will be available in a future release.',
      'NOT_IMPLEMENTED',
      501
    )
  }

  const checks: Check[] = []
  const supabase = createAdminClient()

  // Helper to emit dry_run_validated event before returning
  function emitDryRunEvent(valid: boolean) {
    logEvent({ event_type: 'dry_run_validated', auth, request, metadata: { action, valid } })
  }

  // ─── AUTH CHECK ───────────────────────────────────────────────────────────
  if (action === 'auth_check') {
    if (!auth) {
      checks.push({ check: 'auth_present', status: 'fail', detail: 'No valid authorization token found. Include an Authorization: Bearer <token> header.' })
    } else {
      checks.push({ check: 'auth_present', status: 'pass', detail: `Authenticated as user ${auth.user_id} via ${auth.token_type}` })
      checks.push({ check: 'token_type', status: 'pass', detail: `Token type: ${auth.token_type}` })
      checks.push({ check: 'environment', status: 'pass', detail: `Token environment: ${auth.environment}` })
      checks.push({ check: 'scopes', status: 'pass', detail: `Scopes: ${auth.scopes.join(', ')}` })

      if (auth.token_type === 'api_token' && auth.environment === 'sandbox') {
        checks.push({ check: 'sandbox_mode', status: 'warn', detail: 'This is a sandbox token (bouts_sk_test_...). It can only access sandbox challenges.' })
      }
    }

    const valid = !checks.some(c => c.status === 'fail')
    emitDryRunEvent(valid)
    return v1Success({ mode, action, valid, checks })
  }

  // ─── SESSION CREATE ───────────────────────────────────────────────────────
  if (action === 'session_create') {
    // Auth check
    if (!auth) {
      checks.push({ check: 'auth_present', status: 'fail', detail: 'Authentication required for session creation.' })
    } else {
      checks.push({ check: 'auth_present', status: 'pass', detail: `Authenticated as ${auth.user_id}` })

      // Scope check
      if (!hasScope(auth, 'challenge:enter')) {
        checks.push({ check: 'scope_challenge_enter', status: 'fail', detail: 'Token missing required scope: challenge:enter' })
      } else {
        checks.push({ check: 'scope_challenge_enter', status: 'pass' })
      }

      // Challenge check
      if (!challenge_id) {
        checks.push({ check: 'challenge_id_present', status: 'fail', detail: 'challenge_id is required for session_create action.' })
      } else {
        checks.push({ check: 'challenge_id_present', status: 'pass' })

        const { data: challenge } = await supabase
          .from('challenges')
          .select('id, status, is_sandbox')
          .eq('id', challenge_id)
          .maybeSingle()

        if (!challenge) {
          checks.push({ check: 'challenge_exists', status: 'fail', detail: `Challenge ${challenge_id} not found.` })
        } else {
          checks.push({ check: 'challenge_exists', status: 'pass' })

          // Environment boundary
          const boundaryResponse = enforceEnvironmentBoundary(auth, challenge.is_sandbox ?? false)
          if (boundaryResponse) {
            checks.push({ check: 'environment_boundary', status: 'fail', detail: `Environment mismatch: token is ${auth.environment}, challenge is_sandbox=${challenge.is_sandbox}` })
          } else {
            checks.push({ check: 'environment_boundary', status: 'pass', detail: `Token and challenge environments match (${auth.environment})` })
          }

          // Challenge status
          if (challenge.status !== 'active') {
            checks.push({ check: 'challenge_active', status: 'fail', detail: `Challenge status is "${challenge.status}" — must be "active" to enter.` })
          } else {
            checks.push({ check: 'challenge_active', status: 'pass' })
          }
        }
      }

      // Agent check (optional)
      if (agent_id) {
        const { data: agentRow } = await supabase
          .from('agents')
          .select('id')
          .eq('id', agent_id)
          .eq('user_id', auth.user_id)
          .maybeSingle()

        if (!agentRow) {
          checks.push({ check: 'agent_belongs_to_user', status: 'fail', detail: `Agent ${agent_id} not found or does not belong to this user.` })
        } else {
          checks.push({ check: 'agent_belongs_to_user', status: 'pass' })
        }
      } else {
        checks.push({ check: 'agent_id_provided', status: 'warn', detail: 'No agent_id provided. The API will use the default agent for this user.' })
      }
    }

    const sessionValid = !checks.some(c => c.status === 'fail')
    emitDryRunEvent(sessionValid)
    return v1Success({ mode, action, valid: sessionValid, checks })
  }

  // ─── SUBMISSION CREATE ────────────────────────────────────────────────────
  if (action === 'submission_create') {
    // Auth check
    if (!auth) {
      checks.push({ check: 'auth_present', status: 'fail', detail: 'Authentication required for submission creation.' })
    } else {
      checks.push({ check: 'auth_present', status: 'pass', detail: `Authenticated as ${auth.user_id}` })

      // Scope check
      if (!hasScope(auth, 'submission:create')) {
        checks.push({ check: 'scope_submission_create', status: 'fail', detail: 'Token missing required scope: submission:create' })
      } else {
        checks.push({ check: 'scope_submission_create', status: 'pass' })
      }

      // Idempotency key check
      if (!idempotency_key) {
        checks.push({ check: 'idempotency_key_provided', status: 'warn', detail: 'No idempotency_key provided. This is strongly recommended to prevent duplicate submissions.' })
      } else if (idempotency_key.length < 8 || idempotency_key.length > 128) {
        checks.push({ check: 'idempotency_key_format', status: 'fail', detail: 'idempotency_key must be between 8 and 128 characters.' })
      } else {
        checks.push({ check: 'idempotency_key_format', status: 'pass' })
      }

      // Session check
      if (!session_id) {
        checks.push({ check: 'session_id_present', status: 'fail', detail: 'session_id is required for submission_create action.' })
      } else {
        checks.push({ check: 'session_id_present', status: 'pass' })

        const { data: sessionRow } = await supabase
          .from('challenge_sessions')
          .select('id, status, environment, agent_id')
          .eq('id', session_id)
          .maybeSingle()

        if (!sessionRow) {
          checks.push({ check: 'session_exists', status: 'fail', detail: `Session ${session_id} not found.` })
        } else {
          checks.push({ check: 'session_exists', status: 'pass' })

          if (sessionRow.status !== 'open') {
            checks.push({ check: 'session_open', status: 'fail', detail: `Session status is "${sessionRow.status}" — must be "open" to submit.` })
          } else {
            checks.push({ check: 'session_open', status: 'pass' })
          }

          // Session environment matches token
          const sessionEnv = (sessionRow.environment as string) ?? 'production'
          if (sessionEnv !== auth.environment) {
            checks.push({ check: 'session_environment_match', status: 'fail', detail: `Session environment "${sessionEnv}" does not match token environment "${auth.environment}".` })
          } else {
            checks.push({ check: 'session_environment_match', status: 'pass', detail: `Session and token environments match: ${auth.environment}` })
          }
        }
      }
    }

    const subValid = !checks.some(c => c.status === 'fail')
    emitDryRunEvent(subValid)
    return v1Success({ mode, action, valid: subValid, checks })
  }

  return v1Error('Unknown action', 'UNKNOWN_ACTION', 400)
}
