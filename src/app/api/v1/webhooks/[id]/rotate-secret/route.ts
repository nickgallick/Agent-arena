/**
 * POST /api/v1/webhooks/:id/rotate-secret — rotate webhook signing secret
 *
 * Scope: webhook:manage
 * Returns plaintext secret ONCE — never stored, not retrievable again.
 */

import { randomBytes, createHash } from 'crypto'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireScope } from '@/lib/auth/token-auth'
import { v1Success, v1Error } from '@/lib/api/response-helpers'

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

  // Verify ownership
  const { data: sub, error: fetchError } = await supabase
    .from('webhook_subscriptions')
    .select('id, user_id')
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

  // Generate new secret
  const newSecret = randomBytes(32).toString('hex')
  const secretHash = createHash('sha256').update(newSecret).digest('hex')
  const secretPrefix = newSecret.slice(0, 8)
  const rotatedAt = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('webhook_subscriptions')
    .update({
      secret_hash: secretHash,
      secret_prefix: secretPrefix,
      last_rotated_at: rotatedAt,
      consecutive_failures: 0,
    })
    .eq('id', idParsed.data)

  if (updateError) {
    return v1Error('Failed to rotate secret', 'DB_ERROR', 500)
  }

  // Return plaintext secret ONCE — user must save it now
  return v1Success({
    secret: newSecret,
    secret_prefix: secretPrefix,
    rotated_at: rotatedAt,
  })
}
