/**
 * POST /api/v1/challenges/:id/sessions
 *
 * Create or return existing open session for (challenge_id, agent_id).
 * IDEMPOTENT: returns existing open session with 200, new session with 201.
 *
 * Scope: challenge:enter
 *
 * Sandbox boundary: enforced. Session inherits environment from token.
 */

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireScope } from '@/lib/auth/token-auth'
import { enforceEnvironmentBoundary } from '@/lib/auth/sandbox-guard'
import { canAccessOrgChallenge } from '@/lib/auth/org-guard'
import { v1Success, v1Error } from '@/lib/api/response-helpers'
import { isChallengeEnterable } from '@/lib/challenges/discovery'
import { captureVersionSnapshot } from '@/lib/submissions/version-snapshot'
import { logEvent } from '@/lib/analytics/log-event'

const idSchema = z.string().uuid('Invalid challenge ID')

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  let auth
  try {
    auth = await requireScope(request, 'challenge:enter')
  } catch (err) {
    const e = err as Error & { status?: number }
    return v1Error(e.message, 'UNAUTHORIZED', e.status ?? 401)
  }

  const { id: rawId } = await params
  const idParsed = idSchema.safeParse(rawId)
  if (!idParsed.success) {
    return v1Error('Invalid challenge ID', 'INVALID_ID', 400)
  }
  const challengeId = idParsed.data

  const supabase = createAdminClient()

  // Fetch challenge to check environment boundary
  const { data: challenge, error: challengeFetchError } = await supabase
    .from('challenges')
    .select('id, format, time_limit_seconds, is_sandbox, status')
    .eq('id', challengeId)
    .single()

  if (challengeFetchError || !challenge) {
    return v1Error('Challenge not found', 'NOT_FOUND', 404)
  }

  // Enforce org visibility — hard 404 for non-members
  const orgAccessible = await canAccessOrgChallenge(
    (challenge as { org_id?: string | null }).org_id ?? null,
    auth
  )
  if (!orgAccessible) {
    return v1Error('Challenge not found', 'NOT_FOUND', 404)
  }

  // Enforce environment boundary before creating session
  const boundaryError = enforceEnvironmentBoundary(auth, challenge.is_sandbox ?? false)
  if (boundaryError) return boundaryError

  // Look up agent for user
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, user_id')
    .eq('user_id', auth.user_id)
    .maybeSingle()

  if (agentError || !agent) {
    return v1Error('No agent found for this user', 'NOT_FOUND', 404)
  }

  // IDEMPOTENCY: check for existing open session
  const { data: existing, error: existingError } = await supabase
    .from('challenge_sessions')
    .select('id, expires_at, version_snapshot, status')
    .eq('challenge_id', challengeId)
    .eq('agent_id', agent.id)
    .eq('status', 'open')
    .maybeSingle()

  if (existingError) {
    return v1Error('Failed to check existing session', 'DB_ERROR', 500)
  }

  if (existing) {
    logEvent({
      event_type: auth.environment === 'sandbox' ? 'sandbox_session_created' : 'session_created',
      auth,
      request,
      challenge_id: challengeId,
      metadata: { existing: true },
    })
    return v1Success(
      {
        session_id: existing.id,
        expires_at: existing.expires_at,
        version_snapshot: existing.version_snapshot,
        existing: true,
      },
      { status: 200 }
    )
  }

  // Check enterable
  const { enterable, reason } = await isChallengeEnterable(supabase, challengeId, agent.id)
  if (!enterable) {
    return v1Error(reason ?? 'Challenge not enterable', 'NOT_ENTERABLE', 400)
  }

  // Capture version snapshot
  const version_snapshot = await captureVersionSnapshot(supabase, challengeId)

  const time_limit_seconds = (challenge?.time_limit_seconds as number | null) ?? null
  const expires_at = time_limit_seconds
    ? new Date(Date.now() + time_limit_seconds * 1000).toISOString()
    : null

  const { data: session, error: sessionError } = await supabase
    .from('challenge_sessions')
    .insert({
      challenge_id: challengeId,
      agent_id: agent.id,
      status: 'open',
      expires_at,
      submission_deadline_at: expires_at,
      format_type: challenge?.format as string | null ?? null,
      time_limit_seconds,
      version_snapshot: version_snapshot as unknown as Record<string, unknown>,
      environment: auth.environment,
    })
    .select('id, expires_at, version_snapshot')
    .single()

  if (sessionError || !session) {
    return v1Error(`Failed to create session: ${sessionError?.message ?? 'unknown'}`, 'DB_ERROR', 500)
  }

  // Upsert challenge entry
  const { data: entry, error: entryError } = await supabase
    .from('challenge_entries')
    .upsert({
      challenge_id: challengeId,
      agent_id: agent.id,
      user_id: auth.user_id,
      status: 'active',
      session_id: session.id,
    }, { onConflict: 'challenge_id,agent_id' })
    .select('id')
    .single()

  if (entryError || !entry) {
    return v1Error(`Failed to create entry: ${entryError?.message ?? 'unknown'}`, 'DB_ERROR', 500)
  }

  await supabase
    .from('challenge_sessions')
    .update({ entry_id: entry.id })
    .eq('id', session.id)

  logEvent({
    event_type: auth.environment === 'sandbox' ? 'sandbox_session_created' : 'session_created',
    auth,
    request,
    challenge_id: challengeId,
    session_id: session.id,
    metadata: { existing: false },
  })

  return v1Success(
    {
      session_id: session.id,
      expires_at: session.expires_at,
      version_snapshot: session.version_snapshot,
      existing: false,
    },
    { status: 201 }
  )
}
