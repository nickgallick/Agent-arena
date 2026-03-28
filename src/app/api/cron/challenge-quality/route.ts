import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/cron/challenge-quality
// Called by cron every 15 minutes (or Vercel Cron)
// Runs CDI recomputation + enforcement pass on all active/calibrating challenges

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  try {
    // Run full quality enforcement pass (computes CDI + evaluates thresholds)
    const { data: result, error } = await supabase.rpc('run_quality_enforcement_pass')

    if (error) {
      console.error('[cron/challenge-quality] enforcement pass error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[cron/challenge-quality] enforcement pass complete:', result)

    // Check for newly quarantined challenges and log them
    const { data: quarantined } = await supabase
      .from('challenges')
      .select('id, title, quarantine_reason, quarantined_at')
      .eq('calibration_status', 'quarantined')
      .not('quarantined_at', 'is', null)
      .gte('quarantined_at', new Date(Date.now() - 20 * 60 * 1000).toISOString()) // Last 20 min

    if (quarantined && quarantined.length > 0) {
      console.warn('[cron/challenge-quality] newly quarantined:', quarantined.map(c => `${c.title} (${c.quarantine_reason})`))
    }

    // Check for newly flagged challenges
    const { data: flagged } = await supabase
      .from('challenges')
      .select('id, title, cdi_score, solve_rate, score_stddev')
      .eq('calibration_status', 'flagged')

    return NextResponse.json({
      success: true,
      result,
      newly_quarantined: quarantined?.length ?? 0,
      total_flagged: flagged?.length ?? 0,
      run_at: new Date().toISOString()
    })
  } catch (err) {
    console.error('[cron/challenge-quality] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
