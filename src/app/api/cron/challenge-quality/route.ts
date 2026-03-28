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

    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString()

    // Check for newly quarantined challenges (last 20 min)
    const { data: quarantined } = await supabase
      .from('challenges')
      .select('id, title, quarantine_reason, quarantined_at, cdi_score, solve_rate, score_stddev, dispute_rate, exploit_rate')
      .eq('calibration_status', 'quarantined')
      .not('quarantined_at', 'is', null)
      .gte('quarantined_at', twentyMinsAgo)

    // Check for newly flagged challenges (last 20 min)
    const { data: recentlyFlagged } = await supabase
      .from('challenges')
      .select('id, title, cdi_score, solve_rate, score_stddev, dispute_rate, exploit_rate, tier_separation')
      .eq('calibration_status', 'flagged')
      .gte('last_calculated_at', twentyMinsAgo)

    const { data: totalFlagged } = await supabase
      .from('challenges')
      .select('id', { count: 'exact', head: true })
      .eq('calibration_status', 'flagged')

    // Build rich alert if anything was quarantined
    if (quarantined && quarantined.length > 0) {
      const alertLines = quarantined.map(c =>
        `⚠️ QUARANTINED: ${c.title}\n  Reason: ${c.quarantine_reason}\n  CDI: ${c.cdi_score ?? 'n/a'} | Solve: ${c.solve_rate ? (Number(c.solve_rate) * 100).toFixed(0) + '%' : 'n/a'} | Dispute: ${c.dispute_rate ? (Number(c.dispute_rate) * 100).toFixed(0) + '%' : 'n/a'} | Exploit: ${c.exploit_rate ? (Number(c.exploit_rate) * 100).toFixed(0) + '%' : 'n/a'}\n  Admin: https://agent-arena-roan.vercel.app/admin/challenges`
      )
      console.warn('[cron/challenge-quality] QUARANTINE ALERT:\n' + alertLines.join('\n'))
    }

    if (recentlyFlagged && recentlyFlagged.length > 0) {
      console.warn('[cron/challenge-quality] newly flagged:', recentlyFlagged.map(c => `${c.title} (CDI: ${c.cdi_score})`))
    }

    return NextResponse.json({
      success: true,
      result,
      newly_quarantined: quarantined?.length ?? 0,
      newly_flagged: recentlyFlagged?.length ?? 0,
      total_flagged: totalFlagged?.length ?? 0,
      quarantined_details: quarantined?.map(c => ({
        id: c.id,
        title: c.title,
        reason: c.quarantine_reason,
        cdi_score: c.cdi_score,
        solve_rate: c.solve_rate,
        dispute_rate: c.dispute_rate,
        exploit_rate: c.exploit_rate,
        admin_url: `https://agent-arena-roan.vercel.app/admin/challenges`
      })),
      run_at: new Date().toISOString()
    })
  } catch (err) {
    console.error('[cron/challenge-quality] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
