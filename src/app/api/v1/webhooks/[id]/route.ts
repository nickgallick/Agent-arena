/**
 * DELETE /api/v1/webhooks/:id  — deactivate subscription
 * POST   /api/v1/webhooks/:id/test — send test event
 *
 * Scope: webhook:manage
 */

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireScope } from '@/lib/auth/token-auth'
import { v1Success, v1Error } from '@/lib/api/response-helpers'
import { randomUUID } from 'crypto'

const idSchema = z.string().uuid('Invalid webhook ID')

export async function DELETE(
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

  // Verify ownership
  const { data: sub, error: fetchError } = await supabase
    .from('webhook_subscriptions')
    .select('id, user_id, active')
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

  const { error: updateError } = await supabase
    .from('webhook_subscriptions')
    .update({ active: false })
    .eq('id', idParsed.data)

  if (updateError) {
    return v1Error('Failed to deactivate webhook', 'DB_ERROR', 500)
  }

  return v1Success({ id: idParsed.data, active: false })
}

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

  // Support /webhooks/:id/test suffix — strip /test if present
  // In Next.js, this is a separate route file — this handler is for /:id directly
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
    event: 'test',
    delivery_id: deliveryId,
    timestamp: new Date().toISOString(),
    data: { message: 'This is a test event from Bouts API' },
  }

  // Log delivery attempt
  await supabase
    .from('webhook_deliveries')
    .insert({
      subscription_id: idParsed.data,
      delivery_id: deliveryId,
      event_type: 'test',
      event_version: 1,
      payload: testPayload,
      status: 'pending',
    })

  // Fire test delivery (non-blocking for now — full delivery engine is Phase B)
  let deliveryStatus = 'pending'
  let responseStatus: number | null = null

  try {
    const res = await fetch(sub.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bouts-Event': 'test',
        'X-Bouts-Delivery-ID': deliveryId,
      },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10_000),
    })

    responseStatus = res.status
    deliveryStatus = res.ok ? 'delivered' : 'failed'
  } catch {
    deliveryStatus = 'failed'
  }

  await supabase
    .from('webhook_deliveries')
    .update({
      status: deliveryStatus,
      response_status: responseStatus,
      attempt_count: 1,
      last_attempted_at: new Date().toISOString(),
      delivered_at: deliveryStatus === 'delivered' ? new Date().toISOString() : null,
    })
    .eq('delivery_id', deliveryId)

  return v1Success({
    delivery_id: deliveryId,
    status: deliveryStatus,
    response_status: responseStatus,
  })
}
