/**
 * POST /api/v1/sandbox/webhooks/test
 *
 * Fire a test webhook delivery for a given subscription.
 * Requires webhook:manage scope.
 *
 * Useful for testing webhook endpoints during integration development.
 */

import { z } from 'zod'
import { randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireScope } from '@/lib/auth/token-auth'
import { deliverWebhookEvent } from '@/lib/webhooks/deliver'
import { v1Success, v1Error } from '@/lib/api/response-helpers'

const KNOWN_EVENT_TYPES = [
  'result.finalized',
  'submission.completed',
  'submission.failed',
  'submission.created',
  'session.created',
  'session.expired',
] as const

const testWebhookSchema = z.object({
  subscription_id: z.string().uuid('Invalid subscription_id'),
  event_type: z.enum(KNOWN_EVENT_TYPES).default('result.finalized'),
})

export async function POST(request: Request): Promise<Response> {
  let auth
  try {
    auth = await requireScope(request, 'webhook:manage')
  } catch (err) {
    const e = err as Error & { status?: number }
    return v1Error(e.message, 'UNAUTHORIZED', e.status ?? 401)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return v1Error('Invalid JSON body', 'INVALID_JSON', 400)
  }

  const parsed = testWebhookSchema.safeParse(body)
  if (!parsed.success) {
    return v1Error(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
  }

  const { subscription_id, event_type } = parsed.data
  const supabase = createAdminClient()

  // Verify the subscription belongs to this user
  const { data: subscription, error: subError } = await supabase
    .from('webhook_subscriptions')
    .select('id, url, active, events, user_id')
    .eq('id', subscription_id)
    .maybeSingle()

  if (subError) {
    return v1Error('Failed to fetch subscription', 'DB_ERROR', 500)
  }

  if (!subscription) {
    return v1Error('Subscription not found', 'NOT_FOUND', 404)
  }

  if (subscription.user_id !== auth.user_id) {
    return v1Error('Forbidden — subscription does not belong to this user', 'FORBIDDEN', 403)
  }

  if (!subscription.active) {
    return v1Error('Subscription is inactive. Reactivate it before testing.', 'SUBSCRIPTION_INACTIVE', 400)
  }

  // Generate a sandbox test payload
  const deliveryId = randomUUID()
  const sandboxChallengeId = '69e80bf0-597d-4ce0-8c1c-563db9c246f2'
  const sandboxSubmissionId = randomUUID()

  const sampleData: Record<string, unknown> = {
    sandbox: true,
    test: true,
    delivery_id: deliveryId,
    triggered_at: new Date().toISOString(),
    user_id: auth.user_id,
    _sandbox: {
      synthetic: true,
      event_version: 1,
      generated_at: new Date().toISOString(),
      note: 'This is a synthetic test event. It does not represent real platform activity.',
    },
  }

  // Build event-type-specific sample payload
  if (event_type === 'result.finalized') {
    sampleData.submission_id = sandboxSubmissionId
    sampleData.challenge_id = sandboxChallengeId
    sampleData.final_score = 78.6
    sampleData.result_state = 'final'
    sampleData.confidence_level = 'high'
  } else if (event_type === 'submission.completed') {
    sampleData.submission_id = sandboxSubmissionId
    sampleData.submission_status = 'completed'
  } else if (event_type === 'submission.failed') {
    sampleData.submission_id = sandboxSubmissionId
    sampleData.submission_status = 'failed'
    sampleData.error = 'Sandbox test — no real error'
  } else if (event_type === 'submission.created') {
    sampleData.submission_id = sandboxSubmissionId
    sampleData.challenge_id = sandboxChallengeId
    sampleData.session_id = randomUUID()
  } else if (event_type === 'session.created') {
    sampleData.session_id = randomUUID()
    sampleData.challenge_id = sandboxChallengeId
  } else if (event_type === 'session.expired') {
    sampleData.session_id = randomUUID()
    sampleData.challenge_id = sandboxChallengeId
  }

  // Deliver the webhook
  let delivered = false
  let deliveryError: string | null = null

  try {
    await deliverWebhookEvent({
      event_type,
      data: sampleData,
      challenge_id: sandboxChallengeId,
      submission_id: sandboxSubmissionId,
    })
    delivered = true
  } catch (err) {
    deliveryError = err instanceof Error ? err.message : 'Unknown delivery error'
  }

  return v1Success({
    delivered,
    event_type,
    subscription_id,
    url: subscription.url,
    payload: sampleData,
    delivery_id: deliveryId,
    error: deliveryError,
    note: 'This was a test delivery. Check your webhook_deliveries table or your endpoint logs to verify receipt.',
  })
}
