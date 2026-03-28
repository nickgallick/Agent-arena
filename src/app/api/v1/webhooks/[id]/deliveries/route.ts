/**
 * GET /api/v1/webhooks/:id/deliveries
 * Returns last 20 deliveries for a webhook subscription.
 * Auth: webhook:manage scope
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { requireScope } from '@/lib/auth/token-auth'
import { v1Success, v1Error } from '@/lib/api/response-helpers'
import { z } from 'zod'

const idSchema = z.string().uuid('Invalid webhook ID')

export async function GET(
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
  const { data: sub, error: subError } = await supabase
    .from('webhook_subscriptions')
    .select('id, user_id')
    .eq('id', idParsed.data)
    .maybeSingle()

  if (subError) {
    return v1Error('Failed to fetch webhook', 'DB_ERROR', 500)
  }

  if (!sub) {
    return v1Error('Webhook not found', 'NOT_FOUND', 404)
  }

  if (sub.user_id !== auth.user_id) {
    return v1Error('Forbidden', 'FORBIDDEN', 403)
  }

  const { data: deliveries, error: deliveryError } = await supabase
    .from('webhook_deliveries')
    .select('id, delivery_id, event_type, status, response_status, attempt_count, created_at, last_attempted_at, delivered_at, error_message')
    .eq('subscription_id', idParsed.data)
    .order('created_at', { ascending: false })
    .limit(20)

  if (deliveryError) {
    return v1Error('Failed to fetch deliveries', 'DB_ERROR', 500)
  }

  return v1Success(deliveries ?? [])
}
