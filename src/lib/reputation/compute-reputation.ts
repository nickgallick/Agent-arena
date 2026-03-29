/**
 * Compute and upsert an agent's reputation snapshot.
 *
 * Called:
 * 1. After every match_result is finalized (from orchestrator)
 * 2. Via admin cron (daily recompute)
 *
 * Rules:
 * - Only counts match_results from public challenges (org_id IS NULL on challenge)
 * - Only counts environment='production' submissions (no sandbox)
 * - is_verified = completion_count >= 3
 * - Suppresses public stats below floor (handled at display layer, not computed layer)
 * - Never exposes per-submission scores
 */

import { createAdminClient } from '@/lib/supabase/admin'

interface MatchResultRow {
  final_score: number
  challenge_id: string
  finalized_at: string
  challenge_category: string | null
}

interface FamilyStrength {
  avg_score: number
  count: number
}

interface RecentFormEntry {
  month: string
  avg_score: number
  count: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function computeMedian(scores: number[]): number {
  if (scores.length === 0) return 0
  const sorted = [...scores].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function computeStddev(scores: number[]): number {
  if (scores.length < 2) return 0
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
  return Math.sqrt(variance)
}

/**
 * Compute and upsert an agent's reputation snapshot.
 * Fire-and-forget safe — never throws.
 */
export async function computeAgentReputation(agentId: string): Promise<void> {
  try {
    const supabase = createAdminClient()

    // Fetch all qualifying match_results for this agent:
    // - submissions with environment='production'
    // - challenges with org_id IS NULL (public challenges only)
    // Join via: match_results → submissions (environment) → challenges (org_id, category)
    const { data: results, error } = await supabase
      .from('match_results')
      .select(`
        final_score,
        challenge_id,
        finalized_at,
        challenges!inner(
          org_id,
          category
        ),
        submissions!inner(
          environment
        )
      `)
      .eq('agent_id', agentId)
      .is('challenges.org_id', null)
      .eq('submissions.environment', 'production')

    if (error) {
      console.error('[computeAgentReputation] Query error:', error.message)
      return
    }

    // Map to typed rows, excluding any with missing data
    const rows: MatchResultRow[] = (results ?? [])
      .filter((r) => r.final_score !== null && r.final_score !== undefined)
      .map((r) => ({
        final_score: r.final_score as number,
        challenge_id: r.challenge_id as string,
        finalized_at: r.finalized_at as string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        challenge_category: (r as any).challenges?.category ?? null,
      }))

    const participationCount = rows.length
    const completionCount = rows.length // all match_results represent completed submissions

    if (participationCount === 0) {
      // No results — upsert with empty snapshot
      await supabase.from('agent_reputation_snapshots').upsert({
        agent_id: agentId,
        participation_count: 0,
        completion_count: 0,
        avg_score: null,
        best_score: null,
        median_score: null,
        consistency_score: null,
        challenge_family_strengths: {},
        recent_form: [],
        is_verified: false,
        last_computed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'agent_id' })
      return
    }

    const scores = rows.map((r) => r.final_score)

    // Core aggregated scores
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
    const bestScore = Math.max(...scores)
    const medianScore = computeMedian(scores)

    // Consistency score: 100 - (stddev * 2), clamped 0-100
    const stddev = computeStddev(scores)
    const consistencyScore = clamp(100 - stddev * 2, 0, 100)

    // Challenge family strengths — group by category
    const familyMap: Record<string, { scores: number[] }> = {}
    for (const row of rows) {
      const cat = row.challenge_category ?? 'uncategorized'
      if (!familyMap[cat]) familyMap[cat] = { scores: [] }
      familyMap[cat].scores.push(row.final_score)
    }

    const challengeFamilyStrengths: Record<string, FamilyStrength> = {}
    for (const [cat, { scores: catScores }] of Object.entries(familyMap)) {
      const catAvg = catScores.reduce((a, b) => a + b, 0) / catScores.length
      challengeFamilyStrengths[cat] = {
        avg_score: Math.round(catAvg * 10) / 10,
        count: catScores.length,
      }
    }

    // Recent form — last 6 months, avg score per month
    const now = new Date()
    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthMap: Record<string, { scores: number[] }> = {}
    for (const row of rows) {
      const date = new Date(row.finalized_at)
      if (date < sixMonthsAgo) continue
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!monthMap[monthKey]) monthMap[monthKey] = { scores: [] }
      monthMap[monthKey].scores.push(row.final_score)
    }

    const recentForm: RecentFormEntry[] = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { scores: mScores }]) => ({
        month,
        avg_score: Math.round((mScores.reduce((a, b) => a + b, 0) / mScores.length) * 10) / 10,
        count: mScores.length,
      }))

    const isVerified = completionCount >= 3

    await supabase.from('agent_reputation_snapshots').upsert({
      agent_id: agentId,
      participation_count: participationCount,
      completion_count: completionCount,
      avg_score: Math.round(avgScore * 10) / 10,
      best_score: Math.round(bestScore * 10) / 10,
      median_score: Math.round(medianScore * 10) / 10,
      consistency_score: Math.round(consistencyScore * 10) / 10,
      challenge_family_strengths: challengeFamilyStrengths,
      recent_form: recentForm,
      is_verified: isVerified,
      last_computed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'agent_id' })

  } catch (err) {
    // Fire-and-forget safe — log but never throw
    console.error('[computeAgentReputation] Unexpected error:', err instanceof Error ? err.message : String(err))
  }
}
