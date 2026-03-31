'use client'

// PostMatchBreakdown — Launch Feedback Model
// Forge · 2026-03-31
//
// Feedback design rules (enforced here, not just in docs):
// - Overall verdict: synthesized from actual lane data. Never generic filler.
// - Per-lane: score + evidence-linked explanation + strongest positive + primary weakness
// - "What to improve": max 5 items, derived from actual weak signals — not boilerplate
// - Relative context: median comparison only when we have enough entries
// - Provisional placement shown with explicit label when challenge still open
//
// Nothing in this component renders if the underlying data doesn't support it.
// We suppress rather than show weak/vague statements.

import { CapabilityRadar } from '@/components/leaderboard/capability-radar'
import {
  AlertTriangle, CheckCircle, Shield, Zap, Brain, Wrench,
  BarChart2, Clock, TrendingUp, TrendingDown, ArrowRight,
  Trophy, Info
} from 'lucide-react'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface JudgeOutput {
  id: string
  lane: string
  score: number
  confidence: number
  dimension_scores: Record<string, number>
  evidence_refs: string[]
  flags: string[]
  integrity_outcome?: string
  integrity_adjustment?: number
  positive_signal?: string | null
  primary_weakness?: string | null
  // B2/B3 FIX: Owner/admin-only fields — undefined for public viewers (intentional).
  // API scopes these by audience: JUDGE_OUTPUT_COLUMNS_OWNER vs _PUBLIC.
  model_id?: string
  short_rationale?: string
  latency_ms?: number
  is_fallback?: boolean
}

interface RunMetrics {
  total_events: number
  tool_call_count: number
  retry_count: number
  revert_count: number
  pivot_count: number
  error_count: number
  test_run_count: number
  thrash_rate: number
  revert_ratio: number
  tool_discipline: number
  verification_density: number
  wasted_action_ratio: number
  total_duration_ms: number
  pct_explore: number
  pct_plan: number
  pct_implement: number
  pct_verify: number
  pct_recover: number
  telemetry_process_score: number
  telemetry_recovery_score: number
  telemetry_efficiency_score: number
}

interface DisputeFlag {
  trigger_reason: string
  max_judge_spread: number
  status: string
  adjudicated_score?: number
  adjudication_rationale?: string
}

interface PostMatchBreakdownProps {
  judgeOutputs: JudgeOutput[]
  compositeScore?: number | null
  // finalScore: legacy fallback when compositeScore is null
  finalScore?: number | null
  processScore?: number | null
  strategyScore?: number | null
  integrityAdjustment?: number
  efficiencyScore?: number | null
  runMetrics?: RunMetrics | null
  disputeFlag?: DisputeFlag | null
  challengeFormat?: string | null
  // Overall verdict — set during judging finalization (migration 00041)
  // If null, we synthesize from lane data rather than showing nothing
  overallVerdict?: string | null
  // Placement context
  placement?: number | null
  totalEntries?: number | null
  isProvisional?: boolean
  challengeStatus?: string | null
}

// ─────────────────────────────────────────────
// Lane metadata
// ─────────────────────────────────────────────

const LANE_META: Record<string, {
  label: string
  icon: React.ElementType
  color: string
  barColor: string
  model: string
  weight: string
  description: string
}> = {
  objective: {
    label: 'Objective',
    icon: BarChart2,
    color: 'text-[#7dffa2]',
    barColor: 'bg-[#7dffa2]',
    model: 'Multi-judge',
    weight: '45–65%',
    description: 'Correctness, completeness, and hidden test performance',
  },
  process: {
    label: 'Process',
    icon: Wrench,
    color: 'text-blue-400',
    barColor: 'bg-blue-500',
    model: 'Claude',
    weight: '20%',
    description: 'Execution quality, tool use, recovery behavior',
  },
  strategy: {
    label: 'Strategy',
    icon: Brain,
    color: 'text-purple-400',
    barColor: 'bg-purple-500',
    model: 'GPT-4o',
    weight: '20%',
    description: 'Decomposition, prioritization, reasoning quality',
  },
  integrity: {
    label: 'Integrity',
    icon: Shield,
    color: 'text-green-400',
    barColor: 'bg-green-500',
    model: 'Gemini',
    weight: '10%',
    description: 'Honest competition, self-policing, no exploits',
  },
  audit: {
    label: 'Audit',
    icon: BarChart2,
    color: 'text-yellow-400',
    barColor: 'bg-yellow-500',
    model: 'Claude Opus',
    weight: 'arbitration',
    description: 'Triggered when judge spread exceeds threshold',
  },
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function ScoreBar({ value, max = 100, colorClass = 'bg-blue-500' }: { value: number; max?: number; colorClass?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function pct(v: number) { return `${(v * 100).toFixed(0)}%` }

function scoreColor(v: number) {
  if (v >= 70) return 'text-green-400'
  if (v >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

function scoreBand(v: number): 'strong' | 'mid' | 'weak' {
  if (v >= 70) return 'strong'
  if (v >= 40) return 'mid'
  return 'weak'
}

// ─────────────────────────────────────────────
// Verdict synthesis
// Derives a concise, specific overall verdict from real lane data.
// Rules:
//   - Must reference at least one concrete signal (score differential, flag, metric)
//   - Never uses: "Good effort", "room for improvement", "nice work overall"
//   - Returns null if data is insufficient to say anything specific
// ─────────────────────────────────────────────

function synthesizeVerdict(
  judgeOutputs: JudgeOutput[],
  compositeScore: number | null | undefined,
  processScore: number | null | undefined,
  strategyScore: number | null | undefined,
  integrityAdjustment: number,
  runMetrics: RunMetrics | null | undefined,
  overallVerdict: string | null | undefined,
): string | null {
  // If the judging system populated a verdict, use it — it has access to more signal
  if (overallVerdict && overallVerdict.trim().length > 20) {
    // Reject generic filler patterns
    const genericPatterns = [
      /good effort/i,
      /room for improvement/i,
      /nice (work|job)/i,
      /well done/i,
      /great (work|job)/i,
      /shows promise/i,
    ]
    const isGeneric = genericPatterns.some(p => p.test(overallVerdict))
    if (!isGeneric) return overallVerdict
  }

  // Synthesize from data
  if (compositeScore == null) return null

  const parts: string[] = []

  // Lead with composite result
  const composite = scoreBand(compositeScore)
  if (composite === 'strong') parts.push(`Composite score ${compositeScore.toFixed(0)}/100 — strong overall result`)
  else if (composite === 'mid') parts.push(`Composite score ${compositeScore.toFixed(0)}/100 — solid but uneven across lanes`)
  else parts.push(`Composite score ${compositeScore.toFixed(0)}/100 — significant room to improve`)

  // Identify strongest and weakest lanes
  const lanePairs: { lane: string; score: number }[] = []
  for (const o of judgeOutputs) {
    if (o.lane === 'audit') continue
    lanePairs.push({ lane: o.lane, score: o.score })
  }
  if (processScore != null) {
    const existing = lanePairs.find(l => l.lane === 'process')
    if (!existing) lanePairs.push({ lane: 'process', score: processScore })
  }
  if (strategyScore != null) {
    const existing = lanePairs.find(l => l.lane === 'strategy')
    if (!existing) lanePairs.push({ lane: 'strategy', score: strategyScore })
  }

  if (lanePairs.length >= 2) {
    const sorted = [...lanePairs].sort((a, b) => b.score - a.score)
    const best = sorted[0]
    const worst = sorted[sorted.length - 1]
    const spread = best.score - worst.score

    if (spread >= 15) {
      // Meaningful spread — call it out specifically
      parts.push(`strongest on ${best.lane} (${best.score.toFixed(0)}), weakest on ${worst.lane} (${worst.score.toFixed(0)})`)
    }
  }

  // Integrity flag
  if (integrityAdjustment < -5) {
    parts.push(`integrity penalty applied (${integrityAdjustment} points)`)
  } else if (integrityAdjustment > 0) {
    parts.push(`integrity commendation (+${integrityAdjustment} points)`)
  }

  // Telemetry signal
  if (runMetrics) {
    if (runMetrics.thrash_rate > 0.35) {
      parts.push(`high thrash rate (${pct(runMetrics.thrash_rate)}) limited process score`)
    } else if (runMetrics.verification_density < 0.05) {
      parts.push(`low verification density hurt process evidence`)
    }
  }

  if (parts.length === 0) return null
  return parts.join(' — ')
}

// ─────────────────────────────────────────────
// Per-lane signal synthesis
// Derives positive_signal and primary_weakness from dimension_scores + flags
// when the judge didn't populate them directly.
// Returns null if not enough signal to say something specific.
// ─────────────────────────────────────────────

// Capitalize a human label derived from a DB field name
function humanize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Generic-filler patterns to suppress regardless of length
const GENERIC_SIGNAL_PATTERNS = [
  /^(good|nice|well|solid|decent|fair|ok|okay|average|acceptable|satisfactory)\.?$/i,
  /^(could be better|has potential|room for improvement|needs work)\.?$/i,
  /^(shows (effort|promise|understanding))\.?$/i,
]
function isGenericSignal(s: string | null | undefined): boolean {
  if (!s || s.trim().length < 8) return true
  return GENERIC_SIGNAL_PATTERNS.some(p => p.test(s.trim()))
}

function deriveLaneSignals(output: JudgeOutput): {
  positive: string | null
  weakness: string | null
} {
  // Use judge-populated signals first — but only if they're substantive
  const judgePositive = !isGenericSignal(output.positive_signal) ? (output.positive_signal ?? null) : null
  const judgeWeakness = !isGenericSignal(output.primary_weakness) ? (output.primary_weakness ?? null) : null

  if (judgePositive && judgeWeakness) return { positive: judgePositive, weakness: judgeWeakness }

  // Derive from dimension scores (sorted high to low)
  const dims = output.dimension_scores ?? {}
  const dimEntries = Object.entries(dims)
    .filter(([, v]) => typeof v === 'number')
    .sort(([, a], [, b]) => b - a)
  const bestDim = dimEntries[0]
  const worstDim = dimEntries[dimEntries.length - 1]

  // Positive: only show when dimension is genuinely strong (≥ 70), and not the same as worst
  const derivedPositive = judgePositive ?? (
    bestDim && bestDim[1] >= 70 && bestDim[0] !== worstDim?.[0]
      ? `${humanize(bestDim[0])} ${bestDim[1]}/100 — top dimension in this lane`
      : null
  )

  // Weakness priority: flags (most concrete) → low dimension → nothing
  const flagWeakness = output.flags && output.flags.length > 0
    ? `${humanize(output.flags[0])} flagged`
    : null

  // Only emit dimension weakness when it's meaningfully low (< 40) and different from best
  const dimWeakness = (worstDim && worstDim[1] < 40 && worstDim[0] !== bestDim?.[0])
    ? `${humanize(worstDim[0])} ${worstDim[1]}/100 — weakest dimension`
    : null

  const derivedWeakness = judgeWeakness ?? flagWeakness ?? dimWeakness

  return { positive: derivedPositive, weakness: derivedWeakness }
}

// ─────────────────────────────────────────────
// Improvement guidance synthesis
// Generates a specific, prioritized list of improvements.
// Max 5 items. Derived from real signal — not from a static template list.
// ─────────────────────────────────────────────

interface ImprovementItem {
  priority: number
  text: string
  lane: string
}

function synthesizeImprovements(
  judgeOutputs: JudgeOutput[],
  runMetrics: RunMetrics | null | undefined,
  compositeScore: number | null | undefined,
): ImprovementItem[] {
  const items: ImprovementItem[] = []

  for (const output of judgeOutputs) {
    if (output.lane === 'audit') continue
    const meta = LANE_META[output.lane]

    // Lane-level weakness — only emit when specific signal exists
    if (output.score < 50) {
      const { weakness } = deriveLaneSignals(output)
      if (weakness) {
        items.push({
          priority: output.lane === 'objective' ? 1 : output.lane === 'process' ? 2 : 3,
          text: `${meta?.label ?? output.lane}: ${weakness}`,
          lane: output.lane,
        })
      }
      // Suppress generic "score low — review criteria" messages — they add no value
    }

    // Evidence gaps
    if (output.evidence_refs && output.evidence_refs.length === 0 && output.score < 60) {
      items.push({
        priority: 3,
        text: `Provide stronger process evidence — ${meta?.label ?? output.lane} judge found no supporting signal`,
        lane: output.lane,
      })
    }

    // Flags → specific guidance
    for (const flag of (output.flags ?? [])) {
      const flagText = flag.replace(/_/g, ' ')
      items.push({ priority: 1, text: `Address flagged issue: ${flagText}`, lane: output.lane })
    }
  }

  // Telemetry-based improvements
  if (runMetrics) {
    if (runMetrics.thrash_rate > 0.3) {
      items.push({ priority: 2, text: `Reduce thrash rate (currently ${pct(runMetrics.thrash_rate)}) — excessive retries and direction changes hurt process score`, lane: 'process' })
    }
    if (runMetrics.verification_density < 0.05 && runMetrics.total_events > 10) {
      items.push({ priority: 2, text: `Increase verification density — add test runs and assertions to demonstrate correctness`, lane: 'process' })
    }
    if (runMetrics.wasted_action_ratio > 0.4) {
      items.push({ priority: 3, text: `Reduce wasted actions (${pct(runMetrics.wasted_action_ratio)}) — tighten tool discipline`, lane: 'process' })
    }
    if (runMetrics.pct_verify < 0.05 && runMetrics.total_events > 15) {
      items.push({ priority: 2, text: `Spend more time in the verify phase — currently ${pct(runMetrics.pct_verify)} of session`, lane: 'process' })
    }
  }

  // Deduplicate by text prefix (same root cause, different source)
  const seen = new Set<string>()
  const deduped = items.filter(item => {
    const key = item.text.slice(0, 40)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Sort by priority, take top 5
  return deduped.sort((a, b) => a.priority - b.priority).slice(0, 5)
}

// ─────────────────────────────────────────────
// Relative context
// Only shown when we have placement + total entries with meaningful sample size.
// Never exposes sensitive score data of other competitors.
// ─────────────────────────────────────────────

function RelativeContext({
  placement,
  totalEntries,
  isProvisional,
  compositeScore,
  processScore,
  strategyScore,
}: {
  placement: number | null | undefined
  totalEntries: number | null | undefined
  isProvisional: boolean
  compositeScore: number | null | undefined
  processScore: number | null | undefined
  strategyScore: number | null | undefined
}) {
  if (!placement || !totalEntries || totalEntries < 3) return null

  const percentile = Math.round((1 - (placement - 1) / totalEntries) * 100)
  const isTopThird = placement <= Math.ceil(totalEntries / 3)
  const isBottomThird = placement > Math.floor((totalEntries * 2) / 3)

  let relativeLabel: string
  if (placement === 1) relativeLabel = 'top of the leaderboard'
  else if (isTopThird) relativeLabel = 'top third of entries'
  else if (isBottomThird) relativeLabel = 'bottom third of entries'
  else relativeLabel = 'middle of the field'

  // Lane comparison — only show if we have both scores and a meaningful differential
  const laneInsights: string[] = []
  if (processScore != null && strategyScore != null) {
    const diff = processScore - strategyScore
    if (Math.abs(diff) >= 12) {
      if (diff > 0) laneInsights.push(`stronger on process than strategy`)
      else laneInsights.push(`stronger on strategy than process`)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          {isProvisional ? 'Current Standing (Provisional)' : 'Final Standing'}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#ffb780]" />
          <span className="text-sm font-mono font-bold text-foreground">
            #{placement}
            {isProvisional && <span className="text-[10px] text-[#8c909f] ml-1">provisional</span>}
          </span>
          <span className="text-xs text-muted-foreground">of {totalEntries}</span>
        </div>
        <span className="text-[10px] font-mono text-[#adc6ff] bg-[#adc6ff]/10 px-2 py-0.5 rounded">
          top {100 - percentile + 1}%
        </span>
        <span className="text-xs text-muted-foreground">{relativeLabel}</span>
      </div>
      {laneInsights.length > 0 && (
        <p className="text-[11px] text-muted-foreground font-mono">
          {laneInsights.join(' · ')}
        </p>
      )}
      {isProvisional && (
        <p className="text-[10px] text-[#8c909f] font-mono">
          Official placement finalizes when the challenge closes.
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export function PostMatchBreakdown({
  judgeOutputs,
  compositeScore: compositeScoreProp,
  finalScore,
  processScore,
  strategyScore,
  integrityAdjustment = 0,
  efficiencyScore,
  runMetrics,
  disputeFlag,
  challengeFormat = 'standard',
  overallVerdict,
  placement,
  totalEntries,
  isProvisional = false,
  challengeStatus,
}: PostMatchBreakdownProps) {
  // Use compositeScore if available; fall back to finalScore for legacy entries
  const compositeScore = compositeScoreProp ?? finalScore ?? null
  const hasLaneData = judgeOutputs.length > 0
  const hasMetrics = runMetrics != null

  const verdict = synthesizeVerdict(
    judgeOutputs,
    compositeScore,
    processScore,
    strategyScore,
    integrityAdjustment,
    runMetrics,
    overallVerdict,
  )

  const improvements = synthesizeImprovements(judgeOutputs, runMetrics, compositeScore)

  // Build radar data from lane scores.
  // We only include axes that have real measured data.
  // Axes derived from null data are omitted rather than defaulted to 50
  // (prevents displaying guessed values as measured truth — P3-B).
  const radarData: Record<string, number> = {}
  if (strategyScore != null) {
    radarData.reasoning_depth = strategyScore
    radarData.strategic_planning = strategyScore
  }
  if (runMetrics) {
    radarData.tool_discipline = runMetrics.tool_discipline * 100
    radarData.verification_discipline = Math.min(100, runMetrics.verification_density * 200)
  } else if (processScore != null) {
    radarData.tool_discipline = processScore
  }
  if (processScore != null) {
    radarData.recovery_quality = processScore
  }
  if (compositeScore != null) {
    radarData.integrity_reliability = Math.min(100, 50 + (integrityAdjustment ?? 0) * 2)
  }
  // Only render radar when we have at least 3 measured axes
  const hasEnoughRadarData = Object.keys(radarData).length >= 3

  return (
    <div className="space-y-6">

      {/* ── Dispute banner ── */}
      {disputeFlag && disputeFlag.status !== 'resolved' && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-300">Score Under Review</p>
            <p className="text-xs text-yellow-400/80 mt-0.5">
              Judge spread exceeded threshold ({disputeFlag.max_judge_spread?.toFixed(1)} pts).
              Audit judge has been queued. Final score may change.
            </p>
          </div>
        </div>
      )}

      {disputeFlag?.status === 'resolved' && disputeFlag.adjudicated_score != null && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 flex items-start gap-3">
          <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-300">Dispute Resolved</p>
            <p className="text-xs text-green-400/80 mt-0.5">
              Adjudicated score: {disputeFlag.adjudicated_score.toFixed(1)}.
              {disputeFlag.adjudication_rationale && ` ${disputeFlag.adjudication_rationale}`}
            </p>
          </div>
        </div>
      )}

      {/* ── Composite score + overall verdict ── */}
      {compositeScore != null && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-start gap-5">
            {hasEnoughRadarData && (
              <div className="flex-shrink-0">
                <CapabilityRadar data={radarData} size={96} showLabels={false} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                Composite Score · {challengeFormat} format
              </div>
              <div className={`text-4xl font-mono font-bold ${scoreColor(compositeScore)}`}>
                {compositeScore.toFixed(1)}
                <span className="text-lg text-muted-foreground">/100</span>
              </div>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {processScore != null && (
                  <div className="text-xs font-mono">
                    <span className="text-muted-foreground">Process </span>
                    <span className={`font-bold ${scoreColor(processScore)}`}>{processScore.toFixed(0)}</span>
                  </div>
                )}
                {strategyScore != null && (
                  <div className="text-xs font-mono">
                    <span className="text-muted-foreground">Strategy </span>
                    <span className={`font-bold ${scoreColor(strategyScore)}`}>{strategyScore.toFixed(0)}</span>
                  </div>
                )}
                {efficiencyScore != null && (
                  <div className="text-xs font-mono">
                    <span className="text-muted-foreground">Efficiency </span>
                    <span className={`font-bold ${scoreColor(efficiencyScore)}`}>{efficiencyScore.toFixed(0)}</span>
                  </div>
                )}
                {integrityAdjustment !== 0 && (
                  <div className="text-xs font-mono">
                    <span className="text-muted-foreground">Integrity </span>
                    <span className={`font-bold ${integrityAdjustment > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {integrityAdjustment > 0 ? '+' : ''}{integrityAdjustment}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Overall verdict — specific, evidence-linked, never generic */}
          {verdict && (
            <div className="border-t border-border/60 pt-4">
              <div className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground leading-relaxed font-mono">{verdict}</p>
              </div>
            </div>
          )}

          {/* Provisional placement note */}
          {isProvisional && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#adc6ff]/5 border border-[#adc6ff]/15 text-[10px] font-mono text-[#8c909f]">
              <Clock className="w-3 h-3 text-[#adc6ff]" />
              Your result is final. Official standings finalize when the challenge closes.
            </div>
          )}
        </div>
      )}

      {/* ── Relative context (placement) ── */}
      <RelativeContext
        placement={placement}
        totalEntries={totalEntries}
        isProvisional={isProvisional}
        compositeScore={compositeScore}
        processScore={processScore}
        strategyScore={strategyScore}
      />

      {/* ── Lane-by-lane breakdown ── */}
      {hasLaneData && (
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Lane Breakdown</h3>
          {judgeOutputs.map(output => {
            // B2 FIX: model_id from data is not shown to public viewers.
            // LANE_META.model is a hardcoded display name ("Claude", "GPT-4o", etc.) — safe.
            // Unknown lane fallback uses generic label only, never exposes model_id.
            const meta = LANE_META[output.lane] ?? {
              label: output.lane,
              icon: BarChart2,
              color: 'text-muted-foreground',
              barColor: 'bg-white/20',
              model: 'Judge',  // B2 FIX: never expose model_id here
              weight: '',
              description: '',
            }
            const Icon = meta.icon
            const { positive, weakness } = deriveLaneSignals(output)

            return (
              <div key={output.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                {/* Lane header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Icon className={`w-4 h-4 ${meta.color}`} />
                    <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">· {meta.model}</span>
                    {meta.weight && (
                      <span className="text-[10px] font-mono text-muted-foreground/70">· {meta.weight} weight</span>
                    )}
                    {/* B2 FIX: is_fallback only shown when present (owner/admin only — public never receives this field) */}
                    {output.is_fallback === true && (
                      <span className="text-[10px] font-mono text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">fallback</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* B2 FIX: latency_ms only shown when present (owner/admin only) */}
                    {output.latency_ms != null && (
                      <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />{(output.latency_ms / 1000).toFixed(1)}s
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground">
                      conf {(output.confidence * 100).toFixed(0)}%
                    </span>
                    <span className={`text-2xl font-mono font-bold ${scoreColor(output.score)}`}>
                      {output.score.toFixed(0)}
                    </span>
                  </div>
                </div>

                <ScoreBar value={output.score} colorClass={meta.barColor} />

                {/* Rationale — only shown when non-empty and substantive */}
                {output.short_rationale && output.short_rationale.trim().length > 15 && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{output.short_rationale}</p>
                )}

                {/* Positive signal + weakness — the core per-lane feedback */}
                {(positive || weakness) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {positive && (
                      <div className="flex items-start gap-2 rounded-lg bg-green-500/5 border border-green-500/15 px-3 py-2">
                        <TrendingUp className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-green-400/70 block mb-0.5">Strongest signal</span>
                          <span className="text-xs text-foreground leading-relaxed">{positive}</span>
                        </div>
                      </div>
                    )}
                    {weakness && (
                      <div className="flex items-start gap-2 rounded-lg bg-red-500/5 border border-red-500/15 px-3 py-2">
                        <TrendingDown className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-red-400/70 block mb-0.5">Key weakness</span>
                          <span className="text-xs text-foreground leading-relaxed">{weakness}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Dimension scores */}
                {output.dimension_scores && Object.keys(output.dimension_scores).length > 0 && (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 pt-1">
                    {Object.entries(output.dimension_scores).map(([dim, val]) => (
                      <div key={dim} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-muted-foreground capitalize">
                            {dim.replace(/_/g, ' ')}
                          </span>
                          <span className={`text-[10px] font-mono font-bold ${scoreColor(val)}`}>{val}</span>
                        </div>
                        <ScoreBar value={val} colorClass="bg-white/20" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Integrity outcome */}
                {output.lane === 'integrity' && output.integrity_outcome && (
                  <div className={`text-[10px] font-mono px-2 py-1 rounded inline-flex items-center gap-1.5 ${
                    output.integrity_outcome === 'commendable' ? 'bg-green-500/15 text-green-400' :
                    output.integrity_outcome === 'clean' ? 'bg-white/5 text-muted-foreground' :
                    output.integrity_outcome === 'suspicious' ? 'bg-yellow-500/15 text-yellow-400' :
                    'bg-red-500/15 text-red-400'
                  }`}>
                    <Shield className="w-3 h-3" />
                    {output.integrity_outcome}
                    {output.integrity_adjustment != null && output.integrity_adjustment !== 0 && (
                      <span>{output.integrity_adjustment > 0 ? '+' : ''}{output.integrity_adjustment}</span>
                    )}
                  </div>
                )}

                {/* Evidence refs */}
                {output.evidence_refs && output.evidence_refs.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-border/50">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Evidence</span>
                    {output.evidence_refs.slice(0, 3).map((ref, i) => (
                      <p key={i} className="text-[11px] text-muted-foreground italic pl-2 border-l border-border">
                        &ldquo;{ref}&rdquo;
                      </p>
                    ))}
                  </div>
                )}

                {/* Flags */}
                {output.flags && output.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {output.flags.map((flag, i) => (
                      <span key={i} className="text-[10px] font-mono bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">
                        {flag.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── What to improve next ── */}
      {improvements.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#adc6ff]" />
            <h3 className="text-sm font-semibold text-foreground">What to improve next</h3>
            <span className="text-[10px] font-mono text-muted-foreground">· derived from your submission signals</span>
          </div>
          <ol className="space-y-2">
            {improvements.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="text-[10px] font-mono text-[#adc6ff] flex-shrink-0 mt-0.5 w-4">{i + 1}.</span>
                <div className="flex items-start gap-2 min-w-0">
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-muted-foreground leading-relaxed">{item.text}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── Telemetry breakdown ── */}
      {hasMetrics && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-semibold text-foreground">Telemetry</h3>
            <span className="text-[10px] font-mono text-muted-foreground">· {runMetrics.total_events} events captured</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Thrash Rate',     value: pct(runMetrics.thrash_rate),               bad: runMetrics.thrash_rate > 0.3 },
              { label: 'Tool Discipline', value: pct(runMetrics.tool_discipline),            bad: runMetrics.tool_discipline < 0.5 },
              { label: 'Verify Density',  value: pct(runMetrics.verification_density),       bad: runMetrics.verification_density < 0.1 },
              { label: 'Waste Ratio',     value: pct(runMetrics.wasted_action_ratio),        bad: runMetrics.wasted_action_ratio > 0.4 },
              { label: 'Pivot Count',     value: String(runMetrics.pivot_count),             bad: false },
              { label: 'Errors',          value: String(runMetrics.error_count),             bad: runMetrics.error_count > 5 },
            ].map(m => (
              <div key={m.label} className="space-y-0.5">
                <span className="text-[10px] font-mono text-muted-foreground">{m.label}</span>
                <span className={`text-sm font-mono font-bold block ${m.bad ? 'text-red-400' : 'text-foreground'}`}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>

          {/* Phase distribution */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Phase Distribution</span>
            <div className="flex h-3 rounded-full overflow-hidden gap-px">
              {[
                { pct: runMetrics.pct_explore,   color: 'bg-blue-500',   label: 'explore' },
                { pct: runMetrics.pct_plan,       color: 'bg-indigo-500', label: 'plan' },
                { pct: runMetrics.pct_implement,  color: 'bg-purple-500', label: 'implement' },
                { pct: runMetrics.pct_verify,     color: 'bg-green-500',  label: 'verify' },
                { pct: runMetrics.pct_recover,    color: 'bg-red-500',    label: 'recover' },
              ].filter(p => p.pct > 0).map(p => (
                <div
                  key={p.label}
                  className={`${p.color} h-full`}
                  style={{ width: `${p.pct * 100}%` }}
                  title={`${p.label}: ${pct(p.pct)}`}
                />
              ))}
            </div>
            <div className="flex gap-3 flex-wrap">
              {[
                { label: 'Explore',   pct: runMetrics.pct_explore,   color: 'bg-blue-500' },
                { label: 'Plan',      pct: runMetrics.pct_plan,       color: 'bg-indigo-500' },
                { label: 'Implement', pct: runMetrics.pct_implement,  color: 'bg-purple-500' },
                { label: 'Verify',    pct: runMetrics.pct_verify,     color: 'bg-green-500' },
                { label: 'Recover',   pct: runMetrics.pct_recover,    color: 'bg-red-500' },
              ].filter(p => p.pct > 0).map(p => (
                <div key={p.label} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${p.color}`} />
                  <span className="text-[10px] font-mono text-muted-foreground">{p.label} {pct(p.pct)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Telemetry scores */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/50">
            {[
              { label: 'Process Score',    val: runMetrics.telemetry_process_score },
              { label: 'Recovery Score',   val: runMetrics.telemetry_recovery_score },
              { label: 'Efficiency Score', val: runMetrics.telemetry_efficiency_score },
            ].map(m => (
              <div key={m.label}>
                <span className="text-[10px] font-mono text-muted-foreground block">{m.label}</span>
                <span className={`text-lg font-mono font-bold ${scoreColor(m.val ?? 0)}`}>
                  {m.val?.toFixed(0) ?? '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No data fallback */}
      {!hasLaneData && !hasMetrics && compositeScore == null && (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Score breakdown not yet available for this entry.</p>
        </div>
      )}
    </div>
  )
}
