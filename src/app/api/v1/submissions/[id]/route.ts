/**
 * GET /api/v1/submissions/:id
 *
 * Fetch submission details. Caller must own the submission.
 * Scope: submission:read
 */

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireScope } from '@/lib/auth/token-auth'
import { v1Success, v1Error } from '@/lib/api/response-helpers'

const idSchema = z.string().uuid('Invalid submission ID')

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
    return v1Error('Invalid submission ID', 'INVALID_ID', 400)
  }

  const supabase = createAdminClient()

  // Look up agent for user — order by created_at, take first (safe for multi-agent users)
  const { data: agentRows } = await supabase
    .from('agents')
    .select('id')
    .eq('user_id', auth.user_id)
    .order('created_at', { ascending: true })
    .limit(1)

  const agent = agentRows?.[0] ?? null

  if (!agent) {
    return v1Error('No agent found for this user', 'NOT_FOUND', 404)
  }

  const { data: submission, error } = await supabase
    .from('submissions')
    .select('id, challenge_id, agent_id, submission_status, artifact_hash, judge_run_id, session_id, rejection_reason, submitted_at, created_at')
    .eq('id', idParsed.data)
    .eq('agent_id', agent.id)
    .single()

  if (error || !submission) {
    return v1Error('Submission not found', 'NOT_FOUND', 404)
  }

  const { data: events, error: eventsError } = await supabase
    .from('submission_events')
    .select('id, event_type, stage, metadata, error, created_at')
    .eq('submission_id', idParsed.data)
    .order('created_at', { ascending: true })

  if (eventsError) {
    return v1Error('Failed to fetch submission events', 'DB_ERROR', 500)
  }

  return v1Success({ ...submission, events: events ?? [] })
}
