/**
 * GET  /api/v1/webhooks  — list subscriptions
 * POST /api/v1/webhooks  — create subscription
 *
 * Scope: webhook:manage
 */

import { createHash } from 'crypto'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireScope } from '@/lib/auth/token-auth'
import { applyRateLimit } from '@/lib/utils/rate-limit-policy'
import { v1Success, v1Error } from '@/lib/api/response-helpers'
import { logEvent } from '@/lib/analytics/log-event'

const VALID_EVENTS = [
  'result.finalized',
  'submission.completed',
  'submission.received',
  'submission.queued',
  'submission.failed',
  'challenge.started',
  'challenge.ended',
] as const

const createWebhookSchema = z.object({
  url: z.string().url('Must be a valid URL').max(2048),
  events: z.array(z.string()).min(1).max(20),
  secret: z.string().min(8).max(256),
})

export async function GET(request: Request): Promise<Response> {
  let auth
  try {
    auth = await requireScope(request, 'webhook:manage')
  } catch (err) {
    const e = err as Error & { status?: number }
    return v1Error(e.message, 'UNAUTHORIZED', e.status ?? 401)
  }

  const supabase = createAdminClient()

  const { data: subscriptions, error } = await supabase
    .from('webhook_subscriptions')
    .select('id, url, events, secret_prefix, active, failure_count, last_delivery_at, last_failure_at, created_at')
    .eq('user_id', auth.user_id)
    .order('created_at', { ascending: false })

  if (error) {
    return v1Error('Failed to fetch webhooks', 'DB_ERROR', 500)
  }

  return v1Success(subscriptions ?? [])
}

export async function POST(request: Request): Promise<Response> {
  let auth
  try {
    auth = await requireScope(request, 'webhook:manage')
  } catch (err) {
    const e = err as Error & { status?: number }
    return v1Error(e.message, 'UNAUTHORIZED', e.status ?? 401)
  }

  const rl = await applyRateLimit('webhook:manage', auth.user_id)
  if (!rl.success) {
    return v1Error('Rate limit exceeded — max 20 webhook operations per hour', 'RATE_LIMITED', 429)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return v1Error('Invalid JSON body', 'INVALID_JSON', 400)
  }

  const parsed = createWebhookSchema.safeParse(body)
  if (!parsed.success) {
    return v1Error(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
  }

  const { url, events, secret } = parsed.data

  // Validate event types
  const validEventSet = new Set<string>(VALID_EVENTS)
  for (const event of events) {
    if (!validEventSet.has(event)) {
      return v1Error(`Unknown event type: "${event}"`, 'INVALID_EVENT', 400)
    }
  }

  const secretHash = createHash('sha256').update(secret).digest('hex')
  const secretPrefix = secret.slice(0, 8)

  const supabase = createAdminClient()

  const { data: subscription, error: insertError } = await supabase
    .from('webhook_subscriptions')
    .insert({
      user_id: auth.user_id,
      url,
      events,
      secret_hash: secretHash,
      secret_prefix: secretPrefix,
      active: true,
    })
    .select('id, url, events, secret_prefix, active, created_at')
    .single()

  if (insertError || !subscription) {
    return v1Error('Failed to create webhook subscription', 'DB_ERROR', 500)
  }

  logEvent({ event_type: 'webhook_created', auth, request })

  return v1Success(subscription, { status: 201 })
}
