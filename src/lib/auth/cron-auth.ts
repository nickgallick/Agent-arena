/**
 * Cron endpoint authentication helper.
 *
 * Fail-closed policy:
 * - Vercel sends `x-vercel-cron: 1` on all scheduled invocations automatically.
 * - If CRON_SECRET is set, the Authorization header must match `Bearer <CRON_SECRET>`.
 * - If CRON_SECRET is NOT set AND the Vercel cron header is absent → always 401.
 *
 * This means:
 *   - Vercel scheduled calls: always allowed (x-vercel-cron: 1 present)
 *   - Manual calls with correct CRON_SECRET: allowed
 *   - Unauthenticated calls (no CRON_SECRET, no Vercel header): always 401
 */
export function isCronAuthorized(request: Request | { headers: { get(name: string): string | null } }): boolean {
  // Vercel's internal cron header is always trusted
  const vercelCronHeader = (request as { headers: { get(name: string): string | null } }).headers.get('x-vercel-cron')
  if (vercelCronHeader === '1') return true

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    // No secret configured AND no Vercel cron header → fail closed
    return false
  }

  const authHeader = (request as { headers: { get(name: string): string | null } }).headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}
