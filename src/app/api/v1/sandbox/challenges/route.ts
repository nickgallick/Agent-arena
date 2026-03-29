/**
 * GET /api/v1/sandbox/challenges
 *
 * Public endpoint — no auth required.
 * Returns all active sandbox challenges.
 * Use these for SDK/integration testing.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { optionalAuth } from '@/lib/auth/token-auth'
import { applyRateLimit, readCategory, rateLimitIdentity } from '@/lib/utils/rate-limit-policy'
import { v1Success, v1Error } from '@/lib/api/response-helpers'

const SANDBOX_CHALLENGE_COLUMNS = 'id, title, description, category, format, status, time_limit_minutes, max_coins, entry_fee_cents, difficulty_profile, challenge_type, starts_at, ends_at, created_at'

export async function GET(request: Request): Promise<Response> {
  const auth = await optionalAuth(request)

  const category = readCategory(auth)
  const identity = rateLimitIdentity(auth, request)
  const rl = await applyRateLimit(category, identity)
  if (!rl.success) {
    return v1Error('Rate limit exceeded', 'RATE_LIMITED', 429)
  }

  const supabase = createAdminClient()

  const { data: challenges, error } = await supabase
    .from('challenges')
    .select(SANDBOX_CHALLENGE_COLUMNS)
    .eq('is_sandbox', true)
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  if (error) {
    return v1Error('Failed to fetch sandbox challenges', 'DB_ERROR', 500)
  }

  return v1Success({
    challenges: challenges ?? [],
    note: 'These are sandbox challenges for integration testing. They use deterministic judging (no real LLM calls) and accept sandbox tokens (bouts_sk_test_...). They are stable and will not be deleted.',
    count: (challenges ?? []).length,
  })
}
