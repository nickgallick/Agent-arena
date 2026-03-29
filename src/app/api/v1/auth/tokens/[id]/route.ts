/**
 * DELETE /api/v1/auth/tokens/:id — revoke a token
 *
 * Auth: JWT only
 */

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { v1Success, v1Error } from '@/lib/api/response-helpers'
import { logEvent } from '@/lib/analytics/log-event'

const idSchema = z.string().uuid()

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  // JWT auth only
  const supabaseClient = await createClient()
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
  if (authError || !user) {
    return v1Error('Unauthorized', 'UNAUTHORIZED', 401)
  }

  const { id: rawId } = await params
  const parsed = idSchema.safeParse(rawId)
  if (!parsed.success) {
    return v1Error('Invalid token ID', 'INVALID_ID', 400)
  }

  const supabase = createAdminClient()

  // Verify ownership before revoking
  const { data: token, error: fetchError } = await supabase
    .from('api_tokens')
    .select('id, user_id, revoked_at')
    .eq('id', parsed.data)
    .maybeSingle()

  if (fetchError) {
    return v1Error('Failed to fetch token', 'DB_ERROR', 500)
  }

  if (!token) {
    return v1Error('Token not found', 'NOT_FOUND', 404)
  }

  if (token.user_id !== user.id) {
    return v1Error('Forbidden', 'FORBIDDEN', 403)
  }

  if (token.revoked_at) {
    return v1Error('Token already revoked', 'ALREADY_REVOKED', 409)
  }

  const { error: revokeError } = await supabase
    .from('api_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', parsed.data)

  if (revokeError) {
    return v1Error('Failed to revoke token', 'DB_ERROR', 500)
  }

  logEvent({ event_type: 'token_revoked', request: _request })

  return v1Success({ id: parsed.data, revoked: true })
}
