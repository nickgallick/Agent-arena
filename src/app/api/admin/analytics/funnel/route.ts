/**
 * GET /api/admin/analytics/funnel
 *
 * Returns adoption funnel data with per-stage user counts and drop-off.
 * Admin auth required.
 * Query params: days=30 (default)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAdmin } from '@/lib/auth/require-admin'

const FUNNEL_STAGES = [
  { stage: 1, label: 'Docs Viewed', event_type: 'docs_page_viewed' },
  { stage: 2, label: 'Token Created', event_type: 'token_created' },
  { stage: 3, label: 'Challenge Listed', event_type: 'challenge_listed' },
  { stage: 4, label: 'Session Created', event_type: 'session_created' },
  { stage: 5, label: 'Submission Received', event_type: 'submission_received' },
  { stage: 6, label: 'Result Retrieved', event_type: 'result_retrieved' },
  { stage: 7, label: 'Breakdown Retrieved', event_type: 'breakdown_retrieved' },
  { stage: 8, label: 'Webhook Created', event_type: 'webhook_created' },
  { stage: 9, label: 'Webhook Delivered', event_type: 'webhook_delivery_success' },
] as const

export async function GET(request: NextRequest): Promise<Response> {
  return withAdmin(async () => {
    const searchParams = request.nextUrl.searchParams
    const days = Math.min(Math.max(parseInt(searchParams.get('days') ?? '30', 10) || 30, 1), 90)
    const since = new Date(Date.now() - days * 86_400_000).toISOString()

    const supabase = createAdminClient()

    // Fetch all events in the time window (with user_id to count distinct users)
    const { data: events } = await supabase
      .from('platform_events')
      .select('event_type, user_id')
      .gte('created_at', since)
      .eq('success', true)
      .limit(50000)

    const eventRows = events ?? []

    // For each funnel stage, count distinct user_ids
    // Also count non-null rows for anonymous events (e.g. docs_page_viewed)
    const stageCounts = FUNNEL_STAGES.map(({ stage, label, event_type }) => {
      const matchingRows = eventRows.filter(e => e.event_type === event_type)
      const distinctUsers = new Set(matchingRows.map(e => e.user_id).filter(Boolean)).size
      const totalEvents = matchingRows.length
      return { stage, label, event_type, distinct_users: distinctUsers, total_events: totalEvents }
    })

    // Calculate drop-off percentages relative to previous stage
    const funnelWithDropoff = stageCounts.map((s, idx) => {
      if (idx === 0) {
        return { ...s, drop_off_pct: null, retention_from_prev: null }
      }
      const prev = stageCounts[idx - 1]
      const retentionFromPrev = prev.distinct_users > 0
        ? Math.round((s.distinct_users / prev.distinct_users) * 100)
        : null
      const dropOffPct = retentionFromPrev !== null ? 100 - retentionFromPrev : null
      return { ...s, drop_off_pct: dropOffPct, retention_from_prev: retentionFromPrev }
    })

    return NextResponse.json({
      funnel: funnelWithDropoff,
      query: { days },
    })
  })
}
