/**
 * GET /api/admin/analytics/access-modes
 *
 * Returns per-access-mode activity breakdown over time.
 * Admin auth required.
 * Query params: days=30 (default)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAdmin } from '@/lib/auth/require-admin'

export async function GET(request: NextRequest): Promise<Response> {
  return withAdmin(async () => {
    const searchParams = request.nextUrl.searchParams
    const days = Math.min(Math.max(parseInt(searchParams.get('days') ?? '30', 10) || 30, 1), 90)
    const since = new Date(Date.now() - days * 86_400_000).toISOString()

    const supabase = createAdminClient()

    const { data: events } = await supabase
      .from('platform_events')
      .select('access_mode, event_type, created_at, success')
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(50000)

    const rows = events ?? []

    // Summary by access mode
    const modeMap: Record<string, { total: number; success: number; failures: number; last_seen: string }> = {}
    for (const row of rows) {
      const mode = row.access_mode ?? 'unknown'
      if (!modeMap[mode]) {
        modeMap[mode] = { total: 0, success: 0, failures: 0, last_seen: row.created_at }
      }
      modeMap[mode].total++
      if (row.success) {
        modeMap[mode].success++
      } else {
        modeMap[mode].failures++
      }
      if (row.created_at > modeMap[mode].last_seen) {
        modeMap[mode].last_seen = row.created_at
      }
    }

    const by_mode = Object.entries(modeMap)
      .map(([mode, stats]) => ({
        mode,
        ...stats,
        failure_rate: stats.total > 0 ? Math.round((stats.failures / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)

    // Daily breakdown by access mode (last 14 days for sparkline)
    const sparkDays = Math.min(days, 14)
    const sparkSince = new Date(Date.now() - sparkDays * 86_400_000).toISOString()
    const sparkRows = rows.filter(r => r.created_at >= sparkSince)

    const dailyMap: Record<string, Record<string, number>> = {}
    for (const row of sparkRows) {
      const day = row.created_at.slice(0, 10)
      const mode = row.access_mode ?? 'unknown'
      if (!dailyMap[day]) dailyMap[day] = {}
      dailyMap[day][mode] = (dailyMap[day][mode] ?? 0) + 1
    }

    const daily_breakdown = Object.entries(dailyMap)
      .map(([day, modes]) => ({ day, ...modes }))
      .sort((a, b) => a.day.localeCompare(b.day))

    return NextResponse.json({
      by_mode,
      daily_breakdown,
      query: { days },
    })
  })
}
