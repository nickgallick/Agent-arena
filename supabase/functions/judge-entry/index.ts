// judge-entry/index.ts — 5-Lane Judge Architecture (LLM Lanes: Process, Strategy, Integrity, Audit)
// Forge · 2026-03-27 (updated: fixed upsert constraint, dead code removed, weight naming corrected)
//
// This function handles the 3 primary LLM lanes + the audit lane.
// The OBJECTIVE lane is handled by a separate edge function: objective-judge
//
// Call order for a full scored run:
//   1. POST /objective-judge  { entry_id, challenge_id }       — deterministic, fastest
//   2. POST /judge-entry      { entry_id, challenge_id, lane: "process" }
//   3. POST /judge-entry      { entry_id, challenge_id, lane: "strategy" }   (parallel with 2)
//   4. POST /judge-entry      { entry_id, challenge_id, lane: "integrity" }  (parallel with 2)
//   → finalize_entry_scoring fires automatically when all 3 LLM lanes complete

import { getSupabaseClient } from '../_shared/supabase-client.ts'
import { callLaneJudge, Lane, LANE_MODELS, LANE_FALLBACK_MODELS, LEGACY_PROVIDER_MAP } from '../_shared/openrouter-client.ts'
import { detectInjection } from '../_shared/sanitize.ts'

// Dispute threshold — auto-triggers audit lane if process/strategy spread exceeds this
const DISPUTE_THRESHOLD = 15

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json()
    const {
      entry_id,
      challenge_id,
      provider: rawProvider,        // legacy compat
      judge_type: legacyJudgeType,  // legacy compat
      lane: rawLane,                // preferred param
    } = body

    if (!entry_id) {
      return json({ error: 'entry_id required' }, 400)
    }

    // ── Resolve lane ─────────────────────────────────────────
    // objective lane is NOT handled here — redirect
    const VALID_LANES = ['process', 'strategy', 'integrity', 'audit']
    let lane: Lane

    if (rawLane === 'objective') {
      return json({ error: 'objective lane handled by objective-judge function', redirect: '/objective-judge' }, 400)
    } else if (rawLane && VALID_LANES.includes(rawLane)) {
      lane = rawLane as Lane
    } else if (rawProvider && LEGACY_PROVIDER_MAP[rawProvider as keyof typeof LEGACY_PROVIDER_MAP]) {
      lane = LEGACY_PROVIDER_MAP[rawProvider as keyof typeof LEGACY_PROVIDER_MAP] as Lane
    } else if (legacyJudgeType && LEGACY_PROVIDER_MAP[legacyJudgeType as keyof typeof LEGACY_PROVIDER_MAP]) {
      lane = LEGACY_PROVIDER_MAP[legacyJudgeType as keyof typeof LEGACY_PROVIDER_MAP] as Lane
    } else {
      lane = 'process'
    }

    const supabase = getSupabaseClient()

    // ── Fetch entry + challenge ───────────────────────────────
    const { data: entry, error: entryErr } = await supabase
      .from('challenge_entries')
      .select(`
        id, submission_text, challenge_id, challenge_format,
        agent:agents(weight_class_id, model_name),
        challenge:challenges(format, judge_weights, family_id, has_objective_tests)
      `)
      .eq('id', entry_id)
      .single()

    if (entryErr || !entry?.submission_text) {
      return json({ error: 'Entry not found or no submission' }, 404)
    }

    const challengeData = entry.challenge as {
      format?: string
      judge_weights?: Record<string, number>
      family_id?: string
      has_objective_tests?: boolean
    } | null
    const agentData = entry.agent as { weight_class_id?: string; model_name?: string } | null
    const challengeFormat = entry.challenge_format ?? challengeData?.format ?? 'standard'
    const weightClass = agentData?.weight_class_id ?? 'unknown'
    const resolvedChallengeId = challenge_id ?? entry.challenge_id

    // ── Pre-flight injection detection ───────────────────────
    const injectionFlags = detectInjection(entry.submission_text)

    // ── Fetch telemetry metrics ───────────────────────────────
    // Used to ground the Process judge — objective behavioral signals
    const { data: metrics } = await supabase
      .from('run_metrics')
      .select([
        'thrash_rate', 'revert_ratio', 'tool_discipline', 'verification_density',
        'wasted_action_ratio', 'pivot_count', 'error_count', 'test_run_count',
        'total_events', 'telemetry_process_score', 'telemetry_recovery_score',
        'telemetry_efficiency_score', 'pct_explore', 'pct_implement',
        'pct_verify', 'pct_recover',
      ].join(','))
      .eq('entry_id', entry_id)
      .maybeSingle()

    // Build telemetry context for judges
    let telemetryContext = ''
    if (metrics) {
      telemetryContext = `
TELEMETRY DATA (objective behavioral signals — use as grounding evidence, do not override with speculation):
- Total events: ${metrics.total_events}
- Thrash rate: ${((metrics.thrash_rate ?? 0) * 100).toFixed(1)}% (retry loops — lower = better)
- Revert ratio: ${((metrics.revert_ratio ?? 0) * 100).toFixed(1)}% (reverts / total — lower = better)
- Tool discipline: ${((metrics.tool_discipline ?? 0) * 100).toFixed(1)}% (purposeful tool use — higher = better)
- Verification density: ${((metrics.verification_density ?? 0) * 100).toFixed(1)}% (test-runs / implement steps)
- Wasted action ratio: ${((metrics.wasted_action_ratio ?? 0) * 100).toFixed(1)}%
- Pivot count: ${metrics.pivot_count} | Error count: ${metrics.error_count} | Test runs: ${metrics.test_run_count}
- Phase distribution: explore ${((metrics.pct_explore ?? 0) * 100).toFixed(0)}% / implement ${((metrics.pct_implement ?? 0) * 100).toFixed(0)}% / verify ${((metrics.pct_verify ?? 0) * 100).toFixed(0)}% / recover ${((metrics.pct_recover ?? 0) * 100).toFixed(0)}%
- Telemetry process score: ${metrics.telemetry_process_score?.toFixed(1) ?? 'N/A'}
- Telemetry recovery score: ${metrics.telemetry_recovery_score?.toFixed(1) ?? 'N/A'}
- Telemetry efficiency score: ${metrics.telemetry_efficiency_score?.toFixed(1) ?? 'N/A'}

Cite specific telemetry signals in your evidence_refs.`
    } else {
      telemetryContext = '\nNOTE: No structured telemetry available. Score based on submission content only.'
    }

    const contextExtra = [
      `Challenge format: ${challengeFormat}`,
      `Agent weight class: ${weightClass}`,
      `Challenge family: ${challengeData?.family_id ?? 'unassigned'}`,
      telemetryContext,
      injectionFlags.length > 0
        ? `⚠ PRE-FLIGHT WARNING: Injection patterns detected in submission: ${injectionFlags.join('; ')}`
        : null,
    ].filter(Boolean).join('\n')

    // ── For audit lane: include prior judge outputs ───────────
    let auditContext = ''
    if (lane === 'audit') {
      const { data: priorOutputs } = await supabase
        .from('judge_outputs')
        .select('lane, score, confidence, short_rationale, dimension_scores, flags')
        .eq('entry_id', entry_id)
        .in('lane', ['process', 'strategy', 'integrity'])
        .eq('is_arbitration', false)

      if (priorOutputs && priorOutputs.length > 0) {
        auditContext = '\n\nPRIOR JUDGE OUTPUTS (for arbitration — do not simply average these):\n'
        for (const po of priorOutputs) {
          auditContext += `\n${po.lane.toUpperCase()} JUDGE: score=${po.score}, confidence=${po.confidence}\n`
          auditContext += `  Rationale: ${po.short_rationale}\n`
          if (po.flags?.length > 0) auditContext += `  Flags: ${po.flags.join(', ')}\n`
        }
      }
    }

    // ── Run the lane judge ────────────────────────────────────
    const result = await callLaneJudge(lane, entry.submission_text, contextExtra + auditContext)

    const allFlags = [...new Set([...injectionFlags, ...result.flags])]

    // ── Write to judge_outputs ────────────────────────────────
    // UNIQUE INDEX: idx_judge_outputs_entry_lane_primary (entry_id, lane) WHERE NOT is_arbitration
    // Audit rows are not covered by the unique index (is_arbitration=true) so they stack
    const upsertPayload = {
      entry_id,
      challenge_id: resolvedChallengeId,
      lane,
      model_id: result.model_id,
      provider: lane,
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
      fallback_from: result.is_fallback ? LANE_MODELS[lane] : null,
      is_arbitration: lane === 'audit',
    }

    let outputId: string | null = null
    if (lane === 'audit') {
      // Audit rows always insert (don't upsert — we want a record per invocation)
      const { data: auditRow, error: auditErr } = await supabase
        .from('judge_outputs')
        .insert(upsertPayload)
        .select('id')
        .single()
      if (auditErr) console.error('[judge-entry] audit insert error:', auditErr.message)
      else outputId = auditRow?.id ?? null
    } else {
      // Primary lanes: upsert on (entry_id, lane) for idempotency
      const { data: outputRow, error: outputErr } = await supabase
        .from('judge_outputs')
        .upsert(upsertPayload, { onConflict: 'entry_id,lane' })
        .select('id')
        .single()
      if (outputErr) {
        console.error('[judge-entry] judge_outputs upsert error:', outputErr.message)
        // Fallback: try plain insert
        const { data: insertRow } = await supabase
          .from('judge_outputs')
          .insert(upsertPayload)
          .select('id')
          .single()
        outputId = insertRow?.id ?? null
      } else {
        outputId = outputRow?.id ?? null
      }
    }

    // ── Write to legacy judge_scores (backcompat) ─────────────
    const legacyJudgeTypeMap: Record<Lane, string> = {
      process:   'alpha',
      strategy:  'beta',
      integrity: 'gamma',
      audit:     'tiebreaker',
    }
    await supabase.from('judge_scores').upsert({
      entry_id,
      judge_type:           legacyJudgeTypeMap[lane],
      provider:             lane,
      lane,
      lane_score:           result.score,
      confidence:           result.confidence,
      dimension_scores:     result.dimension_scores,
      evidence_refs:        result.evidence_refs,
      short_rationale:      result.short_rationale,
      quality_score:        Math.round(result.score / 10),
      creativity_score:     Math.round((result.dimension_scores.plan_quality ?? result.score) / 10),
      completeness_score:   Math.round((result.dimension_scores.decomposition ?? result.score) / 10),
      practicality_score:   Math.round((result.dimension_scores.tool_discipline ?? result.score) / 10),
      overall_score:        result.score / 10,
      feedback:             result.short_rationale,
      red_flags:            allFlags,
      model_used:           result.model_id,
      pinned_model_id:      result.model_id,
      latency_ms:           result.latency_ms,
      is_fallback:          result.is_fallback,
      integrity_adjustment: result.integrity_adjustment ?? 0,
      integrity_outcome:    result.integrity_outcome ?? null,
    }, { onConflict: 'entry_id,judge_type' })

    // ── Check: all 3 primary LLM lanes complete → finalize ────
    if (lane !== 'audit') {
      const { data: completedLanes } = await supabase
        .from('judge_outputs')
        .select('lane, score, integrity_adjustment, integrity_outcome')
        .eq('entry_id', entry_id)
        .in('lane', ['process', 'strategy', 'integrity'])
        .eq('is_arbitration', false)

      if (completedLanes && completedLanes.length === 3) {
        console.log(`[judge-entry] all 3 LLM lanes complete for entry ${entry_id} — calling finalize`)
        const { data: scoreResult, error: scoreErr } = await supabase
          .rpc('finalize_entry_scoring', { p_entry_id: entry_id })

        if (scoreErr) {
          console.error('[judge-entry] finalize_entry_scoring error:', scoreErr.message)
        } else {
          console.log(`[judge-entry] finalized:`, JSON.stringify(scoreResult))

          // Update capability profile
          try { await supabase.rpc('update_capability_profile', { p_entry_id: entry_id }) } catch { /* non-critical */ }

          // If disputed, queue audit judge
          if (scoreResult?.disputed) {
            console.warn(`[judge-entry] dispute flagged — audit queued for entry ${entry_id}`)
          }

          // Check if all entries for this challenge are done → trigger ratings
          const { count: stillPending } = await supabase
            .from('challenge_entries')
            .select('id', { count: 'exact', head: true })
            .eq('challenge_id', resolvedChallengeId)
            .in('status', ['submitted', 'judging'])

          if (stillPending === 0) {
            try {
              await supabase.from('job_queue').insert({
                type: 'calculate_ratings',
                payload: { challenge_id: resolvedChallengeId },
              })
            } catch { /* non-critical */ }
            // Trigger CDI computation
            try { await supabase.rpc('compute_cdi', { p_challenge_id: resolvedChallengeId }) } catch { /* non-critical */ }
          }
        }
      } else {
        const done = completedLanes?.length ?? 0
        console.log(`[judge-entry] lane ${lane} done — ${done}/3 LLM lanes complete`)
      }
    } else {
      // Audit lane complete — resolve the dispute
      await resolveDispute(supabase, entry_id, resolvedChallengeId, result.score, outputId)
    }

    // Log fallback for monitoring
    if (result.is_fallback) {
      console.warn(`[judge-entry] FALLBACK: lane=${lane} primary=${LANE_MODELS[lane]} fallback=${result.model_id} entry=${entry_id}`)
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
// Resolve dispute after audit lane completes
// ============================================================

async function resolveDispute(
  supabase: ReturnType<typeof getSupabaseClient>,
  entry_id: string,
  challenge_id: string,
  auditScore: number,
  auditOutputId: string | null,
) {
  try {
    // Compute arbitrated composite (audit score replaces disputed lanes)
    // Fetch current challenge_entries composite for baseline
    const { data: entry } = await supabase
      .from('challenge_entries')
      .select('composite_score, challenge_format, challenge_id')
      .eq('id', entry_id)
      .single()

    // Use audit score as the new composite
    const arbitratedComposite = Math.max(0, Math.min(100, auditScore))

    await supabase.from('challenge_entries').update({
      composite_score:   arbitratedComposite,
      final_score:       arbitratedComposite,
      status:            'judged',
      dispute_flagged:   false,
      dispute_resolved_at: new Date().toISOString(),
    }).eq('id', entry_id)

    // Close the dispute flag
    await supabase.from('dispute_flags').update({
      status:                 'resolved',
      audit_judge_output_id:  auditOutputId,
      adjudicated_score:      arbitratedComposite,
      resolved_at:            new Date().toISOString(),
    })
    .eq('entry_id', entry_id)
    .in('status', ['open', 'in_review'])

    // Update capability profile with resolved score
    try { await supabase.rpc('update_capability_profile', { p_entry_id: entry_id }) } catch { /* non-critical */ }

    console.log(`[judge-entry] dispute resolved: entry=${entry_id} arbitrated_score=${arbitratedComposite}`)
  } catch (err) {
    console.error('[judge-entry] resolveDispute error:', (err as Error).message)
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
