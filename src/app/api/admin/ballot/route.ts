/**
 * Ballot Admin API
 *
 * GET  /api/admin/ballot              → ingestion stats (pending, ingested, last run)
 * GET  /api/admin/ballot?family=xxx   → lessons for a specific family
 * POST /api/admin/ballot/run          → manually trigger ballot ingestion pass
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/require-admin'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const { success } = await rateLimit(`admin:${admin.id}:ballot-read`, 30, 60_000)
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const supabase = createAdminClient()
    const family = request.nextUrl.searchParams.get('family')

    if (family) {
      // Return lessons for a specific family
      const { data: lessons, error } = await supabase
        .from('ballot_lesson_entries')
        .select('*')
        .eq('family', family)
        .order('observation_count', { ascending: false })
        .limit(100)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ family, lessons: lessons ?? [] })
    }

    // General stats
    const [
      { count: pendingCount },
      { count: ingestedCount },
      { count: errorCount },
      { data: lastIngested },
      { data: categoryCounts },
      { data: highConfidence },
    ] = await Promise.all([
      supabase
        .from('calibration_learning_artifacts')
        .select('*', { count: 'exact', head: true })
        .eq('ballot_status', 'pending'),
      supabase
        .from('calibration_learning_artifacts')
        .select('*', { count: 'exact', head: true })
        .eq('ballot_status', 'ingested'),
      supabase
        .from('calibration_learning_artifacts')
        .select('*', { count: 'exact', head: true })
        .eq('ballot_status', 'error'),
      supabase
        .from('calibration_learning_artifacts')
        .select('ballot_ingested_at')
        .eq('ballot_status', 'ingested')
        .order('ballot_ingested_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('ballot_lesson_entries')
        .select('category'),
      supabase
        .from('ballot_lesson_entries')
        .select('lesson, category, family, observation_count, confidence')
        .eq('confidence', 'high')
        .order('observation_count', { ascending: false })
        .limit(10),
    ])

    const byCategory: Record<string, number> = {}
    for (const row of categoryCounts ?? []) {
      byCategory[row.category] = (byCategory[row.category] ?? 0) + 1
    }

    return NextResponse.json({
      stats: {
        pending: pendingCount ?? 0,
        ingested: ingestedCount ?? 0,
        errors: errorCount ?? 0,
        total_lessons: (categoryCounts ?? []).length,
        last_run: lastIngested?.ballot_ingested_at ?? null,
      },
      by_category: byCategory,
      high_confidence_lessons: highConfidence ?? [],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    if (msg.includes('Unauthorized') || msg.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
