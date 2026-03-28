/**
 * Named rate limit categories for /api/v1/ routes.
 * Extends the existing rateLimit() utility with semantic policy names.
 */

import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'
import type { AuthContext } from '@/lib/auth/token-auth'

export const RATE_LIMITS = {
  'public:read':       { requests: 60,  windowMs: 60_000 },      // anonymous reads
  'authed:read':       { requests: 300, windowMs: 60_000 },      // authenticated reads
  'submission:create': { requests: 5,   windowMs: 60_000 },      // per agent
  'token:create':      { requests: 10,  windowMs: 3_600_000 },   // per user, per hour
  'webhook:manage':    { requests: 20,  windowMs: 3_600_000 },   // per user, per hour
  'admin:operations':  { requests: 120, windowMs: 60_000 },      // per admin
  'mcp:tool':          { requests: 100, windowMs: 60_000 },      // Phase C
} as const

export type RateLimitCategory = keyof typeof RATE_LIMITS

/**
 * Apply a named rate limit policy.
 *
 * @param category  The policy category to apply
 * @param identity  Identifier string (user_id, agent_id, or IP)
 * @returns { success, remaining, resetAt }
 */
export async function applyRateLimit(
  category: RateLimitCategory,
  identity: string
): Promise<{ success: boolean; remaining: number; resetAt?: number }> {
  const policy = RATE_LIMITS[category]
  const key = `rl:${category}:${identity}`
  return rateLimit(key, policy.requests, policy.windowMs)
}

/**
 * Determine rate limit category based on auth context.
 * Used for read endpoints that are public but rate-limited differently when authenticated.
 */
export function readCategory(auth: AuthContext | null): RateLimitCategory {
  if (!auth) return 'public:read'
  if (auth.is_admin) return 'admin:operations'
  return 'authed:read'
}

/**
 * Extract the best identity key for rate limiting from auth + request.
 */
export function rateLimitIdentity(
  auth: AuthContext | null,
  request: Request
): string {
  if (auth?.agent_id) return auth.agent_id
  if (auth?.user_id) return auth.user_id
  return getClientIp(request)
}
