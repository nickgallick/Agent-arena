// Evidence Builder — assembles EvidenceRef[] from signals
// Forge · 2026-03-31
//
// Turns raw signals (lane outputs, telemetry, flags, metrics) into
// inspectable evidence refs that the UI can display.
// These give the user confidence that every claim is grounded in data.

import type { ExtractedSignals, DiagnosisOutput, EvidenceRef } from './types'

export function buildEvidenceRefs(
  signals: ExtractedSignals,
  diagnosis: DiagnosisOutput
): EvidenceRef[] {
  const refs: EvidenceRef[] = []

  // Lane score evidence
  for (const ls of signals.lane_signals) {
    refs.push({
      ref_type: 'lane_score',
      ref_key: `lane_${ls.lane}`,
      label: `${ls.lane.charAt(0).toUpperCase() + ls.lane.slice(1)} Lane Score`,
      excerpt: `Score: ${ls.score.toFixed(0)}/100 | Confidence: ${ls.confidence} | Flags: ${ls.flags.join(', ') || 'none'}`,
      relevance: `Direct contributor to composite score via ${ls.lane} lane weight`,
      metadata: {
        lane: ls.lane,
        score: ls.score,
        confidence: ls.confidence,
        flags: ls.flags,
        dimension_scores: ls.dimension_scores,
      },
    })

    // Flag evidence
    for (const flag of ls.flags) {
      refs.push({
        ref_type: 'rule_check',
        ref_key: `flag_${ls.lane}_${flag}`,
        label: `Flag: ${flag.replace(/_/g, ' ')}`,
        excerpt: `${flag} was triggered in the ${ls.lane} lane`,
        relevance: `This flag contributed to score reduction in ${ls.lane}`,
        metadata: { lane: ls.lane, flag, score_impact: 'negative' },
      })
    }

    // Rationale
    if (ls.rationale && ls.rationale.length > 15) {
      refs.push({
        ref_type: 'judge_note',
        ref_key: `rationale_${ls.lane}`,
        label: `${ls.lane.charAt(0).toUpperCase() + ls.lane.slice(1)} Judge Note`,
        excerpt: ls.rationale.slice(0, 300),
        relevance: `Judge's direct assessment of ${ls.lane} performance`,
        metadata: { lane: ls.lane },
      })
    }

    // Dimension scores (highlight outliers)
    const dims = Object.entries(ls.dimension_scores)
    const lowDims = dims.filter(([, v]) => v < 40)
    const highDims = dims.filter(([, v]) => v >= 75)

    for (const [dim, val] of highDims.slice(0, 2)) {
      refs.push({
        ref_type: 'metric_signal',
        ref_key: `dim_high_${ls.lane}_${dim}`,
        label: `Strong: ${dim.replace(/_/g, ' ')} (${ls.lane})`,
        excerpt: `${dim}: ${val}/100 — top dimension in ${ls.lane} lane`,
        relevance: `High-performing dimension in ${ls.lane}`,
        metadata: { lane: ls.lane, dimension: dim, value: val, direction: 'positive' },
      })
    }
    for (const [dim, val] of lowDims.slice(0, 2)) {
      refs.push({
        ref_type: 'metric_signal',
        ref_key: `dim_low_${ls.lane}_${dim}`,
        label: `Weak: ${dim.replace(/_/g, ' ')} (${ls.lane})`,
        excerpt: `${dim}: ${val}/100 — weakest dimension in ${ls.lane} lane`,
        relevance: `Low-performing dimension in ${ls.lane}`,
        metadata: { lane: ls.lane, dimension: dim, value: val, direction: 'negative' },
      })
    }
  }

  // Telemetry evidence
  if (signals.telemetry) {
    const t = signals.telemetry

    if (t.thrash_rate > 0.25) {
      refs.push({
        ref_type: 'metric_signal',
        ref_key: 'telemetry_thrash',
        label: `High Thrash Rate: ${(t.thrash_rate * 100).toFixed(0)}%`,
        excerpt: `Agent thrash rate was ${(t.thrash_rate * 100).toFixed(0)}% (${t.retry_count ?? '?'} retries, ${t.revert_count ?? '?'} reverts across ${t.total_events} events)`,
        relevance: 'High thrash rate indicates excessive direction changes — correlated with process score loss',
        metadata: { thrash_rate: t.thrash_rate, total_events: t.total_events },
      })
    }

    if (t.verification_density < 0.08) {
      refs.push({
        ref_type: 'metric_signal',
        ref_key: 'telemetry_verify_low',
        label: `Low Verification Density: ${(t.verification_density * 100).toFixed(0)}%`,
        excerpt: `Only ${(t.verification_density * 100).toFixed(0)}% of session actions were verification steps`,
        relevance: 'Low verification density is a strong predictor of hidden test failures and validation_omission failure mode',
        metadata: { verification_density: t.verification_density },
      })
    }

    if (t.pct_verify < 0.05 && t.total_events > 15) {
      refs.push({
        ref_type: 'timing_event',
        ref_key: 'telemetry_phase_verify',
        label: `Verify Phase: ${(t.pct_verify * 100).toFixed(0)}% of session`,
        excerpt: `Agent spent ${(t.pct_verify * 100).toFixed(0)}% in verify phase vs ${(t.pct_implement * 100).toFixed(0)}% implementing`,
        relevance: 'Verify/implement ratio indicates whether the agent self-checks its work',
        metadata: {
          pct_verify: t.pct_verify,
          pct_implement: t.pct_implement,
          pct_recover: t.pct_recover,
          pct_explore: t.pct_explore,
        },
      })
    }

    if (t.wasted_action_ratio > 0.35) {
      refs.push({
        ref_type: 'metric_signal',
        ref_key: 'telemetry_waste',
        label: `Wasted Action Ratio: ${(t.wasted_action_ratio * 100).toFixed(0)}%`,
        excerpt: `${(t.wasted_action_ratio * 100).toFixed(0)}% of actions were classified as wasted (non-productive tool calls or reverts)`,
        relevance: 'High waste ratio reduces effective session budget and correlates with efficiency score loss',
        metadata: { wasted_action_ratio: t.wasted_action_ratio },
      })
    }
  }

  // Integrity signal
  const integritySignal = signals.lane_signals.find(l => l.lane === 'integrity')
  if (integritySignal && Math.abs(signals.integrity_adjustment) > 0) {
    refs.push({
      ref_type: 'integrity_mismatch',
      ref_key: 'integrity_adjustment',
      label: `Integrity Adjustment: ${signals.integrity_adjustment > 0 ? '+' : ''}${signals.integrity_adjustment}`,
      excerpt: `Integrity outcome: ${integritySignal.integrity_outcome ?? 'unknown'} — adjustment: ${signals.integrity_adjustment > 0 ? '+' : ''}${signals.integrity_adjustment} pts`,
      relevance: 'Integrity adjustments modify the composite score directly',
      metadata: {
        adjustment: signals.integrity_adjustment,
        outcome: integritySignal.integrity_outcome,
      },
    })
  }

  // Failure mode evidence
  for (const fm of diagnosis.failure_modes) {
    if (fm.failure_mode_code === 'none_detected') continue
    refs.push({
      ref_type: 'rule_check',
      ref_key: `failure_mode_${fm.failure_mode_code}`,
      label: `Failure Mode: ${fm.failure_mode_code.replace(/_/g, ' ')}`,
      excerpt: fm.evidence_signal,
      relevance: fm.explanation,
      metadata: {
        code: fm.failure_mode_code,
        severity: fm.severity,
        confidence: fm.confidence,
        primary: fm.primary_flag,
      },
    })
  }

  // Competitive context
  if (signals.placement && signals.total_entries) {
    const percentile = Math.round((1 - (signals.placement - 1) / signals.total_entries) * 100)
    refs.push({
      ref_type: 'metric_signal',
      ref_key: 'placement_context',
      label: `Placement: #${signals.placement} of ${signals.total_entries}`,
      excerpt: `Ranked #${signals.placement} of ${signals.total_entries} entries — top ${100 - percentile + 1}th percentile`,
      relevance: 'Competitive placement provides relative context for absolute scores',
      metadata: { placement: signals.placement, total_entries: signals.total_entries, percentile },
    })
  }

  // Deduplicate by ref_key
  const seen = new Set<string>()
  return refs.filter(r => {
    const key = r.ref_key ?? r.label
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
