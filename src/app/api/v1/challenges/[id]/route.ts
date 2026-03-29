/**
 * GET /api/v1/challenges/:id
 *
 * Challenge detail with API token auth support.
 * Scope: challenge:read (or public)
 *
 * Sandbox boundary: enforced — token environment must match challenge environment.
 */

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { optionalAuth, hasScope } from '@/lib/auth/token-auth'
import { enforceEnvironmentBoundary } from '@/lib/auth/sandbox-guard'
import { canAccessOrgChallenge } from '@/lib/auth/org-guard'
import { applyRateLimit, readCategory, rateLimitIdentity, RATE_LIMITS } from '@/lib/utils/rate-limit-policy'
import { v1Success, v1Error } from '@/lib/api/response-helpers'

const idSchema = z.string().uuid('Invalid challenge ID')

const CHALLENGE_COLUMNS = 'id, title, description, category, format, weight_class_id, status, time_limit_minutes, max_coins, entry_fee_cents, prize_pool, platform_fee_percent, starts_at, ends_at, entry_count, is_featured, is_daily, is_sandbox, has_visual_output, created_at'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id: rawId } = await params
  const idParsed = idSchema.safeParse(rawId)
  if (!idParsed.success) {
    return v1Error('Invalid challenge ID', 'INVALID_ID', 400)
  }

  const auth = await optionalAuth(request)

  // If token present but missing scope, reject
  if (auth && auth.token_type === 'api_token' && !hasScope(auth, 'challenge:read')) {
    return v1Error('Insufficient scope — requires challenge:read', 'INSUFFICIENT_SCOPE', 403)
  }

  const category = readCategory(auth)
  const identity = rateLimitIdentity(auth, request)
  const policy = RATE_LIMITS[category]

  const rl = await applyRateLimit(category, identity)
  if (!rl.success) {
    return v1Error('Rate limit exceeded', 'RATE_LIMITED', 429)
  }

  const supabase = createAdminClient()

  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select(CHALLENGE_COLUMNS)
    .eq('id', idParsed.data)
    .single()

  if (challengeError) {
    if (challengeError.code === 'PGRST116') {
      return v1Error('Challenge not found', 'NOT_FOUND', 404)
    }
    return v1Error('Failed to load challenge', 'DB_ERROR', 500)
  }

  // Enforce org visibility — hard 404 for non-members
  const accessible = await canAccessOrgChallenge(
    (challenge as { org_id?: string | null }).org_id ?? null,
    auth
  )
  if (!accessible) {
    return v1Error('Challenge not found', 'NOT_FOUND', 404)
  }

  // Enforce environment boundary
  if (auth) {
    const boundaryError = enforceEnvironmentBoundary(auth, challenge.is_sandbox ?? false)
    if (boundaryError) return boundaryError
  } else {
    // Unauthenticated requests cannot see sandbox challenges
    if (challenge.is_sandbox) {
      return v1Error('Challenge not found', 'NOT_FOUND', 404)
    }
  }

  return v1Success(challenge, {
    rl: { limit: policy.requests, remaining: rl.remaining },
  })
}
