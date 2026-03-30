/**
 * GET /api/v1/challenges
 *
 * Lists challenges with API token auth support, standard v1 envelope,
 * versioning headers, and tiered rate limiting.
 *
 * Scope: challenge:read (or public)
 *
 * Sandbox boundary: sandbox tokens see only sandbox challenges;
 * production tokens/public see only production challenges.
 */

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { challengeQuerySchema } from '@/lib/validators/challenge'
import { optionalAuth } from '@/lib/auth/token-auth'
import { sandboxFilter } from '@/lib/auth/sandbox-guard'
import { getAccessibleOrgIds } from '@/lib/auth/org-guard'
import { applyRateLimit, readCategory, rateLimitIdentity } from '@/lib/utils/rate-limit-policy'
import { v1Success, v1Error, v1Paginated } from '@/lib/api/response-helpers'
import { RATE_LIMITS } from '@/lib/utils/rate-limit-policy'

const CHALLENGE_COLUMNS = 'id, title, description, category, format, weight_class_id, status, time_limit_minutes, max_coins, entry_fee_cents, prize_pool, platform_fee_percent, starts_at, ends_at, entry_count, is_featured, is_daily, is_sandbox, created_at, difficulty_profile, challenge_type'

export async function GET(request: NextRequest): Promise<Response> {
  const auth = await optionalAuth(request)

  const category = readCategory(auth)
  const identity = rateLimitIdentity(auth, request)
  const policy = RATE_LIMITS[category]

  const rl = await applyRateLimit(category, identity)
  if (!rl.success) {
    return v1Error('Rate limit exceeded', 'RATE_LIMITED', 429)
  }

  const searchParams = request.nextUrl.searchParams
  const parsed = challengeQuerySchema.safeParse({
    status: searchParams.get('status') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    weight_class: searchParams.get('weight_class') ?? undefined,
    format: searchParams.get('format') ?? undefined,
    page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
    limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
  })

  if (!parsed.success) {
    return v1Error(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
  }

  const { status, category: cat, weight_class, format, page = 1, limit = 20 } = parsed.data
  const offset = (page - 1) * limit

  const supabase = createAdminClient()
  let query = supabase
    .from('challenges')
    .select(CHALLENGE_COLUMNS, { count: 'exact' })
    // Enforce environment boundary: sandbox tokens see sandbox, everyone else sees production
    .eq('is_sandbox', sandboxFilter(auth))

  // Org visibility: only show public challenges + org challenges user is a member of
  const orgIds = await getAccessibleOrgIds(auth)
  const isAdmin = orgIds === undefined // undefined means admin

  if (!isAdmin) {
    if (orgIds === null || (Array.isArray(orgIds) && orgIds.length === 0)) {
      // Unauthenticated or no org memberships: only public challenges
      query = query.is('org_id', null)
    } else if (Array.isArray(orgIds)) {
      // Authenticated with org memberships
      query = query.or(`org_id.is.null,org_id.in.(${orgIds.join(',')})`)
    }

    // Non-admin: enforce status filter — only expose active challenges to public callers.
    // If a specific status is requested by an authenticated user, honour it but
    // block reserve/upcoming/draft from unauthenticated callers entirely.
    if (!auth) {
      // Unauthenticated: always restrict to active regardless of query param
      query = query.eq('status', 'active')
    } else if (status) {
      // Authenticated non-admin: allow status filter but block internal statuses
      const BLOCKED_STATUSES = ['reserve', 'draft', 'quarantine', 'retired', 'archived', 'calibrating']
      if (BLOCKED_STATUSES.includes(status)) {
        return v1Error('Status filter not permitted for this token type', 'FORBIDDEN', 403)
      }
      query = query.eq('status', status)
    } else {
      // Authenticated non-admin, no status param: active only (same as unauthenticated)
      query = query.eq('status', 'active')
    }
  } else {
    // Admin: apply requested status filter as-is (or no filter)
    if (status) query = query.eq('status', status)
  }

  if (cat) query = query.eq('category', cat)
  if (weight_class) query = query.eq('weight_class_id', weight_class)
  if (format) query = query.eq('format', format)

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const { data, count, error } = await query

  if (error) {
    return v1Error('Internal server error', 'DB_ERROR', 500)
  }

  return v1Paginated(data ?? [], count ?? 0, page, limit, {
    rl: {
      limit: policy.requests,
      remaining: rl.remaining,
    },
  })
}
