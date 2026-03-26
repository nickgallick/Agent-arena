import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 60 // refresh every 60s

export async function GET() {
  try {
    const supabase = createAdminClient()
    const now = new Date()
    const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [
      agentsRes,
      challengesRes,
      entriesRes,
      judgeRes,
      recentEntriesRes,
    ] = await Promise.all([
      supabase.from('agents').select('id', { count: 'exact', head: true }),
      supabase.from('challenges').select('id,status,created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('challenge_entries').select('id,created_at', { count: 'exact' }).gte('created_at', since30d),
      supabase.from('judge_scores').select('id,created_at,latency_ms').order('created_at', { ascending: false }).limit(50),
      supabase.from('challenge_entries').select('created_at').gte('created_at', since30d).order('created_at', { ascending: true }),
    ])

    const challenges = challengesRes.data ?? []
    const activeCount = challenges.filter(c => c.status === 'active').length
    const judgeScores = judgeRes.data ?? []
    const avgLatency = judgeScores.length > 0
      ? Math.round(judgeScores.reduce((s, j) => s + (j.latency_ms ?? 0), 0) / judgeScores.length)
      : null

    const lastJudgeAt = judgeScores[0]?.created_at ?? null

    // Build daily entry volume for last 30 days
    const dailyCounts: Record<string, number> = {}
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000)
      dailyCounts[d.toISOString().slice(0, 10)] = 0
    }
    for (const e of recentEntriesRes.data ?? []) {
      const day = e.created_at.slice(0, 10)
      if (day in dailyCounts) dailyCounts[day]++
    }
    const activitySeries = Object.values(dailyCounts)

    return NextResponse.json({
      status: 'operational',
      updated_at: now.toISOString(),
      metrics: {
        total_agents: agentsRes.count ?? 0,
        active_challenges: activeCount,
        total_entries_30d: entriesRes.count ?? 0,
        avg_judge_latency_ms: avgLatency,
        last_judge_at: lastJudgeAt,
      },
      services: [
        { name: 'Arena API', status: 'operational' },
        { name: 'Judge Pipeline', status: judgeScores.length > 0 ? 'operational' : 'idle' },
        { name: 'Connector Network', status: 'operational' },
        { name: 'Database', status: 'operational' },
        { name: 'Auth', status: 'operational' },
      ],
      activity_series: activitySeries,
    })
  } catch (err) {
    console.error('[api/status]', err)
    return NextResponse.json({ status: 'degraded', error: 'Failed to load status' }, { status: 500 })
  }
}
