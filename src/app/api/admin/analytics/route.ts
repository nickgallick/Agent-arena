/**
 * GET /api/admin/analytics
 *
 * Returns adoption analytics: access mode breakdown, friction hotspots,
 * env split, recent errors.
 *
 * Admin auth required.
 * Query params: days=30 (default), environment=production|sandbox|all
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAdmin } from '@/lib/auth/require-admin'

export async function GET(request: NextRequest): Promise<Response> {
  return withAdmin(async () => {
    const searchParams = request.nextUrl.searchParams
    const days = Math.min(Math.max(parseInt(searchParams.get('days') ?? '30', 10) || 30, 1), 90)
    const envFilter = searchParams.get('environment') ?? 'all'

    const since = new Date(Date.now() - days * 86_400_000).toISOString()
    const supabase = createAdminClient()

    // Base query builder
    function baseQuery() {
      let q = supabase
        .from('platform_events')
        .select('*')
        .gte('created_at', since)
      if (envFilter !== 'all') {
        q = q.eq('environment', envFilter)
      }
      return q
    }

    const [
      accessModeRes,
      frictionRes,
      envSplitRes,
      recentErrorsRes,
    ] = await Promise.all([
      // Access mode breakdown
      supabase
        .from('platform_events')
        .select('access_mode, id')
        .gte('created_at', since),

      // Friction hotspots — failed events
      supabase
        .from('platform_events')
        .select('error_code, event_type, created_at')
        .eq('success', false)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500),

      // Env split
      supabase
        .from('platform_events')
        .select('environment, id')
        .gte('created_at', since),

      // Recent errors
      supabase
        .from('platform_events')
        .select('id, event_type, error_code, access_mode, environment, created_at')
        .eq('success', false)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    // Access mode breakdown — count by mode
    const accessModeMap: Record<string, number> = {}
    for (const row of accessModeRes.data ?? []) {
      const mode = row.access_mode ?? 'unknown'
      accessModeMap[mode] = (accessModeMap[mode] ?? 0) + 1
    }
    const access_mode_breakdown = Object.entries(accessModeMap)
      .map(([mode, count]) => ({ mode, count }))
      .sort((a, b) => b.count - a.count)

    // Friction hotspots — group by error_code
    const frictionMap: Record<string, number> = {}
    for (const row of frictionRes.data ?? []) {
      const code = row.error_code ?? 'UNKNOWN'
      frictionMap[code] = (frictionMap[code] ?? 0) + 1
    }
    const friction_hotspots = Object.entries(frictionMap)
      .map(([error_code, count]) => ({ error_code, count }))
      .sort((a, b) => b.count - a.count)

    // Env split
    const envMap: Record<string, number> = {}
    for (const row of envSplitRes.data ?? []) {
      const env = row.environment ?? 'production'
      envMap[env] = (envMap[env] ?? 0) + 1
    }
    const environment_split = Object.entries(envMap)
      .map(([environment, count]) => ({ environment, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      access_mode_breakdown,
      friction_hotspots,
      environment_split,
      recent_errors: recentErrorsRes.data ?? [],
      query: { days, environment: envFilter },
    })
  })
}
