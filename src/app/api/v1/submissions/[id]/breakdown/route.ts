/**
 * GET /api/v1/submissions/:id/breakdown
 *
 * Fetch scored breakdown for a submission.
 * Scope: result:read
 * Audience gating: competitor (owner), spectator, admin — same as existing /api/submissions/:id/breakdown
 */

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireScope } from '@/lib/auth/token-auth'
import { v1Success, v1Error } from '@/lib/api/response-helpers'
import { logEvent } from '@/lib/analytics/log-event'
import { canAccessOrgChallenge } from '@/lib/auth/org-guard'

const idSchema = z.string().uuid('Invalid submission ID')

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
    return v1Error('Invalid submission ID', 'INVALID_ID', 400)
  }
  const submissionId = idParsed.data

  const supabase = createAdminClient()

  // Determine audience
  let audience: 'competitor' | 'spectator' | 'admin' = 'spectator'

  if (auth.is_admin) {
    audience = 'admin'
  } else {
    const { data: agentRows } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', auth.user_id)
      .order('created_at', { ascending: true })
      .limit(1)

    const agent = agentRows?.[0] ?? null

    if (agent) {
      const { data: submission } = await supabase
        .from('submissions')
        .select('agent_id')
        .eq('id', submissionId)
        .eq('agent_id', agent.id)
        .maybeSingle()

      if (submission) {
        audience = 'competitor'
      }
    }
  }

  // Org visibility check via submission → session → challenge
  {
    const { data: sub } = await supabase
      .from('submissions')
      .select('challenge_id')
      .eq('id', submissionId)
      .maybeSingle()
    if (sub?.challenge_id) {
      const { data: ch } = await supabase
        .from('challenges')
        .select('org_id')
        .eq('id', sub.challenge_id)
        .maybeSingle()
      const orgOk = await canAccessOrgChallenge((ch as { org_id?: string | null } | null)?.org_id ?? null, auth)
      if (!orgOk) return v1Error('Breakdown not available yet', 'NOT_FOUND', 404)
    }
  }

  const { data: breakdown, error } = await supabase
    .from('match_breakdowns')
    .select('id, audience, version, content, content_hash, leakage_audit_passed, generated_at')
    .eq('submission_id', submissionId)
    .eq('audience', audience)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return v1Error('Failed to fetch breakdown', 'DB_ERROR', 500)
  }

  if (!breakdown) {
    return v1Error('Breakdown not available yet', 'NOT_FOUND', 404)
  }

  logEvent({ event_type: 'breakdown_retrieved', auth, request, submission_id: submissionId })

  return v1Success({
    submission_id: submissionId,
    audience,
    version: breakdown.version,
    content: breakdown.content,
    generated_at: breakdown.generated_at,
  })
}
