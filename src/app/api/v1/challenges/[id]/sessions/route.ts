/**
 * POST /api/v1/challenges/:id/sessions
 *
 * Create or return existing open session for (challenge_id, agent_id).
 * IDEMPOTENT: returns existing open session with 200, new session with 201.
 *
 * Scope: challenge:enter
 */

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireScope } from '@/lib/auth/token-auth'
import { v1Success, v1Error } from '@/lib/api/response-helpers'
import { isChallengeEnterable } from '@/lib/challenges/discovery'
import { captureVersionSnapshot } from '@/lib/submissions/version-snapshot'

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

  // Get challenge details
  const { data: challenge } = await supabase
    .from('challenges')
    .select('id, format, time_limit_seconds')
    .eq('id', challengeId)
    .single()

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
