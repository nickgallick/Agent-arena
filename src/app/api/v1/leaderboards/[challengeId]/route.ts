/**
 * GET /api/v1/leaderboards/:challengeId
 *
 * Challenge-specific leaderboard with cursor-based pagination.
 * Scope: leaderboard:read (or public)
 */

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { optionalAuth } from '@/lib/auth/token-auth'
import { applyRateLimit, readCategory, rateLimitIdentity, RATE_LIMITS } from '@/lib/utils/rate-limit-policy'
import { v1Success, v1Error } from '@/lib/api/response-helpers'

const idSchema = z.string().uuid('Invalid challenge ID')

const PAGE_SIZE = 50

export async function GET(
  request: Request,
  { params }: { params: Promise<{ challengeId: string }> }
): Promise<Response> {
  const { challengeId: rawId } = await params
  const idParsed = idSchema.safeParse(rawId)
  if (!idParsed.success) {
    return v1Error('Invalid challenge ID', 'INVALID_ID', 400)
  }
  const challengeId = idParsed.data

  const auth = await optionalAuth(request)
  const category = readCategory(auth)
  const identity = rateLimitIdentity(auth, request)
  const policy = RATE_LIMITS[category]

  const rl = await applyRateLimit(category, identity)
  if (!rl.success) {
    return v1Error('Rate limit exceeded', 'RATE_LIMITED', 429)
  }

  const url = new URL(request.url)
  const cursor = url.searchParams.get('cursor')
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? PAGE_SIZE)))

  const supabase = createAdminClient()

  // Fetch challenge entries for the leaderboard
  let query = supabase
    .from('challenge_entries')
    .select('id, agent_id, user_id, placement, final_score, elo_change, coins_awarded, status, submitted_at, agent:agents(id, name, avatar_url)', { count: 'exact' })
    .eq('challenge_id', challengeId)
    .eq('status', 'submitted')
    .order('placement', { ascending: true })
    .order('final_score', { ascending: false })
    .limit(limit + 1) // fetch one extra to determine has_more

  if (cursor) {
    // cursor is base64-encoded placement:id pair
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8')
      const [placementStr] = decoded.split(':')
      const placement = parseInt(placementStr, 10)
      if (!isNaN(placement)) {
        query = query.gt('placement', placement)
      }
    } catch {
      return v1Error('Invalid cursor', 'INVALID_CURSOR', 400)
    }
  }

  const { data: entries, count, error } = await query

  if (error) {
    return v1Error('Failed to fetch leaderboard', 'DB_ERROR', 500)
  }

  const items = entries ?? []
  const hasMore = items.length > limit
  const pageItems = hasMore ? items.slice(0, limit) : items

  // Build next cursor from last item's placement
  let nextCursor: string | undefined
  if (hasMore && pageItems.length > 0) {
    const last = pageItems[pageItems.length - 1]
    nextCursor = Buffer.from(`${last.placement}:${last.id}`).toString('base64')
  }

  return v1Success(pageItems, {
    pagination: {
      total: count ?? 0,
      page: 1,
      limit,
      has_more: hasMore,
      next_cursor: nextCursor,
    },
    rl: { limit: policy.requests, remaining: rl.remaining },
  })
}
