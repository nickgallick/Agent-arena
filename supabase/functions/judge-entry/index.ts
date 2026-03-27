// judge-entry/index.ts — Phase 1: 5-Lane Judge Architecture
// Forge · 2026-03-27

import { getSupabaseClient } from '../_shared/supabase-client.ts'
import { callLaneJudge, Lane, LEGACY_PROVIDER_MAP } from '../_shared/openrouter-client.ts'
import { detectInjection } from '../_shared/sanitize.ts'

// Format weight profiles — matches calculate_composite_score() in DB
const FORMAT_WEIGHTS: Record<string, { objective: number; process: number; strategy: number; efficiency: number }> = {
  sprint:   { objective: 0.60, process: 0.15, strategy: 0.15, efficiency: 0.10 },
  standard: { objective: 0.50, process: 0.20, strategy: 0.20, efficiency: 0.10 },
  marathon: { objective: 0.40, process: 0.20, strategy: 0.30, efficiency: 0.10 },
  versus:   { objective: 0.35, process: 0.20, strategy: 0.25, efficiency: 0.20 },
}

// Dispute threshold — judge spread that triggers arbitration
const DISPUTE_THRESHOLD = 15

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json()
    const {
      entry_id,
      challenge_id,
      // Support legacy provider param — map to lane
      provider: rawProvider,
      judge_type: legacyJudgeType,
      // New: explicit lane param
      lane: rawLane,
    } = body

    if (!entry_id) {
      return json({ error: 'entry_id required' }, 400)
    }

    // Resolve lane — new param wins, then provider, then legacy judge_type
    let lane: Lane
    if (rawLane && ['process', 'strategy', 'integrity', 'audit'].includes(rawLane)) {
      lane = rawLane as Lane
    } else if (rawProvider && LEGACY_PROVIDER_MAP[rawProvider as keyof typeof LEGACY_PROVIDER_MAP]) {
      lane = LEGACY_PROVIDER_MAP[rawProvider as keyof typeof LEGACY_PROVIDER_MAP] as Lane
    } else if (legacyJudgeType && LEGACY_PROVIDER_MAP[legacyJudgeType as keyof typeof LEGACY_PROVIDER_MAP]) {
      lane = LEGACY_PROVIDER_MAP[legacyJudgeType as keyof typeof LEGACY_PROVIDER_MAP] as Lane
    } else {
      lane = 'process' // default
    }

    const supabase = getSupabaseClient()

    // Fetch entry + challenge
    const { data: entry, error: entryErr } = await supabase
      .from('challenge_entries')
      .select(`
        id, submission_text, challenge_id, challenge_format,
        agent:agents(weight_class_id, model_name),
        challenge:challenges(format, judge_weights)
      `)
      .eq('id', entry_id)
      .single()

    if (entryErr || !entry?.submission_text) {
      return json({ error: 'Entry not found or no submission' }, 404)
    }

    const challengeData = entry.challenge as { format?: string; judge_weights?: Record<string, number> } | null
    const agentData = entry.agent as { weight_class_id?: string; model_name?: string } | null
    const challengeFormat = entry.challenge_format ?? challengeData?.format ?? 'standard'
    const weightClass = agentData?.weight_class_id ?? 'unknown'

    // Pre-flight injection detection
    const injectionFlags = detectInjection(entry.submission_text)

    // Fetch telemetry metrics if available (used to ground Process + Recovery judges)
    const { data: metrics } = await supabase
      .from('run_metrics')
      .select('thrash_rate,revert_ratio,tool_discipline,verification_density,wasted_action_ratio,pivot_count,error_count,test_run_count,total_events,telemetry_process_score,telemetry_recovery_score,telemetry_efficiency_score,pct_explore,pct_implement,pct_verify,pct_recover')
      .eq('entry_id', entry_id)
      .maybeSingle()

    // Build telemetry context string for judges
    let telemetryContext = ''
    if (metrics) {
      telemetryContext = `
TELEMETRY DATA (objective behavioral signals from agent's run — use as evidence):
- Total events: ${metrics.total_events}
- Thrash rate: ${((metrics.thrash_rate ?? 0) * 100).toFixed(1)}% (retries / tool calls — lower is better)
- Revert ratio: ${((metrics.revert_ratio ?? 0) * 100).toFixed(1)}% (reverts / total — lower is better)
- Tool discipline: ${((metrics.tool_discipline ?? 0) * 100).toFixed(1)}% (higher is better)
- Verification density: ${((metrics.verification_density ?? 0) * 100).toFixed(1)}% (test runs / implement steps)
- Wasted action ratio: ${((metrics.wasted_action_ratio ?? 0) * 100).toFixed(1)}%
- Pivot count: ${metrics.pivot_count} | Error count: ${metrics.error_count} | Test runs: ${metrics.test_run_count}
- Phase distribution: explore ${((metrics.pct_explore ?? 0) * 100).toFixed(0)}% / implement ${((metrics.pct_implement ?? 0) * 100).toFixed(0)}% / verify ${((metrics.pct_verify ?? 0) * 100).toFixed(0)}% / recover ${((metrics.pct_recover ?? 0) * 100).toFixed(0)}%
- Computed process score: ${metrics.telemetry_process_score?.toFixed(1) ?? 'N/A'}
- Computed recovery score: ${metrics.telemetry_recovery_score?.toFixed(1) ?? 'N/A'}
- Computed efficiency score: ${metrics.telemetry_efficiency_score?.toFixed(1) ?? 'N/A'}

Your score should be informed by this telemetry. High thrash/revert rates indicate poor process quality. Low verification density indicates skipping tests. Provide evidence_refs citing specific telemetry signals.`
    } else {
      telemetryContext = '\nNOTE: No structured telemetry available for this run. Score based on submission content only.'
    }

    // Build context extra for the judge
    const contextExtra = `Challenge format: ${challengeFormat}. Agent weight class: ${weightClass}.` +
      telemetryContext +
      (injectionFlags.length > 0 ? `\nWARNING: Pre-flight injection signals detected: ${injectionFlags.join(', ')}` : '')

    // === Run the lane judge ===
    const result = await callLaneJudge(lane, entry.submission_text, contextExtra)

    // Merge pre-flight flags
    const allFlags = [...new Set([...injectionFlags, ...result.flags])]

    // Store in judge_outputs (new schema)
    const { data: outputRow, error: outputErr } = await supabase
      .from('judge_outputs')
      .insert({
        entry_id,
        challenge_id: challenge_id ?? entry.challenge_id,
        lane,
        model_id: result.model_id,
        provider: lane, // use lane name as provider in new schema
        score: result.score,
        confidence: result.confidence,
        dimension_scores: result.dimension_scores,
        evidence_refs: result.evidence_refs,
        short_rationale: result.short_rationale,
        flags: allFlags,
        integrity_outcome: result.integrity_outcome ?? null,
        integrity_adjustment: result.integrity_adjustment ?? 0,
        latency_ms: result.latency_ms,
        is_fallback: result.is_fallback,
        fallback_from: result.is_fallback ? lane : null,
        is_arbitration: lane === 'audit',
      })
      .select('id')
      .single()

    if (outputErr) {
      console.error('[judge-entry] judge_outputs insert error:', outputErr.message)
    }

    // Also write to legacy judge_scores for backcompat
    const legacyJudgeType2 = lane === 'process' ? 'alpha'
      : lane === 'strategy' ? 'beta'
      : lane === 'integrity' ? 'gamma'
      : 'tiebreaker'

    await supabase.from('judge_scores').upsert({
      entry_id,
      judge_type: legacyJudgeType2,
      provider: lane,
      lane,
      lane_score: result.score,
      confidence: result.confidence,
      dimension_scores: result.dimension_scores,
      evidence_refs: result.evidence_refs,
      short_rationale: result.short_rationale,
      // Legacy score fields — map from lane score for backcompat
      quality_score: Math.round(result.score / 10),
      creativity_score: Math.round((result.dimension_scores.plan_quality ?? result.score) / 10),
      completeness_score: Math.round((result.dimension_scores.decomposition ?? result.score) / 10),
      practicality_score: Math.round((result.dimension_scores.tool_discipline ?? result.score) / 10),
      overall_score: result.score / 10,
      feedback: result.short_rationale,
      red_flags: allFlags,
      model_used: result.model_id,
      pinned_model_id: result.model_id,
      latency_ms: result.latency_ms,
      is_fallback: result.is_fallback,
      integrity_adjustment: result.integrity_adjustment ?? 0,
      integrity_outcome: result.integrity_outcome ?? null,
    }, { onConflict: 'entry_id,judge_type' })

    // === Check if all 3 primary lanes are complete ===
    const { data: completedLanes } = await supabase
      .from('judge_outputs')
      .select('lane, score, integrity_adjustment, integrity_outcome')
      .eq('entry_id', entry_id)
      .in('lane', ['process', 'strategy', 'integrity'])
      .eq('is_arbitration', false)

    if (completedLanes && completedLanes.length === 3) {
      await handleAllLanesComplete(supabase, entry_id, challenge_id ?? entry.challenge_id, completedLanes, challengeFormat, challengeData?.judge_weights)
    }

    // Log fallback for monitoring
    if (result.is_fallback) {
      console.warn(`[judge-entry] FALLBACK: lane=${lane} used audit model. entry_id=${entry_id}`)
    }

    return json({
      status: 'judged',
      entry_id,
      lane,
      score: result.score,
      model_id: result.model_id,
      is_fallback: result.is_fallback,
      integrity_outcome: result.integrity_outcome,
    })

  } catch (err) {
    console.error('[judge-entry] error:', (err as Error).message)
    return json({ error: (err as Error).message }, 500)
  }
})

// ============================================================
// Handle all 3 primary lanes complete
// ============================================================

async function handleAllLanesComplete(
  supabase: ReturnType<typeof getSupabaseClient>,
  entry_id: string,
  challenge_id: string,
  lanes: Array<{ lane: string; score: number; integrity_adjustment: number | null; integrity_outcome: string | null }>,
  format: string,
  customWeights?: Record<string, number> | null,
) {
  const processRow = lanes.find(l => l.lane === 'process')
  const strategyRow = lanes.find(l => l.lane === 'strategy')
  const integrityRow = lanes.find(l => l.lane === 'integrity')

  const processScore = processRow?.score ?? 0
  const strategyScore = strategyRow?.score ?? 0
  const integrityAdj = integrityRow?.integrity_adjustment ?? 0
  const integrityOutcome = integrityRow?.integrity_outcome ?? 'clean'

  // Weights — custom override or format default
  const weights = resolveWeights(format, customWeights)

  // Fetch telemetry-derived scores for efficiency weighting
  const { data: metrics } = await supabase
    .from('run_metrics')
    .select('telemetry_efficiency_score,telemetry_process_score,telemetry_recovery_score')
    .eq('entry_id', entry_id)
    .maybeSingle()

  // Use telemetry efficiency score if available, else fall back to process score proxy
  const efficiencyScore = metrics?.telemetry_efficiency_score ?? processScore * 0.8

  // If telemetry available, blend telemetry process score with LLM process score
  const blendedProcessScore = metrics?.telemetry_process_score != null
    ? (processScore * 0.6 + metrics.telemetry_process_score * 0.4)
    : processScore

  // Composite: objective is 0 until Phase 3 (deterministic runner)
  const baseScore =
    blendedProcessScore * weights.process +
    strategyScore       * weights.strategy +
    efficiencyScore     * weights.efficiency

  // Clamp integrity adjustment
  const clampedAdj = Math.max(-25, Math.min(10, integrityAdj))
  const compositeScore = Math.max(0, Math.min(100, baseScore + clampedAdj))

  // Check for dispute (spread between process and strategy > DISPUTE_THRESHOLD)
  const spread = Math.abs(processScore - strategyScore)
  const isDisputed = spread > DISPUTE_THRESHOLD

  // Update challenge_entries
  await supabase.from('challenge_entries').update({
    process_score: blendedProcessScore,
    strategy_score: strategyScore,
    integrity_adjustment: clampedAdj,
    efficiency_score: efficiencyScore,
    composite_score: compositeScore,
    final_score: compositeScore / 10, // backcompat: final_score was 0-10
    status: isDisputed ? 'judging' : 'judged',
    dispute_flagged: isDisputed,
    dispute_reason: isDisputed
      ? `Judge spread ${spread.toFixed(1)}pts exceeds threshold (${DISPUTE_THRESHOLD})`
      : null,
    all_revealed_at: new Date().toISOString(),
    reveal_summary: {
      process:   { score: processScore,  rationale: '' },
      strategy:  { score: strategyScore, rationale: '' },
      integrity: { outcome: integrityOutcome, adjustment: clampedAdj },
      composite: compositeScore,
    },
  }).eq('id', entry_id)

  // Disqualifying integrity — override composite to 0
  if (integrityOutcome === 'disqualifying') {
    await supabase.from('challenge_entries').update({
      composite_score: 0,
      final_score: 0,
      status: 'disqualified',
      integrity_flag: 'disqualified',
    }).eq('id', entry_id)
    console.warn(`[judge-entry] DISQUALIFIED entry_id=${entry_id}`)
    return
  }

  if (isDisputed) {
    // Insert dispute flag
    await supabase.from('dispute_flags').insert({
      entry_id,
      challenge_id,
      trigger_reason: 'judge_spread_exceeded',
      score_snapshot: { process: processScore, strategy: strategyScore, spread },
      max_judge_spread: spread,
      prize_locked: false,
    }).select()

    // Queue audit judge
    await supabase.from('job_queue').insert({
      type: 'judge_entry',
      payload: { entry_id, lane: 'audit', challenge_id },
    })

    console.warn(`[judge-entry] DISPUTE: spread=${spread.toFixed(1)} entry_id=${entry_id}`)
    return
  }

  // Run integrity check (existing RPC)
  await supabase.rpc('check_entry_integrity', { p_entry_id: entry_id }).catch(() => {})

  // Check if all entries for this challenge are judged → trigger ratings
  const { count: stillJudging } = await supabase
    .from('challenge_entries')
    .select('id', { count: 'exact', head: true })
    .eq('challenge_id', challenge_id)
    .in('status', ['submitted', 'judging'])

  if (stillJudging === 0) {
    await supabase.from('job_queue').insert({
      type: 'calculate_ratings',
      payload: { challenge_id },
    })
  }
}

// ============================================================
// Resolve judge weights for composite scoring
// ============================================================

function resolveWeights(format: string, customWeights?: Record<string, number> | null) {
  if (customWeights && Object.keys(customWeights).length > 0) {
    return {
      objective:  customWeights.objective  ?? 0.50,
      process:    customWeights.process    ?? 0.20,
      strategy:   customWeights.strategy   ?? 0.20,
      efficiency: customWeights.efficiency ?? 0.10,
    }
  }

  return {
    sprint:   { objective: 0.60, process: 0.15, strategy: 0.15, efficiency: 0.10 },
    standard: { objective: 0.50, process: 0.20, strategy: 0.20, efficiency: 0.10 },
    marathon: { objective: 0.40, process: 0.20, strategy: 0.30, efficiency: 0.10 },
    versus:   { objective: 0.35, process: 0.20, strategy: 0.25, efficiency: 0.20 },
  }[format] ?? { objective: 0.50, process: 0.20, strategy: 0.20, efficiency: 0.10 }
}

// ============================================================
// Helpers
// ============================================================

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
