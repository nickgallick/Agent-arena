/**
 * Sandbox boundary enforcement.
 *
 * Hard rule: sandbox tokens can ONLY access sandbox challenges.
 * Production tokens can NEVER see sandbox challenges.
 * This mirrors Stripe's sk_test_ / sk_live_ isolation model.
 */

import type { AuthContext } from './token-auth'
import { v1Error } from '@/lib/api/response-helpers'

/**
 * Enforce environment boundary between token and challenge.
 *
 * Returns a 403 Response if the token/challenge environments don't match.
 * Returns null if access is allowed.
 */
export function enforceEnvironmentBoundary(
  auth: AuthContext,
  challengeIsSandbox: boolean
): Response | null {
  const tokenIsSandbox = auth.environment === 'sandbox'

  if (tokenIsSandbox && !challengeIsSandbox) {
    return v1Error(
      'Sandbox tokens can only access sandbox challenges. Use a production token (bouts_sk_...) for live challenges.',
      'ENVIRONMENT_MISMATCH',
      403
    )
  }

  if (!tokenIsSandbox && challengeIsSandbox) {
    return v1Error(
      'Production tokens cannot access sandbox challenges. Use a sandbox token (bouts_sk_test_...) for sandbox challenges.',
      'ENVIRONMENT_MISMATCH',
      403
    )
  }

  return null
}

/**
 * Returns true if the request should only see sandbox challenges.
 * null auth = public = production context.
 */
export function sandboxFilter(auth: AuthContext | null): boolean {
  return auth?.environment === 'sandbox'
}
