/**
 * GET /api/v1/results/:id
 *
 * Fetch result by submission_id or match_result_id.
 * Scope: result:read
 */

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireScope } from '@/lib/auth/token-auth'
import { v1Success, v1Error } from '@/lib/api/response-helpers'
import { logEvent } from '@/lib/analytics/log-event'
import { canAccessOrgChallenge } from '@/lib/auth/org-guard'

const idSchema = z.string().uuid('Invalid ID')

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  let auth
  try {
    auth = await requireScope(request, 'result:read')
  } catch (err) {
    const e = err as Error & { status?: number }
    return v1Error(e.message, 'UNAUTHORIZED', e.status ?? 401)
  }

  const { id: rawId } = await params
  const idParsed = idSchema.safeParse(rawId)
  if (!idParsed.success) {
    return v1Error('Invalid ID', 'INVALID_ID', 400)
  }
  const id = idParsed.data

  const supabase = createAdminClient()

  // Determine ownership identity — order by created_at, take first (safe for multi-agent users)
  const { data: agentRows } = await supabase
    .from('agents')
    .select('id')
    .eq('user_id', auth.user_id)
    .order('created_at', { ascending: true })
    .limit(1)

  const agent = agentRows?.[0] ?? null

  // Try by submission_id first
  const { data: bySubmission } = await supabase
    .from('match_results')
    .select('id, submission_id, challenge_id, agent_id, score, rank, status, judged_at, created_at')
    .eq('submission_id', id)
    .maybeSingle()

  if (bySubmission) {
    if (!auth.is_admin && agent && bySubmission.agent_id !== agent.id) {
      return v1Error('Forbidden', 'FORBIDDEN', 403)
    }
    // Org visibility check — hard 404 if challenge is org-private and user is not a member
    if (bySubmission.challenge_id) {
      const { data: ch } = await supabase
        .from('challenges')
        .select('org_id')
        .eq('id', bySubmission.challenge_id)
        .maybeSingle()
      const orgOk = await canAccessOrgChallenge((ch as { org_id?: string | null } | null)?.org_id ?? null, auth)
      if (!orgOk) return v1Error('Result not found', 'NOT_FOUND', 404)
    }
    logEvent({ event_type: 'result_retrieved', auth, request, submission_id: bySubmission.submission_id })
    return v1Success(bySubmission)
  }

  // Try by match_result_id
  const { data: byId, error } = await supabase
    .from('match_results')
    .select('id, submission_id, challenge_id, agent_id, score, rank, status, judged_at, created_at')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return v1Error('Failed to fetch result', 'DB_ERROR', 500)
  }

  if (!byId) {
    return v1Error('Result not found', 'NOT_FOUND', 404)
  }

  if (!auth.is_admin && agent && byId.agent_id !== agent.id) {
    return v1Error('Forbidden', 'FORBIDDEN', 403)
  }

  // Org visibility check — hard 404 if challenge is org-private and user is not a member
  if (byId.challenge_id) {
    const { data: ch } = await supabase
      .from('challenges')
      .select('org_id')
      .eq('id', byId.challenge_id)
      .maybeSingle()
    const orgOk = await canAccessOrgChallenge((ch as { org_id?: string | null } | null)?.org_id ?? null, auth)
    if (!orgOk) return v1Error('Result not found', 'NOT_FOUND', 404)
  }

  logEvent({ event_type: 'result_retrieved', auth, request, submission_id: byId.submission_id })
  return v1Success(byId)
}
