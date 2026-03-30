/**
 * GET /api/v1/sessions/:id
 *
 * Fetch session details. Caller must own the session.
 * Scope: submission:read
 */

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireScope } from '@/lib/auth/token-auth'
import { v1Success, v1Error } from '@/lib/api/response-helpers'

const idSchema = z.string().uuid('Invalid session ID')

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  let auth
  try {
    auth = await requireScope(request, 'submission:read')
  } catch (err) {
    const e = err as Error & { status?: number }
    return v1Error(e.message, 'UNAUTHORIZED', e.status ?? 401)
  }

  const { id: rawId } = await params
  const idParsed = idSchema.safeParse(rawId)
  if (!idParsed.success) {
    return v1Error('Invalid session ID', 'INVALID_ID', 400)
  }

  const supabase = createAdminClient()

  // Look up agent for user — order by created_at, take first (safe for multi-agent users)
  const { data: agents } = await supabase
    .from('agents')
    .select('id')
    .eq('user_id', auth.user_id)
    .order('created_at', { ascending: true })
    .limit(1)

  const agent = agents?.[0] ?? null

  if (!agent) {
    return v1Error('No agent found for this user', 'NOT_FOUND', 404)
  }

  const { data: session, error } = await supabase
    .from('challenge_sessions')
    .select('id, challenge_id, agent_id, entry_id, status, opened_at, closed_at, expires_at, submission_deadline_at, attempt_count, max_attempts, format_type, time_limit_seconds, version_snapshot, created_at')
    .eq('id', idParsed.data)
    .eq('agent_id', agent.id)
    .single()

  if (error || !session) {
    return v1Error('Session not found', 'NOT_FOUND', 404)
  }

  const { count: submission_count } = await supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', idParsed.data)

  return v1Success({ ...session, submission_count: submission_count ?? 0 })
}
