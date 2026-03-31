// Stage 1: Signal Extraction
// Forge · 2026-03-31
//
// Pulls all raw signals from judge outputs, telemetry, DB, and prior agent profile.
// No LLM involved — this is pure data assembly.
// The goal: give the diagnosis stage a complete, structured picture
// of what actually happened, without any interpretation added yet.

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ExtractedSignals,
  LaneSignal,
  TelemetrySignal,
  AgentPriorProfile,
  JudgeOutputRaw,
} from './types'

export async function extractSignals(
  supabase: SupabaseClient,
  opts: {
    submission_id: string
    entry_id: string | null
    agent_id: string
    challenge_id: string
  }
): Promise<ExtractedSignals> {
  const { submission_id, entry_id, agent_id, challenge_id } = opts

  // Parallel fetch — all reads happen simultaneously
  const [
    challengeResult,
    entryResult,
    judgeOutputsResult,
    runMetricsResult,
    profileResult,
    submissionResult,
  ] = await Promise.all([
    supabase
      .from('challenges')
      .select('id, title, category, format, family, judge_weights, ends_at')
      .eq('id', challenge_id)
      .maybeSingle(),

    entry_id
      ? supabase
          .from('challenge_entries')
          .select('id, placement, composite_score, process_score, strategy_score, integrity_adjustment, final_score, status, created_at, overall_verdict')
          .eq('id', entry_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    supabase
      .from('judge_outputs')
      .select('id, lane, score, confidence, flags, short_rationale, dimension_scores, positive_signal, primary_weakness, integrity_outcome, integrity_adjustment, evidence_refs, is_fallback')
      .eq('entry_id', entry_id ?? '')
      .eq('is_arbitration', false)
      .order('created_at', { ascending: true }),

    supabase
      .from('run_metrics')
      .select('total_events, tool_call_count, retry_count, revert_count, pivot_count, error_count, test_run_count, thrash_rate, revert_ratio, tool_discipline, verification_density, wasted_action_ratio, total_duration_ms, pct_explore, pct_plan, pct_implement, pct_verify, pct_recover, telemetry_process_score, telemetry_recovery_score, telemetry_efficiency_score')
      .eq('entry_id', entry_id ?? '')
      .maybeSingle(),

    supabase
      .from('agent_performance_profiles')
      .select('total_bouts, rolling_overall_score, rolling_objective_score, rolling_process_score, rolling_strategy_score, rolling_integrity_score, recurring_failure_modes_json, recurring_weaknesses_json, recurring_strengths_json')
      .eq('agent_id', agent_id)
      .maybeSingle(),

    supabase
      .from('submissions')
      .select('content')
      .eq('id', submission_id)
      .maybeSingle(),
  ])

  const challenge = challengeResult.data
  const entry = entryResult.data
  const judgeOutputsRaw = judgeOutputsResult.data ?? []
  const runMetrics = runMetricsResult.data
  const profileRaw = profileResult.data
  const submission = submissionResult.data

  // Build lane signals
  const laneSignals: LaneSignal[] = (judgeOutputsRaw as Record<string, unknown>[]).map(o => ({
    lane: String(o.lane ?? ''),
    score: Number(o.score ?? 0),
    confidence: (o.confidence as number ?? 0.5) >= 0.7 ? 'high' : (o.confidence as number) >= 0.4 ? 'medium' : 'low',
    flags: Array.isArray(o.flags) ? (o.flags as string[]) : [],
    rationale: String(o.short_rationale ?? ''),
    dimension_scores: (o.dimension_scores as Record<string, number>) ?? {},
    positive_signal: (o.positive_signal as string | null) ?? null,
    primary_weakness: (o.primary_weakness as string | null) ?? null,
    integrity_outcome: (o.integrity_outcome as string | null) ?? null,
    integrity_adjustment: Number(o.integrity_adjustment ?? 0),
    evidence_refs: Array.isArray(o.evidence_refs) ? (o.evidence_refs as string[]) : [],
  }))

  // Build telemetry signal
  let telemetry: TelemetrySignal | null = null
  if (runMetrics) {
    const rm = runMetrics as Record<string, unknown>
    telemetry = {
      thrash_rate:              Number(rm.thrash_rate ?? 0),
      tool_discipline:          Number(rm.tool_discipline ?? 0),
      verification_density:     Number(rm.verification_density ?? 0),
      wasted_action_ratio:      Number(rm.wasted_action_ratio ?? 0),
      pct_verify:               Number(rm.pct_verify ?? 0),
      pct_recover:              Number(rm.pct_recover ?? 0),
      pct_implement:            Number(rm.pct_implement ?? 0),
      pct_explore:              Number(rm.pct_explore ?? 0),
      error_count:              Number(rm.error_count ?? 0),
      retry_count:              Number(rm.retry_count ?? 0),
      revert_count:             Number(rm.revert_count ?? 0),
      pivot_count:              Number(rm.pivot_count ?? 0),
      total_events:             Number(rm.total_events ?? 0),
      total_duration_ms:        Number(rm.total_duration_ms ?? 0),
      telemetry_process_score:  Number(rm.telemetry_process_score ?? 0),
      telemetry_recovery_score: Number(rm.telemetry_recovery_score ?? 0),
      telemetry_efficiency_score: Number(rm.telemetry_efficiency_score ?? 0),
    }
  }

  // Build prior profile
  let priorProfile: AgentPriorProfile | null = null
  if (profileRaw) {
    const p = profileRaw as Record<string, unknown>
    priorProfile = {
      total_bouts:              Number(p.total_bouts ?? 0),
      rolling_overall_score:    p.rolling_overall_score != null ? Number(p.rolling_overall_score) : null,
      rolling_objective_score:  p.rolling_objective_score != null ? Number(p.rolling_objective_score) : null,
      rolling_process_score:    p.rolling_process_score != null ? Number(p.rolling_process_score) : null,
      rolling_strategy_score:   p.rolling_strategy_score != null ? Number(p.rolling_strategy_score) : null,
      rolling_integrity_score:  p.rolling_integrity_score != null ? Number(p.rolling_integrity_score) : null,
      recurring_failure_modes:  Array.isArray(p.recurring_failure_modes_json)
        ? (p.recurring_failure_modes_json as { code: string; count: number }[])
        : [],
      recurring_weaknesses:     Array.isArray(p.recurring_weaknesses_json)
        ? (p.recurring_weaknesses_json as { label: string; count: number }[])
        : [],
      recurring_strengths:      Array.isArray(p.recurring_strengths_json)
        ? (p.recurring_strengths_json as { label: string; count: number }[])
        : [],
    }
  }

  // B1/D3 FIX: Compute real field statistics from DB — never LLM-estimated.
  // Minimum 5 entries required for any comparison to be shown.
  // Below that threshold, competitive_comparison = null (gated in signal extractor,
  // enforced in diagnosis prompt, and suppressed in the UI component).
  let totalEntries: number | null = null
  let fieldStats: {
    median_composite: number | null
    top_quartile_composite: number | null
    winner_composite: number | null
    sample_count: number
  } | null = null

  const MIN_ENTRIES_FOR_COMPARISON = 5

  if (challenge?.id) {
    // Count total scored entries
    const { count } = await supabase
      .from('challenge_entries')
      .select('id', { count: 'exact', head: true })
      .eq('challenge_id', challenge.id)
      .in('status', ['judged', 'scored', 'completed'])
    totalEntries = count ?? null

    // Only compute stats if we have enough entries for meaningful comparison
    if (totalEntries != null && totalEntries >= MIN_ENTRIES_FOR_COMPARISON) {
      const { data: scores } = await supabase
        .from('challenge_entries')
        .select('composite_score, final_score')
        .eq('challenge_id', challenge.id)
        .in('status', ['judged', 'scored', 'completed'])
        .not('composite_score', 'is', null)
        .order('composite_score', { ascending: false })

      if (scores && scores.length >= MIN_ENTRIES_FOR_COMPARISON) {
        const vals = scores
          .map((s: Record<string, unknown>) => Number(s.composite_score ?? s.final_score ?? 0))
          .filter((v: number) => v > 0)
          .sort((a: number, b: number) => b - a)  // descending

        if (vals.length >= MIN_ENTRIES_FOR_COMPARISON) {
          const n = vals.length
          const medianIdx = Math.floor(n / 2)
          const q1Idx = Math.floor(n / 4)   // top 25% cutoff

          fieldStats = {
            sample_count: n,
            winner_composite: vals[0] ?? null,
            top_quartile_composite: vals[q1Idx] ?? null,
            median_composite: vals[medianIdx] ?? null,
          }
        }
      }
    }
  }

  // Compute composite from entry if available
  const compositeScore = entry
    ? ((entry as Record<string, unknown>).composite_score as number | null) ??
      ((entry as Record<string, unknown>).final_score as number | null) ?? null
    : null

  // Judge outputs raw format for LLM context
  const judgeOutputsForLLM: JudgeOutputRaw[] = (judgeOutputsRaw as Record<string, unknown>[]).map(o => ({
    id: String(o.id ?? ''),
    lane: String(o.lane ?? ''),
    score: Number(o.score ?? 0),
    confidence: Number(o.confidence ?? 0),
    flags: Array.isArray(o.flags) ? (o.flags as string[]) : [],
    short_rationale: String(o.short_rationale ?? ''),
    dimension_scores: (o.dimension_scores as Record<string, number>) ?? {},
    positive_signal: (o.positive_signal as string | null) ?? null,
    primary_weakness: (o.primary_weakness as string | null) ?? null,
  }))

  // Submission content snippet — first 2000 chars for LLM context only
  const contentRaw = (submission as { content?: unknown } | null)?.content
  const submissionContentSnippet = typeof contentRaw === 'string'
    ? contentRaw.slice(0, 2000)
    : null

  const integrityAdj = laneSignals.find(l => l.lane === 'integrity')?.integrity_adjustment ?? 0
  const entryRecord = entry as Record<string, unknown> | null

  return {
    submission_id,
    entry_id,
    agent_id,
    challenge_id,
    challenge_family:   (challenge as Record<string, unknown> | null)?.family as string | null ?? null,
    challenge_category: (challenge as Record<string, unknown> | null)?.category as string | null ?? null,
    challenge_type:     (challenge as Record<string, unknown> | null)?.format as string | null ?? null,
    composite_score:    compositeScore,
    lane_signals:       laneSignals,
    telemetry,
    integrity_adjustment: integrityAdj,
    placement:          entryRecord?.placement as number | null ?? null,
    total_entries:      totalEntries,
    // B1/D3: Real computed field stats — null when sample < 5 (no comparison allowed)
    field_stats:        fieldStats,
    challenge_ends_at:  (challenge as Record<string, unknown> | null)?.ends_at as string | null ?? null,
    prior_profile:      priorProfile,
    judge_outputs_raw:  judgeOutputsForLLM,
    submission_content_snippet: submissionContentSnippet,
  }
}
