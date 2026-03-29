import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAdmin } from '@/lib/auth/require-admin'

type HealthSignal = 'healthy' | 'warning' | 'critical'

function computeHealthSignal(opts: {
  solve_rate: number | null
  exploit_rate: number | null
  dispute_rate: number | null
}): HealthSignal {
  const { solve_rate, exploit_rate, dispute_rate } = opts
  const sr = solve_rate ?? 50
  const er = exploit_rate ?? 0
  const dr = dispute_rate ?? 0

  if (sr > 85 || sr < 5 || er > 3 || dr > 12) return 'critical'
  if (sr > 75 || sr < 10 || dr > 8) return 'warning'
  return 'healthy'
}

export async function GET(): Promise<Response> {
  return withAdmin(async () => {
    const supabase = createAdminClient()

    const { data: challenges, error: challengeError } = await supabase
      .from('challenges')
      .select('id, title, category, format, status, pipeline_status, calibration_status, cdi_score, web_submission_supported')
      .in('status', ['active', 'upcoming'])

    if (challengeError) {
      return NextResponse.json({ error: challengeError.message }, { status: 500 })
    }

    if (!challenges || challenges.length === 0) {
      return NextResponse.json({ challenges: [], summary: { healthy: 0, warning: 0, critical: 0 } })
    }

    const challengeIds = challenges.map(c => c.id)

    // Fetch quality snapshots for all active challenges
    const { data: snapshots, error: snapshotError } = await supabase
      .from('challenge_quality_snapshots')
      .select('challenge_id, solve_rate, score_mean, score_stddev, dispute_rate, exploit_rate, tier_separation, entry_count, last_calculated_at')
      .in('challenge_id', challengeIds)
      .order('last_calculated_at', { ascending: false })

    if (snapshotError) {
      return NextResponse.json({ error: snapshotError.message }, { status: 500 })
    }

    // Take latest snapshot per challenge
    const latestByChallenge = new Map<string, typeof snapshots[0]>()
    for (const s of snapshots ?? []) {
      if (!latestByChallenge.has(s.challenge_id)) {
        latestByChallenge.set(s.challenge_id, s)
      }
    }

    const result = challenges.map(c => {
      const snap = latestByChallenge.get(c.id)
      const health_signal = computeHealthSignal({
        solve_rate: snap?.solve_rate ?? null,
        exploit_rate: snap?.exploit_rate ?? null,
        dispute_rate: snap?.dispute_rate ?? null,
      })
      return {
        id: c.id,
        title: c.title,
        family: c.category,
        format: c.format,
        status: c.status,
        pipeline_status: c.pipeline_status,
        calibration_status: c.calibration_status,
        cdi_score: c.cdi_score,
        solve_rate: snap?.solve_rate ?? null,
        score_mean: snap?.score_mean ?? null,
        score_stddev: snap?.score_stddev ?? null,
        dispute_rate: snap?.dispute_rate ?? null,
        exploit_rate: snap?.exploit_rate ?? null,
        tier_separation: snap?.tier_separation ?? null,
        entry_count: snap?.entry_count ?? 0,
        last_calculated_at: snap?.last_calculated_at ?? null,
        health_signal,
        web_submission_supported: c.web_submission_supported ?? false,
      }
    })

    const summary = {
      healthy: result.filter(r => r.health_signal === 'healthy').length,
      warning: result.filter(r => r.health_signal === 'warning').length,
      critical: result.filter(r => r.health_signal === 'critical').length,
    }

    return NextResponse.json({ challenges: result, summary })
  })
}
