/**
 * Webhook delivery engine.
 * Delivers HTTP POSTs to subscriber URLs when events happen.
 * HMAC-signed, retry-safe, logs every attempt to webhook_deliveries.
 */

import { createHmac } from 'crypto'
import { randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export interface WebhookEvent {
  event_type: string
  data: Record<string, unknown>
  challenge_id?: string
  submission_id?: string
}

const RETRY_DELAYS_MS = [1_000, 5_000, 30_000]
const DELIVERY_TIMEOUT_MS = 10_000
const MAX_FAILURE_COUNT = 10

/**
 * Deliver a webhook event to all matching active subscriptions.
 * Fire-and-forget: this function never throws — all errors are logged.
 */
export async function deliverWebhookEvent(event: WebhookEvent): Promise<void> {
  const supabase = createAdminClient()

  // 1. Find active subscriptions that subscribe to this event type
  const { data: subscriptions, error } = await supabase
    .from('webhook_subscriptions')
    .select('id, url, secret_hash, events, user_id')
    .eq('active', true)
    .contains('events', [event.event_type])

  if (error || !subscriptions || subscriptions.length === 0) return

  // 2. Deliver to each subscription concurrently (no blocking)
  await Promise.allSettled(
    subscriptions.map(sub => deliverToSubscription(sub, event))
  )
}

async function deliverToSubscription(
  sub: {
    id: string
    url: string
    secret_hash: string
    events: string[]
    user_id: string
  },
  event: WebhookEvent
): Promise<void> {
  const supabase = createAdminClient()
  const deliveryId = randomUUID()
  const timestamp = new Date().toISOString()

  const payload = {
    id: deliveryId,
    event_type: event.event_type,
    timestamp,
    data: event.data,
    ...(event.challenge_id ? { challenge_id: event.challenge_id } : {}),
    ...(event.submission_id ? { submission_id: event.submission_id } : {}),
  }

  const payloadJson = JSON.stringify(payload)

  // 2. Create delivery record
  await supabase.from('webhook_deliveries').insert({
    subscription_id: sub.id,
    delivery_id: deliveryId,
    event_type: event.event_type,
    event_version: 1,
    payload,
    status: 'pending',
    attempt_count: 0,
  })

  // 3. Attempt delivery with retries
  let lastStatus: number | null = null
  let lastError: string | null = null

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS_MS[attempt - 1])
    }

    try {
      const signature = buildSignature(payloadJson, sub.secret_hash)

      const response = await fetch(sub.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Bouts-Signature': signature,
          'X-Bouts-Delivery-ID': deliveryId,
          'X-Bouts-Event': event.event_type,
          'X-Bouts-Event-Version': '1',
        },
        body: payloadJson,
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      })

      lastStatus = response.status

      if (response.ok) {
        // 5. Success: mark delivered
        await supabase.from('webhook_deliveries').update({
          status: 'delivered',
          attempt_count: attempt + 1,
          last_attempted_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
          response_status: lastStatus,
        }).eq('delivery_id', deliveryId)

        await supabase.from('webhook_subscriptions').update({
          last_delivery_at: new Date().toISOString(),
        }).eq('id', sub.id)

        return
      }

      lastError = `HTTP ${response.status}`
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Network error'
      lastStatus = null
    }
  }

  // 7. All retries exhausted — mark dead letter
  await supabase.from('webhook_deliveries').update({
    status: 'dead_letter',
    attempt_count: RETRY_DELAYS_MS.length,
    last_attempted_at: new Date().toISOString(),
    response_status: lastStatus,
    error_message: lastError,
  }).eq('delivery_id', deliveryId)

  // 8. Increment failure_count on subscription, disable if > threshold
  const { data: subRow } = await supabase
    .from('webhook_subscriptions')
    .select('failure_count')
    .eq('id', sub.id)
    .single()

  const newFailureCount = ((subRow?.failure_count as number) ?? 0) + 1

  await supabase.from('webhook_subscriptions').update({
    failure_count: newFailureCount,
    last_failure_at: new Date().toISOString(),
    active: newFailureCount <= MAX_FAILURE_COUNT,
  }).eq('id', sub.id)
}

/**
 * Build HMAC-SHA256 signature.
 * Note: secret_hash stored in DB is the SHA-256 hash of the original secret.
 * We sign with the stored hash (not the raw secret which we never store).
 */
function buildSignature(payload: string, secretHash: string): string {
  const hmac = createHmac('sha256', secretHash)
    .update(payload)
    .digest('hex')
  return `sha256=${hmac}`
}

/**
 * Retry failed deliveries that haven't been dead-lettered yet.
 * Call from a cron job or background worker.
 */
export async function retryFailedDeliveries(): Promise<void> {
  const supabase = createAdminClient()

  const { data: failedDeliveries, error } = await supabase
    .from('webhook_deliveries')
    .select('id, delivery_id, subscription_id, payload, event_type, attempt_count')
    .eq('status', 'failed')
    .lt('attempt_count', 3)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error || !failedDeliveries || failedDeliveries.length === 0) return

  // Load subscription details for each failed delivery
  for (const delivery of failedDeliveries) {
    const { data: sub } = await supabase
      .from('webhook_subscriptions')
      .select('id, url, secret_hash, active')
      .eq('id', delivery.subscription_id)
      .single()

    if (!sub?.active) continue

    const payloadJson = JSON.stringify(delivery.payload)
    const signature = buildSignature(payloadJson, sub.secret_hash)

    try {
      const response = await fetch(sub.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Bouts-Signature': signature,
          'X-Bouts-Delivery-ID': delivery.delivery_id as string,
          'X-Bouts-Event': delivery.event_type as string,
          'X-Bouts-Event-Version': '1',
        },
        body: payloadJson,
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      })

      if (response.ok) {
        await supabase.from('webhook_deliveries').update({
          status: 'delivered',
          attempt_count: (delivery.attempt_count as number) + 1,
          last_attempted_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
          response_status: response.status,
        }).eq('id', delivery.id)
      } else {
        const newCount = (delivery.attempt_count as number) + 1
        await supabase.from('webhook_deliveries').update({
          attempt_count: newCount,
          last_attempted_at: new Date().toISOString(),
          response_status: response.status,
          status: newCount >= 3 ? 'dead_letter' : 'failed',
        }).eq('id', delivery.id)
      }
    } catch (err) {
      const newCount = (delivery.attempt_count as number) + 1
      await supabase.from('webhook_deliveries').update({
        attempt_count: newCount,
        last_attempted_at: new Date().toISOString(),
        status: newCount >= 3 ? 'dead_letter' : 'failed',
        error_message: err instanceof Error ? err.message : 'Network error',
      }).eq('id', delivery.id)
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
