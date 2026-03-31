// Stage 4: Longitudinal Profile Update
// Forge · 2026-03-31
//
// Updates agent_performance_profiles and logs to agent_performance_events.
// This is the "compounding intelligence" stage — it's what turns one-time
// feedback into a genuine agent performance memory system.
//
// Update strategy:
// - Scores: exponential moving average (α=0.3) — weights recent bouts more
// - Failure modes: frequency map, sorted by recurrence
// - Strengths/weaknesses: frequency map from lane signals
// - Lane trends: rolling window of last 10 scores per lane
// - Regression detection: if rolling score drops >10 pts in last 3 bouts
// - Improvement detection: if rolling score improves >10 pts in last 3 bouts

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  DiagnosisOutput,
  ExtractedSignals,
  AgentLongitudinalSummary,
  LaneTrend,
  RecurringPattern,
  RecurringFailureMode,
  RegressionWarning,
  ImprovementTrend,
  ChallengeTypePerf,
  RecentBout,
  FailureModeCode,
} from './types'
import { FAILURE_MODE_LABELS } from './types'

const EMA_ALPHA = 0.3

function ema(prior: number | null, current: number): number {
  if (prior === null) return current
  return EMA_ALPHA * current + (1 - EMA_ALPHA) * prior
}

export async function updateLongitudinalProfile(
  supabase: SupabaseClient,
  opts: {
    agent_id: string
    submission_id: string
    entry_id: string | null
    diagnosis: DiagnosisOutput
    signals: ExtractedSignals
    challenge_title?: string | null
  }
): Promise<AgentLongitudinalSummary> {
  const { agent_id, submission_id, entry_id, diagnosis, signals, challenge_title } = opts

  // Fetch existing profile
  const { data: existingRaw } = await supabase
    .from('agent_performance_profiles')
    .select('*')
    .eq('agent_id', agent_id)
    .maybeSingle()

  const existing = existingRaw as Record<string, unknown> | null

  // ── Rolling scores ──────────────────────────────────────────────────────────
  const newOverall = signals.composite_score
  const newObjective = signals.lane_signals.find(l => l.lane === 'objective')?.score ?? null
  const newProcess = signals.lane_signals.find(l => l.lane === 'process')?.score ?? null
  const newStrategy = signals.lane_signals.find(l => l.lane === 'strategy')?.score ?? null
  const newIntegrity = signals.lane_signals.find(l => l.lane === 'integrity')?.score ?? null

  const rolling_overall_score = newOverall != null
    ? ema(existing?.rolling_overall_score as number | null ?? null, newOverall)
    : (existing?.rolling_overall_score as number | null ?? null)
  const rolling_objective_score = newObjective != null
    ? ema(existing?.rolling_objective_score as number | null ?? null, newObjective)
    : (existing?.rolling_objective_score as number | null ?? null)
  const rolling_process_score = newProcess != null
    ? ema(existing?.rolling_process_score as number | null ?? null, newProcess)
    : (existing?.rolling_process_score as number | null ?? null)
  const rolling_strategy_score = newStrategy != null
    ? ema(existing?.rolling_strategy_score as number | null ?? null, newStrategy)
    : (existing?.rolling_strategy_score as number | null ?? null)
  const rolling_integrity_score = newIntegrity != null
    ? ema(existing?.rolling_integrity_score as number | null ?? null, newIntegrity)
    : (existing?.rolling_integrity_score as number | null ?? null)

  const total_bouts = ((existing?.total_bouts as number) ?? 0) + 1
  const total_production_bouts = ((existing?.total_production_bouts as number) ?? 0) + 1

  // ── Failure mode frequency map ──────────────────────────────────────────────
  const existingFailureModes: { code: string; count: number; last_seen: string }[] =
    Array.isArray(existing?.recurring_failure_modes_json) ? existing.recurring_failure_modes_json as { code: string; count: number; last_seen: string }[] : []

  const failureModeMap = new Map<string, { count: number; last_seen: string }>(
    existingFailureModes.map(f => [f.code, { count: f.count, last_seen: f.last_seen }])
  )
  for (const fm of diagnosis.failure_modes) {
    if (fm.failure_mode_code === 'none_detected') continue
    const existing = failureModeMap.get(fm.failure_mode_code)
    failureModeMap.set(fm.failure_mode_code, {
      count: (existing?.count ?? 0) + 1,
      last_seen: new Date().toISOString(),
    })
  }
  const recurring_failure_modes_json = [...failureModeMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([code, v]) => ({ code, count: v.count, last_seen: v.last_seen }))

  // ── Strength/weakness frequency map ────────────────────────────────────────
  const existingStrengths: { label: string; count: number; last_seen: string }[] =
    Array.isArray(existing?.recurring_strengths_json) ? existing.recurring_strengths_json as { label: string; count: number; last_seen: string }[] : []
  const existingWeaknesses: { label: string; count: number; last_seen: string }[] =
    Array.isArray(existing?.recurring_weaknesses_json) ? existing.recurring_weaknesses_json as { label: string; count: number; last_seen: string }[] : []

  const strengthMap = new Map(existingStrengths.map(s => [s.label, s]))
  const weaknessMap = new Map(existingWeaknesses.map(w => [w.label, w]))

  // Add this bout's dominant signals
  if (diagnosis.dominant_strength && diagnosis.dominant_strength.length > 5) {
    const key = diagnosis.dominant_strength.slice(0, 80)
    const s = strengthMap.get(key)
    strengthMap.set(key, { label: key, count: (s?.count ?? 0) + 1, last_seen: new Date().toISOString() })
  }
  if (diagnosis.dominant_weakness && diagnosis.dominant_weakness.length > 5) {
    const key = diagnosis.dominant_weakness.slice(0, 80)
    const w = weaknessMap.get(key)
    weaknessMap.set(key, { label: key, count: (w?.count ?? 0) + 1, last_seen: new Date().toISOString() })
  }

  const recurring_strengths_json = [...strengthMap.values()].sort((a, b) => b.count - a.count).slice(0, 10)
  const recurring_weaknesses_json = [...weaknessMap.values()].sort((a, b) => b.count - a.count).slice(0, 10)

  // ── Lane trends ─────────────────────────────────────────────────────────────
  const existingLaneTrends: Record<string, { scores: number[]; last_updated: string }> =
    (existing?.lane_trends_json as Record<string, { scores: number[]; last_updated: string }>) ?? {}

  const laneTrendsUpdated: Record<string, { scores: number[]; trend_direction: string; last_updated: string; current_avg: number | null }> = {}

  for (const ls of signals.lane_signals) {
    const prior = existingLaneTrends[ls.lane] ?? { scores: [] }
    const scores = [...(prior.scores ?? []), ls.score].slice(-10)  // keep last 10
    const trend = computeTrendDirection(scores)
    const currentAvg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null
    laneTrendsUpdated[ls.lane] = {
      scores,
      trend_direction: trend,
      last_updated: new Date().toISOString(),
      current_avg: currentAvg,
    }
  }
  // Preserve existing lanes not updated this bout
  for (const [lane, data] of Object.entries(existingLaneTrends)) {
    if (!laneTrendsUpdated[lane]) {
      laneTrendsUpdated[lane] = {
        scores: data.scores ?? [],
        trend_direction: computeTrendDirection(data.scores ?? []),
        last_updated: data.last_updated,
        current_avg: null,
      }
    }
  }

  // ── Volatility metrics ──────────────────────────────────────────────────────
  const volatilityMetrics: Record<string, number> = {}
  for (const [lane, data] of Object.entries(laneTrendsUpdated)) {
    if (data.scores.length >= 3) {
      volatilityMetrics[lane] = computeVolatility(data.scores)
    }
  }
  const overallScores = (existing?.recent_bouts_json as RecentBout[] ?? [])
    .map(b => b.composite_score)
    .filter((s): s is number => s != null)
  if (signals.composite_score != null) overallScores.push(signals.composite_score)
  const score_volatility = overallScores.length >= 3 ? computeVolatility(overallScores.slice(-10)) : null

  // ── Challenge type performance ──────────────────────────────────────────────
  const challengeType = signals.challenge_type ?? signals.challenge_family ?? 'unknown'
  const existingCTP: Record<string, { avg_score: number; count: number; trend: string }> =
    (existing?.challenge_type_performance_json as Record<string, { avg_score: number; count: number; trend: string }>) ?? {}
  const ctpEntry = existingCTP[challengeType] ?? { avg_score: 0, count: 0, trend: 'stable' }
  const newAvgScore = (ctpEntry.avg_score * ctpEntry.count + (signals.composite_score ?? ctpEntry.avg_score)) / (ctpEntry.count + 1)
  existingCTP[challengeType] = {
    avg_score: Math.round(newAvgScore * 10) / 10,
    count: ctpEntry.count + 1,
    trend: ctpEntry.count > 0 ? computeTrendDirection([ctpEntry.avg_score, newAvgScore]) : 'stable',
  }

  // ── Recent bouts (last 5) ────────────────────────────────────────────────────
  const existingRecent: RecentBout[] = Array.isArray(existing?.recent_bouts_json) ? existing.recent_bouts_json as RecentBout[] : []
  const primaryFailureCode = diagnosis.failure_modes.find(f => f.primary_flag)?.failure_mode_code ?? null
  const newBout: RecentBout = {
    submission_id,
    composite_score: signals.composite_score,
    primary_failure: primaryFailureCode,
    challenge_title: challenge_title ?? null,
    created_at: new Date().toISOString(),
  }
  const recent_bouts_json = [newBout, ...existingRecent].slice(0, 5)

  // ── Regression and improvement detection ───────────────────────────────────
  const regression_warnings: RegressionWarning[] = []
  const improvement_trends: ImprovementTrend[] = []

  // Check for regression (score drops >10 pts in lane over last 3 bouts)
  for (const [lane, data] of Object.entries(laneTrendsUpdated)) {
    if (data.scores.length >= 3) {
      const recent3 = data.scores.slice(-3)
      const drop = recent3[0] - recent3[recent3.length - 1]
      if (drop > 10) {
        regression_warnings.push({
          lane,
          warning: `${lane} score dropped ${drop.toFixed(0)} pts over last 3 bouts (${recent3.map(s => s.toFixed(0)).join(' → ')})`,
          detected_at: new Date().toISOString(),
          severity: drop > 20 ? 'high' : 'medium',
        })
      }
      // Check for improvement
      const rise = recent3[recent3.length - 1] - recent3[0]
      if (rise > 8) {
        improvement_trends.push({
          area: `${lane} lane`,
          direction: 'improving',
          confidence: rise > 15 ? 'high' : 'medium',
          evidence: `+${rise.toFixed(0)} pts over last 3 bouts`,
        })
      }
    }
  }

  // ── Persist profile ──────────────────────────────────────────────────────────
  const profileData = {
    agent_id,
    total_bouts,
    total_production_bouts,
    rolling_overall_score: rolling_overall_score != null ? Math.round(rolling_overall_score * 10) / 10 : null,
    rolling_objective_score: rolling_objective_score != null ? Math.round(rolling_objective_score * 10) / 10 : null,
    rolling_process_score: rolling_process_score != null ? Math.round(rolling_process_score * 10) / 10 : null,
    rolling_strategy_score: rolling_strategy_score != null ? Math.round(rolling_strategy_score * 10) / 10 : null,
    rolling_integrity_score: rolling_integrity_score != null ? Math.round(rolling_integrity_score * 10) / 10 : null,
    score_volatility: score_volatility != null ? Math.round(score_volatility * 10) / 10 : null,
    recurring_strengths_json,
    recurring_weaknesses_json,
    recurring_failure_modes_json,
    lane_trends_json: laneTrendsUpdated,
    volatility_metrics_json: volatilityMetrics,
    improvement_trends_json: improvement_trends,
    challenge_type_performance_json: existingCTP,
    regression_warnings_json: regression_warnings,
    recent_bouts_json,
    last_updated_at: new Date().toISOString(),
  }

  if (existing) {
    await supabase.from('agent_performance_profiles').update(profileData).eq('agent_id', agent_id)
  } else {
    await supabase.from('agent_performance_profiles').insert(profileData)
  }

  // ── Log event ──────────────────────────────────────────────────────────────
  const eventPayload: Record<string, unknown> = {
    composite_score: signals.composite_score,
    primary_failure_mode: primaryFailureCode,
    dominant_weakness: diagnosis.dominant_weakness,
    dominant_strength: diagnosis.dominant_strength,
    lane_scores: Object.fromEntries(signals.lane_signals.map(l => [l.lane, l.score])),
  }

  await supabase.from('agent_performance_events').insert({
    agent_id,
    submission_id,
    entry_id,
    event_type: 'bout_completed',
    payload_json: eventPayload,
  })

  // Log regression events
  for (const w of regression_warnings) {
    await supabase.from('agent_performance_events').insert({
      agent_id,
      submission_id,
      event_type: 'regression_detected',
      payload_json: { lane: w.lane, warning: w.warning, severity: w.severity },
    })
  }

  // ── Build summary for return ─────────────────────────────────────────────────
  const laneTrends: LaneTrend[] = Object.entries(laneTrendsUpdated).map(([lane, data]) => ({
    lane,
    scores: data.scores,
    trend_direction: data.trend_direction as 'improving' | 'declining' | 'stable' | 'volatile',
    current_avg: data.current_avg,
  }))

  const recurringStrengths: RecurringPattern[] = recurring_strengths_json.map(s => ({
    code: s.label.slice(0, 30),
    label: s.label,
    count: s.count,
    last_seen: s.last_seen,
  }))

  const recurringWeaknesses: RecurringPattern[] = recurring_weaknesses_json.map(w => ({
    code: w.label.slice(0, 30),
    label: w.label,
    count: w.count,
    last_seen: w.last_seen,
  }))

  const recurringFailureModes: RecurringFailureMode[] = recurring_failure_modes_json.map(f => ({
    failure_mode_code: f.code as FailureModeCode,
    label: FAILURE_MODE_LABELS[f.code as FailureModeCode] ?? f.code,
    count: f.count,
    last_seen: f.last_seen,
    severity: f.count >= 3 ? 'high' : f.count >= 2 ? 'medium' : 'low',
  }))

  const challengeTypePerf: ChallengeTypePerf[] = Object.entries(existingCTP).map(([type, data]) => ({
    type,
    avg_score: data.avg_score,
    count: data.count,
    trend: data.trend as 'improving' | 'declining' | 'stable',
  }))

  return {
    total_bouts,
    rolling_overall_score: rolling_overall_score != null ? Math.round(rolling_overall_score * 10) / 10 : null,
    lane_trends: laneTrends,
    recurring_strengths: recurringStrengths,
    recurring_weaknesses: recurringWeaknesses,
    recurring_failure_modes: recurringFailureModes,
    improvement_trends,
    regression_warnings,
    challenge_type_performance: challengeTypePerf,
    score_volatility: score_volatility != null ? Math.round(score_volatility * 10) / 10 : null,
    recent_bouts: recent_bouts_json,
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function computeTrendDirection(scores: number[]): 'improving' | 'declining' | 'stable' | 'volatile' {
  if (scores.length < 2) return 'stable'
  const first = scores[0]
  const last = scores[scores.length - 1]
  const diff = last - first
  const variance = computeVolatility(scores)
  if (variance > 20) return 'volatile'
  if (diff > 6) return 'improving'
  if (diff < -6) return 'declining'
  return 'stable'
}

function computeVolatility(scores: number[]): number {
  if (scores.length < 2) return 0
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance = scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / scores.length
  return Math.sqrt(variance)
}
