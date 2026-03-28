/**
 * POST /api/v1/webhooks/:id/test
 * Sends a test event to the subscriber URL.
 * Returns: { delivered: boolean, status_code: number | null, latency_ms: number }
 * Auth: webhook:manage scope
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { requireScope } from '@/lib/auth/token-auth'
import { v1Success, v1Error } from '@/lib/api/response-helpers'
import { randomUUID } from 'crypto'
import { z } from 'zod'

const idSchema = z.string().uuid('Invalid webhook ID')

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  let auth
  try {
    auth = await requireScope(request, 'webhook:manage')
  } catch (err) {
    const e = err as Error & { status?: number }
    return v1Error(e.message, 'UNAUTHORIZED', e.status ?? 401)
  }

  const { id: rawId } = await params
  const idParsed = idSchema.safeParse(rawId)
  if (!idParsed.success) {
    return v1Error('Invalid webhook ID', 'INVALID_ID', 400)
  }

  const supabase = createAdminClient()

  const { data: sub, error: fetchError } = await supabase
    .from('webhook_subscriptions')
    .select('id, url, user_id, active, secret_hash')
    .eq('id', idParsed.data)
    .maybeSingle()

  if (fetchError) {
    return v1Error('Failed to fetch webhook', 'DB_ERROR', 500)
  }

  if (!sub) {
    return v1Error('Webhook not found', 'NOT_FOUND', 404)
  }

  if (sub.user_id !== auth.user_id) {
    return v1Error('Forbidden', 'FORBIDDEN', 403)
  }

  if (!sub.active) {
    return v1Error('Webhook is not active', 'WEBHOOK_INACTIVE', 400)
  }

  const deliveryId = randomUUID()
  const testPayload = {
    id: deliveryId,
    event_type: 'test',
    timestamp: new Date().toISOString(),
    data: { message: 'Test delivery from Bouts' },
  }

  // Log delivery attempt
  await supabase.from('webhook_deliveries').insert({
    subscription_id: sub.id,
    delivery_id: deliveryId,
    event_type: 'test',
    event_version: 1,
    payload: testPayload,
    status: 'pending',
    attempt_count: 0,
  })

  const startMs = Date.now()
  let delivered = false
  let statusCode: number | null = null

  try {
    const response = await fetch(sub.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bouts-Event': 'test',
        'X-Bouts-Delivery-ID': deliveryId,
        'X-Bouts-Event-Version': '1',
      },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10_000),
    })

    statusCode = response.status
    delivered = response.ok
  } catch {
    delivered = false
  }

  const latencyMs = Date.now() - startMs

  await supabase.from('webhook_deliveries').update({
    status: delivered ? 'delivered' : 'failed',
    response_status: statusCode,
    attempt_count: 1,
    last_attempted_at: new Date().toISOString(),
    delivered_at: delivered ? new Date().toISOString() : null,
  }).eq('delivery_id', deliveryId)

  return v1Success({ delivered, status_code: statusCode, latency_ms: latencyMs })
}
