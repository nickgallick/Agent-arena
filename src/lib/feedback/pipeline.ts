// Feedback Pipeline Orchestrator
// Forge · 2026-03-31
//
// Coordinates all 4 stages in sequence. Writes to DB at each stage so
// partial results are available if a later stage fails.
//
// Pipeline:
//   1. extractSignals()        — DB reads, no LLM
//   2. synthesizeDiagnosis()   — LLM (Claude) — forensic analysis
//   3. translateCoaching()     — LLM (Claude) — actionable coaching
//   4. buildEvidenceRefs()     — pure computation from signals + diagnosis
//   5. updateLongitudinalProfile() — DB writes, rolling averages
//   6. persistReport()         — write final report to all 7 tables
//
// Idempotent: if a report already exists for submission_id, skip unless force=true.

import type { SupabaseClient } from '@supabase/supabase-js'
import { extractSignals } from './signal-extractor'
import { synthesizeDiagnosis } from './diagnosis-synthesizer'
import { translateCoaching } from './coaching-translator'
import { updateLongitudinalProfile } from './longitudinal-updater'
import { buildEvidenceRefs } from './evidence-builder'
import type { FeedbackReport, AgentLongitudinalSummary, FailureModeCode, ImprovementTrend, RegressionWarning, RecentBout } from './types'
import { FAILURE_MODE_LABELS } from './types'

export interface FeedbackPipelineOpts {
  submission_id: string
  entry_id: string | null
  agent_id: string
  challenge_id: string
  challenge_title?: string | null
  force?: boolean        // Re-run even if report exists
}

export async function runFeedbackPipeline(
  supabase: SupabaseClient,
  opts: FeedbackPipelineOpts
): Promise<{ report_id: string; status: 'ready' | 'failed' }> {
  const { submission_id, entry_id, agent_id, challenge_id, challenge_title, force } = opts

  // Check for existing report
  if (!force) {
    const { data: existing } = await supabase
      .from('submission_feedback_reports')
      .select('id, status')
      .eq('submission_id', submission_id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing && existing.status === 'ready') {
      return { report_id: existing.id as string, status: 'ready' }
    }
  }

  // Create or update report row with status=generating
  const { data: reportRow, error: createError } = await supabase
    .from('submission_feedback_reports')
    .upsert({
      submission_id,
      entry_id,
      status: 'generating',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'submission_id' })
    .select('id')
    .single()

  if (createError || !reportRow) {
    console.error('[feedback/pipeline] Failed to create report row:', createError?.message)
    return { report_id: '', status: 'failed' }
  }

  const report_id = reportRow.id as string
  const pipelineStart = Date.now()

  try {
    // ── Stage 1: Signal Extraction ─────────────────────────────────────────────
    const signals = await extractSignals(supabase, {
      submission_id,
      entry_id,
      agent_id,
      challenge_id,
    })

    // ── Stage 2: Diagnosis Synthesis (LLM) ────────────────────────────────────
    const diagnosis = await synthesizeDiagnosis(signals)

    // ── Stage 3: Coaching Translation (LLM) ───────────────────────────────────
    const coaching = await translateCoaching(diagnosis, signals)

    // ── Stage 4: Evidence Building ────────────────────────────────────────────
    const evidenceRefs = buildEvidenceRefs(signals, diagnosis)

    // ── Stage 5: Longitudinal Profile Update ──────────────────────────────────
    let longitudinal: AgentLongitudinalSummary | null = null
    try {
      longitudinal = await updateLongitudinalProfile(supabase, {
        agent_id,
        submission_id,
        entry_id,
        diagnosis,
        signals,
        challenge_title,
      })
    } catch (err) {
      // Longitudinal failure must never block the main report
      console.error('[feedback/pipeline] Longitudinal update failed (non-fatal):', err)
    }

    const generationMs = Date.now() - pipelineStart

    // ── Stage 6: Persist report ────────────────────────────────────────────────

    // 6a: Update main report row
    await supabase.from('submission_feedback_reports').update({
      entry_id,
      status: 'ready',
      overall_summary:       diagnosis.overall_summary,
      executive_diagnosis:   diagnosis.executive_diagnosis,
      result_narrative:      diagnosis.result_narrative,
      primary_loss_driver:   diagnosis.primary_loss_driver,
      secondary_loss_driver: diagnosis.secondary_loss_driver,
      decisive_moment:       diagnosis.decisive_moment,
      dominant_strength:     diagnosis.dominant_strength,
      dominant_weakness:     diagnosis.dominant_weakness,
      highest_leverage_fix:  coaching.highest_leverage_fix,
      next_best_fix:         coaching.next_best_fix,
      confidence_overall:    diagnosis.confidence_overall,
      evidence_density_score: diagnosis.evidence_density_score,
      ambiguity_level:       diagnosis.ambiguity_level,
      generated_by_model:    'anthropic/claude-sonnet-4-6',
      generation_ms:         generationMs,
      pipeline_version:      'v1',
      updated_at:            new Date().toISOString(),
    }).eq('id', report_id)

    // 6b: Lane feedback — delete existing first (upsert by submission_id+lane)
    await supabase.from('submission_lane_feedback')
      .delete()
      .eq('submission_id', submission_id)

    if (diagnosis.lane_diagnoses.length > 0) {
      await supabase.from('submission_lane_feedback').insert(
        diagnosis.lane_diagnoses.map(ld => ({
          submission_id,
          entry_id,
          feedback_report_id: report_id,
          lane:                     ld.lane,
          score:                    ld.score,
          percentile:               ld.percentile,
          confidence:               ld.confidence,
          strongest_behavior:       ld.strongest_behavior,
          weakest_behavior:         ld.weakest_behavior,
          primary_driver:           ld.primary_driver,
          secondary_driver:         ld.secondary_driver,
          what_went_right:          ld.what_went_right,
          what_went_wrong:          ld.what_went_wrong,
          what_this_means:          ld.what_this_means,
          improvement_recommendation: ld.improvement_recommendation,
          evidence_refs_json:       ld.evidence_refs,
        }))
      )
    }

    // 6c: Failure modes
    await supabase.from('submission_failure_modes')
      .delete()
      .eq('submission_id', submission_id)

    if (diagnosis.failure_modes.length > 0) {
      await supabase.from('submission_failure_modes').insert(
        diagnosis.failure_modes.map(fm => ({
          submission_id,
          entry_id,
          feedback_report_id: report_id,
          failure_mode_code:  fm.failure_mode_code,
          severity:           fm.severity,
          confidence:         fm.confidence,
          primary_flag:       fm.primary_flag,
          explanation:        fm.explanation,
          evidence_refs_json: [fm.evidence_signal],
        }))
      )
    }

    // 6d: Improvement priorities
    await supabase.from('submission_improvement_priorities')
      .delete()
      .eq('submission_id', submission_id)

    if (coaching.improvement_priorities.length > 0) {
      await supabase.from('submission_improvement_priorities').insert(
        coaching.improvement_priorities.map(ip => ({
          submission_id,
          entry_id,
          feedback_report_id:       report_id,
          priority_rank:            ip.priority_rank,
          priority_tier:            ip.priority_tier,
          title:                    ip.title,
          recommendation:           ip.recommendation,
          rationale:                ip.rationale,
          expected_impact:          ip.expected_impact,
          implementation_difficulty: ip.implementation_difficulty,
          lane_target:              ip.lane_target,
        }))
      )
    }

    // 6e: Evidence refs
    await supabase.from('submission_evidence_refs')
      .delete()
      .eq('submission_id', submission_id)

    if (evidenceRefs.length > 0) {
      await supabase.from('submission_evidence_refs').insert(
        evidenceRefs.map(ref => ({
          submission_id,
          entry_id,
          feedback_report_id: report_id,
          ref_type:           ref.ref_type,
          ref_key:            ref.ref_key,
          label:              ref.label,
          excerpt:            ref.excerpt,
          relevance:          ref.relevance,
          metadata_json:      ref.metadata,
        }))
      )
    }

    return { report_id, status: 'ready' }

  } catch (err) {
    console.error('[feedback/pipeline] Pipeline failed:', err)
    await supabase.from('submission_feedback_reports').update({
      status: 'failed',
      error_message: err instanceof Error ? err.message : String(err),
      updated_at: new Date().toISOString(),
    }).eq('id', report_id)
    return { report_id, status: 'failed' }
  }
}

// ─────────────────────────────────────────────
// Read a completed report from DB
// ─────────────────────────────────────────────

export async function loadFeedbackReport(
  supabase: SupabaseClient,
  submission_id: string
): Promise<FeedbackReport | null> {
  const { data: report } = await supabase
    .from('submission_feedback_reports')
    .select('*')
    .eq('submission_id', submission_id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!report) return null

  const r = report as Record<string, unknown>
  const report_id = String(r.id)

  // Parallel load of child tables
  const [laneFeedback, failureModes, improvementPriorities, evidenceRefs, agentProfile] = await Promise.all([
    supabase
      .from('submission_lane_feedback')
      .select('*')
      .eq('submission_id', submission_id)
      .order('lane'),

    supabase
      .from('submission_failure_modes')
      .select('*')
      .eq('submission_id', submission_id)
      .order('primary_flag', { ascending: false }),

    supabase
      .from('submission_improvement_priorities')
      .select('*')
      .eq('submission_id', submission_id)
      .order('priority_rank'),

    supabase
      .from('submission_evidence_refs')
      .select('*')
      .eq('submission_id', submission_id)
      .order('ref_type'),

    // Agent profile — requires joining via the entry's agent_id
    r.entry_id
      ? supabase
          .from('challenge_entries')
          .select('agent_id')
          .eq('id', String(r.entry_id))
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  // Load agent performance profile if we have agent_id
  let longitudinal = null
  const entryData = agentProfile.data as { agent_id?: string } | null
  if (entryData?.agent_id) {
    const { data: profile } = await supabase
      .from('agent_performance_profiles')
      .select('*')
      .eq('agent_id', entryData.agent_id)
      .maybeSingle()

    if (profile) {
      const p = profile as Record<string, unknown>
      longitudinal = {
        total_bouts:             Number(p.total_bouts ?? 0),
        rolling_overall_score:   p.rolling_overall_score != null ? Number(p.rolling_overall_score) : null,
        lane_trends:             p.lane_trends_json ? Object.entries(p.lane_trends_json as Record<string, Record<string,unknown>>).map(([lane, d]) => ({
          lane,
          scores: Array.isArray(d.scores) ? d.scores as number[] : [],
          trend_direction: String(d.trend_direction ?? 'stable') as 'improving'|'declining'|'stable'|'volatile',
          current_avg: d.current_avg != null ? Number(d.current_avg) : null,
        })) : [],
        recurring_strengths:     Array.isArray(p.recurring_strengths_json) ? (p.recurring_strengths_json as Record<string,unknown>[]).map(s => ({
          code: String(s.label ?? '').slice(0, 30),
          label: String(s.label ?? ''),
          count: Number(s.count ?? 0),
          last_seen: s.last_seen ? String(s.last_seen) : null,
        })) : [],
        recurring_weaknesses:    Array.isArray(p.recurring_weaknesses_json) ? (p.recurring_weaknesses_json as Record<string,unknown>[]).map(w => ({
          code: String(w.label ?? '').slice(0, 30),
          label: String(w.label ?? ''),
          count: Number(w.count ?? 0),
          last_seen: w.last_seen ? String(w.last_seen) : null,
        })) : [],
        recurring_failure_modes: Array.isArray(p.recurring_failure_modes_json) ? (p.recurring_failure_modes_json as Record<string,unknown>[]).map(f => ({
          failure_mode_code: String(f.code ?? '') as FailureModeCode,
          label: (FAILURE_MODE_LABELS as Record<string,string>)[String(f.code ?? '')] ?? String(f.code ?? ''),
          count: Number(f.count ?? 0),
          last_seen: f.last_seen ? String(f.last_seen) : null,
          severity: Number(f.count ?? 0) >= 3 ? 'high' : Number(f.count ?? 0) >= 2 ? 'medium' : 'low',
        })) : [],
        improvement_trends:       Array.isArray(p.improvement_trends_json) ? (p.improvement_trends_json as ImprovementTrend[]) : [],
        regression_warnings:      Array.isArray(p.regression_warnings_json) ? (p.regression_warnings_json as RegressionWarning[]) : [],
        challenge_type_performance: p.challenge_type_performance_json ? Object.entries(p.challenge_type_performance_json as Record<string,Record<string,unknown>>).map(([type, d]) => ({
          type,
          avg_score: Number(d.avg_score ?? 0),
          count: Number(d.count ?? 0),
          trend: String(d.trend ?? 'stable') as 'improving'|'declining'|'stable',
        })) : [],
        score_volatility:         p.score_volatility != null ? Number(p.score_volatility) : null,
        recent_bouts:             Array.isArray(p.recent_bouts_json) ? (p.recent_bouts_json as RecentBout[]) : [],
      }
    }
  }

  const toStr = (v: unknown) => v != null ? String(v) : null

  return {
    report_id,
    submission_id: String(r.submission_id ?? ''),
    entry_id: r.entry_id ? String(r.entry_id) : null,
    version: Number(r.version ?? 1),
    status: String(r.status ?? 'pending') as FeedbackReport['status'],

    overall_summary:       toStr(r.overall_summary),
    executive_diagnosis:   toStr(r.executive_diagnosis),
    result_narrative:      toStr(r.result_narrative),
    primary_loss_driver:   toStr(r.primary_loss_driver),
    secondary_loss_driver: toStr(r.secondary_loss_driver),
    decisive_moment:       toStr(r.decisive_moment),
    dominant_strength:     toStr(r.dominant_strength),
    dominant_weakness:     toStr(r.dominant_weakness),
    confidence_overall:    (['high','medium','low'].includes(String(r.confidence_overall ?? '')) ? String(r.confidence_overall) : 'medium') as 'high'|'medium'|'low',
    evidence_density_score: r.evidence_density_score != null ? Number(r.evidence_density_score) : null,
    ambiguity_level:       (['low','medium','high'].includes(String(r.ambiguity_level ?? '')) ? String(r.ambiguity_level) : 'medium') as 'low'|'medium'|'high',

    highest_leverage_fix:  toStr(r.highest_leverage_fix),
    next_best_fix:         toStr(r.next_best_fix),

    improvement_priorities: (improvementPriorities.data ?? []).map((ip: Record<string, unknown>) => ({
      priority_rank:            Number(ip.priority_rank),
      priority_tier:            String(ip.priority_tier) as 'fix_first'|'fix_next'|'stretch',
      title:                    String(ip.title),
      recommendation:           String(ip.recommendation),
      rationale:                String(ip.rationale ?? ''),
      expected_impact:          String(ip.expected_impact) as 'high'|'medium'|'low',
      implementation_difficulty: String(ip.implementation_difficulty) as 'low'|'medium'|'high',
      lane_target:              String(ip.lane_target) as 'objective'|'process'|'strategy'|'integrity'|'all',
    })),

    lane_feedback: (laneFeedback.data ?? []).map((lf: Record<string, unknown>) => ({
      lane:                      String(lf.lane),
      score:                     Number(lf.score ?? 0),
      percentile:                lf.percentile != null ? Number(lf.percentile) : null,
      confidence:                String(lf.confidence ?? 'medium') as 'high'|'medium'|'low',
      strongest_behavior:        String(lf.strongest_behavior ?? ''),
      weakest_behavior:          String(lf.weakest_behavior ?? ''),
      primary_driver:            String(lf.primary_driver ?? ''),
      secondary_driver:          lf.secondary_driver ? String(lf.secondary_driver) : null,
      what_went_right:           String(lf.what_went_right ?? ''),
      what_went_wrong:           String(lf.what_went_wrong ?? ''),
      what_this_means:           String(lf.what_this_means ?? ''),
      improvement_recommendation: String(lf.improvement_recommendation ?? ''),
      evidence_refs:             Array.isArray(lf.evidence_refs_json) ? (lf.evidence_refs_json as string[]) : [],
    })),

    failure_modes: (failureModes.data ?? []).map((fm: Record<string, unknown>) => ({
      failure_mode_code:  String(fm.failure_mode_code) as import('./types').FailureModeCode,
      severity:           String(fm.severity) as 'critical'|'high'|'medium'|'low',
      confidence:         String(fm.confidence) as 'high'|'medium'|'low',
      primary_flag:       Boolean(fm.primary_flag),
      explanation:        String(fm.explanation ?? ''),
      evidence_signal:    Array.isArray(fm.evidence_refs_json) ? String(fm.evidence_refs_json[0] ?? '') : '',
    })),

    decisive_positive_factors: [],
    decisive_negative_factors: [],
    competitive_comparison: null,

    evidence_refs: (evidenceRefs.data ?? []).map((er: Record<string, unknown>) => ({
      ref_type:  String(er.ref_type) as import('./types').EvidenceRef['ref_type'],
      ref_key:   er.ref_key ? String(er.ref_key) : null,
      label:     String(er.label ?? ''),
      excerpt:   er.excerpt ? String(er.excerpt) : null,
      relevance: er.relevance ? String(er.relevance) : null,
      metadata:  (er.metadata_json as Record<string,unknown>) ?? {},
    })),

    longitudinal,

    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
  }
}
