'use client'

// PerformanceBreakdown — Premium Post-Bout Feedback Surface
// Forge · 2026-03-31
//
// This is the full premium feedback UI. It replaces post-match-breakdown.tsx
// for entries that have a generated FeedbackReport.
//
// Block layout (matches spec):
//   1. Outcome Header
//   2. Executive Diagnosis
//   3. Lane Scorecards (full cards)
//   4. Decisive Factors
//   5. Failure Mode Analysis
//   6. Improvement Priorities (coaching)
//   7. Evidence Panel
//   8. Competitive Comparison
//   9. Confidence / Stability
//   10. Longitudinal Agent Profile
//
// Anti-generic enforcement at render time:
//   - Short strings (< 20 chars) are suppressed rather than shown
//   - null/empty fields render a suppressed placeholder, not blank space
//   - Confidence badges are ALWAYS shown alongside conclusions
//   - Failure mode codes render as human labels, never raw snake_case

import { useState } from 'react'
import {
  AlertTriangle, CheckCircle, Shield, Zap, Brain, Wrench,
  BarChart2, Clock, TrendingUp, TrendingDown, ArrowRight,
  Trophy, ChevronDown, ChevronUp, Target, Layers,
  Activity, Eye, FileText, AlertCircle, Star,
  Minus, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import type { FeedbackReport, ImprovementPriority, LaneDiagnosis, FailureModeClassification, EvidenceRef, AgentLongitudinalSummary } from '@/lib/feedback/types'
import { FAILURE_MODE_LABELS, FAILURE_MODE_DESCRIPTIONS } from '@/lib/feedback/types'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function ScoreBar({ value, max = 100, colorClass = 'bg-blue-500', className }: { value: number; max?: number; colorClass?: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={cn('w-full h-1.5 bg-white/5 rounded-full overflow-hidden', className)}>
      <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const map = {
    high:   { color: 'bg-green-500/15 text-green-400 border-green-500/20',   label: 'High confidence' },
    medium: { color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20', label: 'Medium confidence' },
    low:    { color: 'bg-red-500/15 text-red-400 border-red-500/20',          label: 'Low confidence' },
  }
  const { color, label } = map[level]
  return (
    <span className={`text-[9px] font-mono uppercase tracking-wider border px-1.5 py-0.5 rounded ${color}`}>
      {label}
    </span>
  )
}

function SectionHeader({ icon: Icon, label, sub }: { icon: React.ElementType; label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      {sub && <span className="text-[10px] font-mono text-muted-foreground">· {sub}</span>}
    </div>
  )
}

function scoreColor(v: number) {
  if (v >= 70) return 'text-green-400'
  if (v >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

function scoreBarColor(v: number) {
  if (v >= 70) return 'bg-green-500'
  if (v >= 40) return 'bg-yellow-500'
  return 'bg-red-500'
}

function impactColor(impact: string) {
  if (impact === 'high') return 'text-green-400 bg-green-500/10 border-green-500/20'
  if (impact === 'medium') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
  return 'text-muted-foreground bg-white/5 border-white/10'
}

function difficultyColor(d: string) {
  if (d === 'low') return 'text-green-400'
  if (d === 'medium') return 'text-yellow-400'
  return 'text-red-400'
}

function suppress(s: string | null | undefined, minLen = 20): string | null {
  if (!s || s.trim().length < minLen) return null
  return s
}

// ─────────────────────────────────────────────
// Lane metadata
// ─────────────────────────────────────────────

const LANE_META: Record<string, {
  label: string; icon: React.ElementType; color: string; barColor: string; weight: string
}> = {
  objective: { label: 'Objective', icon: BarChart2, color: 'text-[#7dffa2]', barColor: 'bg-[#7dffa2]', weight: '45–65%' },
  process:   { label: 'Process',   icon: Wrench,    color: 'text-blue-400',   barColor: 'bg-blue-500',   weight: '20%' },
  strategy:  { label: 'Strategy',  icon: Brain,     color: 'text-purple-400', barColor: 'bg-purple-500', weight: '20%' },
  integrity: { label: 'Integrity', icon: Shield,    color: 'text-green-400',  barColor: 'bg-green-500',  weight: '10%' },
}

// ─────────────────────────────────────────────
// Block 1: Outcome Header
// ─────────────────────────────────────────────

function OutcomeHeader({
  report,
  compositeScore,
  placement,
  totalEntries,
  isProvisional,
  submissionSource,
}: {
  report: FeedbackReport
  compositeScore: number | null
  placement: number | null
  totalEntries: number | null
  isProvisional: boolean
  submissionSource?: string | null
}) {
  const percentile = placement && totalEntries && totalEntries >= 3
    ? Math.round((1 - (placement - 1) / totalEntries) * 100)
    : null

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
            Performance Breakdown
          </div>
          {compositeScore != null && (
            <div className={`text-5xl font-mono font-bold ${scoreColor(compositeScore)}`}>
              {compositeScore.toFixed(1)}
              {/* C1: /100 scale — explicit, always shown */}
              <span className="text-xl text-muted-foreground">/100</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {placement && totalEntries && (
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#ffb780]" />
              <span className="text-sm font-mono font-bold text-foreground">
                #{placement}
                {isProvisional && <span className="text-[10px] text-muted-foreground ml-1">provisional</span>}
              </span>
              <span className="text-xs text-muted-foreground">of {totalEntries}</span>
              {percentile != null && (
                <span className="text-[10px] font-mono text-[#adc6ff] bg-[#adc6ff]/10 px-2 py-0.5 rounded">
                  top {100 - percentile + 1}%
                </span>
              )}
            </div>
          )}
          {submissionSource && (
            <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-2 py-0.5 rounded">
              via {submissionSource}
            </span>
          )}
        </div>
      </div>

      {/* One-line diagnosis */}
      {suppress(report.overall_summary) && (
        <div className="rounded-lg bg-white/3 border border-white/5 px-4 py-3">
          <p className="text-sm font-mono text-foreground leading-relaxed">
            {report.overall_summary}
          </p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Block 2: Executive Diagnosis
// ─────────────────────────────────────────────

function ExecutiveDiagnosis({ report }: { report: FeedbackReport }) {
  const hasDiagnosis = suppress(report.executive_diagnosis)
  const hasNarrative = suppress(report.result_narrative)
  if (!hasDiagnosis && !hasNarrative) return null

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <SectionHeader icon={Target} label="Executive Diagnosis" />

      {hasNarrative && (
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">What Happened</span>
          <p className="text-sm text-foreground leading-relaxed">{report.result_narrative}</p>
        </div>
      )}

      {hasDiagnosis && (
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Why</span>
          <p className="text-sm text-foreground leading-relaxed font-medium">{report.executive_diagnosis}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {suppress(report.dominant_strength) && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-green-400/70">Dominant Strength</span>
            </div>
            <p className="text-xs text-foreground leading-relaxed">{report.dominant_strength}</p>
          </div>
        )}
        {suppress(report.dominant_weakness) && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-red-400/70">Dominant Weakness</span>
            </div>
            <p className="text-xs text-foreground leading-relaxed">{report.dominant_weakness}</p>
          </div>
        )}
      </div>

      {suppress(report.decisive_moment) && (
        <div className="rounded-lg border border-[#adc6ff]/20 bg-[#adc6ff]/5 p-3 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#adc6ff]/70">Decisive Moment</span>
          <p className="text-xs text-foreground leading-relaxed italic">{report.decisive_moment}</p>
        </div>
      )}

      {(suppress(report.highest_leverage_fix) || suppress(report.next_best_fix)) && (
        <div className="space-y-2 pt-1 border-t border-border/50">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Top Fixes</span>
          {suppress(report.highest_leverage_fix) && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-mono text-[#7dffa2] flex-shrink-0 mt-0.5 font-bold">1.</span>
              <p className="text-xs text-foreground">{report.highest_leverage_fix}</p>
            </div>
          )}
          {suppress(report.next_best_fix) && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-mono text-[#adc6ff] flex-shrink-0 mt-0.5">2.</span>
              <p className="text-xs text-muted-foreground">{report.next_best_fix}</p>
            </div>
          )}
        </div>
      )}

      {/* D2 FIX: Simplified confidence footer — removed raw evidence_density score (internal-feeling).
          Keep confidence badge + ambiguity level; suppress evidence_density number from user-facing surface. */}
      <div className="flex items-center gap-2 flex-wrap">
        <ConfidenceBadge level={report.confidence_overall} />
        {report.ambiguity_level && report.ambiguity_level !== 'low' && (
          <span className={cn(
            'text-[9px] font-mono px-1.5 py-0.5 rounded border',
            report.ambiguity_level === 'medium' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
            'text-red-400 bg-red-500/10 border-red-500/20'
          )}
          title="How much ambiguity remains in the interpretation of this submission's signals"
          >
            {report.ambiguity_level === 'medium' ? 'some ambiguity' : 'high ambiguity'}
          </span>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Block 3: Lane Scorecards (full premium cards)
// ─────────────────────────────────────────────

function LaneScorecards({ lanes }: { lanes: LaneDiagnosis[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  if (lanes.length === 0) return null

  return (
    <div className="space-y-3">
      <SectionHeader icon={Layers} label="Lane Scorecards" sub="click to expand" />
      {lanes.filter(l => l.lane !== 'audit').map(lane => {
        const meta = LANE_META[lane.lane] ?? { label: lane.lane, icon: BarChart2, color: 'text-muted-foreground', barColor: 'bg-white/20', weight: '' }
        const Icon = meta.icon
        const isExpanded = expanded[lane.lane] ?? false

        return (
          <div key={lane.lane} className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Header row — always visible */}
            <button
              className="w-full p-4 flex items-center justify-between gap-3 hover:bg-white/2 transition-colors"
              onClick={() => setExpanded(e => ({ ...e, [lane.lane]: !e[lane.lane] }))}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Icon className={`w-4 h-4 ${meta.color} flex-shrink-0`} />
                <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                <span className="text-[10px] font-mono text-muted-foreground/70">{meta.weight} weight</span>
                <ConfidenceBadge level={lane.confidence} />
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* D2 FIX: Percentile shown with tooltip explaining it, not raw "p78" shorthand */}
                {lane.percentile != null && (
                  <span
                    className="text-[10px] font-mono text-[#adc6ff] cursor-help"
                    title={`Top ${(100 - lane.percentile).toFixed(0)}% of submissions on this lane (percentile: ${lane.percentile.toFixed(0)})`}
                  >
                    top {Math.max(1, 100 - Math.round(lane.percentile))}%
                  </span>
                )}
                <span className={`text-2xl font-mono font-bold ${scoreColor(lane.score)}`}>
                  {lane.score.toFixed(0)}
                  <span className="text-xs text-muted-foreground font-normal">/100</span>
                </span>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            <ScoreBar value={lane.score} colorClass={scoreBarColor(lane.score)} className="rounded-none h-1" />

            {/* Expanded content */}
            {isExpanded && (
              <div className="p-4 space-y-4 border-t border-border/50">

                {/* Strongest + Weakest behaviors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {suppress(lane.strongest_behavior) && (
                    <div className="rounded-lg bg-green-500/5 border border-green-500/15 p-3 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        <span className="text-[9px] font-mono uppercase tracking-wider text-green-400/70">Strongest Behavior</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{lane.strongest_behavior}</p>
                    </div>
                  )}
                  {suppress(lane.weakest_behavior) && (
                    <div className="rounded-lg bg-red-500/5 border border-red-500/15 p-3 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <TrendingDown className="w-3 h-3 text-red-400" />
                        <span className="text-[9px] font-mono uppercase tracking-wider text-red-400/70">Weakest Behavior</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{lane.weakest_behavior}</p>
                    </div>
                  )}
                </div>

                {/* What went right / wrong / means */}
                <div className="space-y-3">
                  {suppress(lane.what_went_right) && (
                    <div className="flex items-start gap-2.5">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground block mb-0.5">What Went Right</span>
                        <p className="text-xs text-foreground">{lane.what_went_right}</p>
                      </div>
                    </div>
                  )}
                  {suppress(lane.what_went_wrong) && (
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground block mb-0.5">What Went Wrong</span>
                        <p className="text-xs text-foreground">{lane.what_went_wrong}</p>
                      </div>
                    </div>
                  )}
                  {suppress(lane.what_this_means) && (
                    <div className="flex items-start gap-2.5">
                      <Eye className="w-3.5 h-3.5 text-[#adc6ff] flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground block mb-0.5">What This Means</span>
                        <p className="text-xs text-muted-foreground">{lane.what_this_means}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Root cause */}
                {suppress(lane.primary_driver) && (
                  <div className="rounded-lg bg-white/3 border border-white/5 p-3 space-y-1">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Root Cause</span>
                    <p className="text-xs text-foreground font-medium">{lane.primary_driver}</p>
                    {suppress(lane.secondary_driver ?? null) && (
                      <p className="text-xs text-muted-foreground">{lane.secondary_driver}</p>
                    )}
                  </div>
                )}

                {/* Improvement recommendation */}
                {suppress(lane.improvement_recommendation) && (
                  <div className="flex items-start gap-2 rounded-lg bg-[#adc6ff]/5 border border-[#adc6ff]/15 p-3">
                    <ArrowRight className="w-3.5 h-3.5 text-[#adc6ff] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-wider text-[#adc6ff]/70 block mb-0.5">Improve</span>
                      <p className="text-xs text-foreground">{lane.improvement_recommendation}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// Block 4: Decisive Factors
// ─────────────────────────────────────────────

function DecisiveFactors({ positive, negative }: {
  positive: FeedbackReport['decisive_positive_factors']
  negative: FeedbackReport['decisive_negative_factors']
}) {
  const hasAny = positive.length > 0 || negative.length > 0
  if (!hasAny) return null

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <SectionHeader icon={Zap} label="Decisive Factors" sub="what actually moved the result" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {positive.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-green-400/70">Worked For You</span>
            {positive.slice(0, 3).map((f, i) => (
              <div key={i} className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">{f.title}</span>
                  <span className={cn('text-[9px] font-mono border px-1.5 py-0.5 rounded', impactColor(f.impact_magnitude))}>
                    {f.impact_magnitude} impact
                  </span>
                </div>
                <p className="text-[11px] text-foreground/80 leading-relaxed">{f.description}</p>
                {f.evidence_signal && (
                  <p className="text-[10px] text-muted-foreground italic">Evidence: {f.evidence_signal}</p>
                )}
              </div>
            ))}
          </div>
        )}
        {negative.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-red-400/70">Worked Against You</span>
            {negative.slice(0, 3).map((f, i) => (
              <div key={i} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">{f.title}</span>
                  <span className={cn('text-[9px] font-mono border px-1.5 py-0.5 rounded', impactColor(f.impact_magnitude))}>
                    {f.impact_magnitude} impact
                  </span>
                </div>
                <p className="text-[11px] text-foreground/80 leading-relaxed">{f.description}</p>
                {f.evidence_signal && (
                  <p className="text-[10px] text-muted-foreground italic">Evidence: {f.evidence_signal}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Block 5: Failure Mode Analysis
// ─────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  high:     'bg-orange-500/20 text-orange-300 border-orange-500/30',
  medium:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  low:      'bg-white/5 text-muted-foreground border-white/10',
}

function FailureModesPanel({ modes }: { modes: FailureModeClassification[] }) {
  const real = modes.filter(m => m.failure_mode_code !== 'none_detected')
  if (real.length === 0) {
    const none = modes.find(m => m.failure_mode_code === 'none_detected')
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionHeader icon={AlertCircle} label="Failure Mode Analysis" />
        <div className="flex items-center gap-2 text-sm text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>No dominant failure mode identified in this submission.</span>
          {none && <ConfidenceBadge level={none.confidence} />}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <SectionHeader icon={AlertCircle} label="Failure Mode Analysis" sub={`${real.length} detected`} />
      <div className="space-y-3">
        {real.map((fm, i) => (
          <div key={i} className={cn(
            'rounded-lg border p-4 space-y-2',
            fm.primary_flag
              ? 'border-red-500/30 bg-red-500/5'
              : 'border-border bg-card/50'
          )}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {fm.primary_flag && (
                  <span className="text-[9px] font-mono uppercase tracking-wider text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded">
                    Primary
                  </span>
                )}
                <span className="text-sm font-semibold text-foreground">
                  {FAILURE_MODE_LABELS[fm.failure_mode_code] ?? fm.failure_mode_code}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-[9px] font-mono border px-1.5 py-0.5 rounded', SEVERITY_COLOR[fm.severity] ?? SEVERITY_COLOR.medium)}>
                  {fm.severity}
                </span>
                <ConfidenceBadge level={fm.confidence} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              {FAILURE_MODE_DESCRIPTIONS[fm.failure_mode_code]}
            </p>
            {suppress(fm.explanation) && (
              <p className="text-xs text-foreground/80 leading-relaxed">{fm.explanation}</p>
            )}
            {fm.evidence_signal && fm.evidence_signal.length > 10 && (
              <div className="flex items-start gap-1.5 pl-2 border-l border-border">
                <span className="text-[10px] font-mono text-muted-foreground italic">{fm.evidence_signal}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Block 6: Improvement Priorities
// ─────────────────────────────────────────────

const TIER_STYLE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  fix_first: { label: 'Fix First', color: 'text-[#7dffa2]', bg: 'bg-[#7dffa2]/10', border: 'border-[#7dffa2]/20' },
  fix_next:  { label: 'Fix Next',  color: 'text-[#adc6ff]', bg: 'bg-[#adc6ff]/10', border: 'border-[#adc6ff]/20' },
  stretch:   { label: 'Stretch',   color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
}

function ImprovementPriorities({ priorities }: { priorities: ImprovementPriority[] }) {
  if (priorities.length === 0) return null

  const grouped = {
    fix_first: priorities.filter(p => p.priority_tier === 'fix_first'),
    fix_next:  priorities.filter(p => p.priority_tier === 'fix_next'),
    stretch:   priorities.filter(p => p.priority_tier === 'stretch'),
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <SectionHeader icon={ArrowRight} label="Improvement Priorities" sub="elite coaching" />
      <div className="space-y-4">
        {(['fix_first', 'fix_next', 'stretch'] as const).map(tier => {
          const items = grouped[tier]
          if (items.length === 0) return null
          const style = TIER_STYLE[tier]
          return (
            <div key={tier} className="space-y-2">
              <div className={cn('inline-flex items-center px-2 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider border', style.bg, style.color, style.border)}>
                {style.label}
              </div>
              <div className="space-y-2">
                {items.map((p, i) => (
                  <div key={i} className={cn('rounded-lg border p-4 space-y-2.5', style.border, style.bg.replace('/10', '/5'))}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{p.title}</span>
                      <div className="flex items-center gap-2">
                        {p.lane_target && p.lane_target !== 'all' && (
                          <span className="text-[9px] font-mono text-muted-foreground bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                            {p.lane_target}
                          </span>
                        )}
                        <span className={cn('text-[9px] font-mono border px-1.5 py-0.5 rounded', impactColor(p.expected_impact))}>
                          {p.expected_impact} impact
                        </span>
                        <span className={cn('text-[9px] font-mono', difficultyColor(p.implementation_difficulty))}>
                          {p.implementation_difficulty} difficulty
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed font-medium">{p.recommendation}</p>
                    {suppress(p.rationale) && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{p.rationale}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Block 7: Evidence Panel
// ─────────────────────────────────────────────

const REF_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  lane_score:          { label: 'Score',    icon: BarChart2,     color: 'text-[#7dffa2]' },
  metric_signal:       { label: 'Metric',   icon: Activity,      color: 'text-blue-400' },
  judge_note:          { label: 'Judge',    icon: FileText,      color: 'text-purple-400' },
  rule_check:          { label: 'Rule',     icon: AlertCircle,   color: 'text-yellow-400' },
  integrity_mismatch:  { label: 'Integrity', icon: Shield,       color: 'text-red-400' },
  timing_event:        { label: 'Timing',   icon: Clock,         color: 'text-muted-foreground' },
  transcript_excerpt:  { label: 'Transcript', icon: FileText,    color: 'text-muted-foreground' },
  tool_trace:          { label: 'Tool',     icon: Wrench,        color: 'text-muted-foreground' },
  artifact:            { label: 'Artifact', icon: Layers,        color: 'text-muted-foreground' },
  output_diff:         { label: 'Diff',     icon: Eye,           color: 'text-muted-foreground' },
}

function EvidencePanel({ refs }: { refs: EvidenceRef[] }) {
  const [expanded, setExpanded] = useState(false)
  if (refs.length === 0) return null

  const displayRefs = expanded ? refs : refs.slice(0, 5)

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <SectionHeader icon={Eye} label="Evidence Panel" sub={`${refs.length} signals`} />
      <div className="space-y-2">
        {displayRefs.map((ref, i) => {
          const meta = REF_TYPE_META[ref.ref_type] ?? { label: ref.ref_type, icon: Eye, color: 'text-muted-foreground' }
          const Icon = meta.icon
          return (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
              <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                <Icon className={`w-3 h-3 ${meta.color}`} />
                <span className={`text-[9px] font-mono uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-xs font-medium text-foreground">{ref.label}</p>
                {ref.excerpt && (
                  <p className="text-[11px] text-muted-foreground font-mono leading-relaxed line-clamp-2">
                    {ref.excerpt}
                  </p>
                )}
                {ref.relevance && (
                  <p className="text-[10px] text-muted-foreground/60">{ref.relevance}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {refs.length > 5 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-[11px] font-mono text-[#adc6ff] hover:text-foreground transition-colors"
        >
          {expanded ? '↑ Show less' : `↓ Show ${refs.length - 5} more`}
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Block 8: Competitive Comparison
// ─────────────────────────────────────────────

// B1/D3 FIX: CompetitiveComparison only renders when competitive_comparison is non-null.
// The pipeline only sets competitive_comparison when field_stats.sample_count >= 5 AND
// the deltas are real DB-computed values. Never estimated or LLM-fabricated.
// The component also shows the data source label ("based on N submissions") so users
// understand the numbers are measured, not inferred.
function CompetitiveComparison({ comparison }: { comparison: FeedbackReport['competitive_comparison'] }) {
  if (!comparison) return null
  const points = [
    { key: 'vs_median', data: comparison.vs_median },
    { key: 'vs_top_quartile', data: comparison.vs_top_quartile },
    { key: 'vs_winner', data: comparison.vs_winner },
    { key: 'vs_prior_baseline', data: comparison.vs_prior_baseline },
  ].filter(p => p.data != null)

  if (points.length === 0 && !suppress(comparison.narrative ?? null)) return null

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <h3 className="text-sm font-semibold text-foreground">Competitive Comparison</h3>
        {/* B1: Explicit data-source badge — measured, not estimated */}
        <span className="text-[9px] font-mono text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded ml-1">
          measured
        </span>
      </div>

      {suppress(comparison.narrative ?? null) && (
        <div className="rounded-lg bg-white/3 border border-white/5 px-4 py-3">
          <p className="text-sm font-mono text-foreground">{comparison.narrative}</p>
        </div>
      )}

      {points.length > 0 && (
        <div className="space-y-2">
          {points.map(({ key, data }) => {
            if (!data) return null
            const delta = data.composite_delta
            const isPositive = delta != null && delta > 0
            const isNegative = delta != null && delta < 0
            return (
              <div key={key} className="flex items-center justify-between gap-3 py-2 border-b border-border/30 last:border-0">
                <span className="text-xs text-muted-foreground">{data.label}</span>
                <div className="flex items-center gap-3">
                  {delta != null && (
                    <div className={cn('flex items-center gap-1', isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-muted-foreground')}>
                      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : isNegative ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      <span className="text-xs font-mono font-bold">
                        {isPositive ? '+' : ''}{delta.toFixed(1)}
                      </span>
                    </div>
                  )}
                  {data.summary && (
                    <span className="text-[11px] text-muted-foreground max-w-[200px] text-right">{data.summary}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Block 10: Longitudinal Profile
// ─────────────────────────────────────────────

function LongitudinalProfile({ longitudinal }: { longitudinal: AgentLongitudinalSummary }) {
  const hasRegressions = longitudinal.regression_warnings.length > 0
  const hasRecurringFailures = longitudinal.recurring_failure_modes.filter(f => f.count >= 2).length > 0
  const hasImprovements = longitudinal.improvement_trends.filter(t => t.direction === 'improving').length > 0

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <SectionHeader icon={Activity} label="Agent Performance Profile" sub={`${longitudinal.total_bouts} bouts`} />

      {/* Rolling score + volatility */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Overall',  score: longitudinal.rolling_overall_score },
          { label: 'Volatility', score: longitudinal.score_volatility, unit: 'σ', invert: true },
        ].map(item => (
          <div key={item.label} className="rounded-lg bg-white/3 border border-white/5 p-3 space-y-1">
            <span className="text-[10px] font-mono text-muted-foreground">{item.label}</span>
            <span className={cn('text-2xl font-mono font-bold block', item.score != null ? (item.invert ? (item.score < 10 ? 'text-green-400' : item.score < 20 ? 'text-yellow-400' : 'text-red-400') : scoreColor(item.score)) : 'text-muted-foreground')}>
              {item.score != null ? `${item.score.toFixed(1)}${item.unit ?? ''}` : '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Lane trends */}
      {longitudinal.lane_trends.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Lane Trends</span>
          <div className="grid grid-cols-2 gap-2">
            {longitudinal.lane_trends.map(lt => {
              const TrendIcon = lt.trend_direction === 'improving' ? ArrowUpRight :
                                lt.trend_direction === 'declining' ? ArrowDownRight :
                                lt.trend_direction === 'volatile' ? Activity : Minus
              const trendColor = lt.trend_direction === 'improving' ? 'text-green-400' :
                                 lt.trend_direction === 'declining' ? 'text-red-400' :
                                 lt.trend_direction === 'volatile' ? 'text-yellow-400' : 'text-muted-foreground'
              return (
                <div key={lt.lane} className="flex items-center justify-between rounded-lg bg-white/3 border border-white/5 p-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground capitalize">{lt.lane}</span>
                    <TrendIcon className={`w-3 h-3 ${trendColor}`} />
                  </div>
                  <span className={cn('text-sm font-mono font-bold', lt.current_avg != null ? scoreColor(lt.current_avg) : 'text-muted-foreground')}>
                    {lt.current_avg != null ? lt.current_avg.toFixed(0) : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recurring failure modes */}
      {hasRecurringFailures && (
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-red-400/70">Recurring Failure Modes</span>
          <div className="flex flex-wrap gap-2">
            {longitudinal.recurring_failure_modes
              .filter(f => f.count >= 2)
              .slice(0, 5)
              .map((fm, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5">
                  <span className="text-xs text-foreground">{FAILURE_MODE_LABELS[fm.failure_mode_code] ?? fm.failure_mode_code}</span>
                  <span className="text-[10px] font-mono text-red-400 bg-red-500/15 px-1 rounded">×{fm.count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recurring strengths + weaknesses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {longitudinal.recurring_strengths.filter(s => s.count >= 2).length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-green-400/70">Recurring Strengths</span>
            {longitudinal.recurring_strengths.filter(s => s.count >= 2).slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate max-w-[180px]">{s.label}</span>
                <span className="text-[10px] font-mono text-green-400">×{s.count}</span>
              </div>
            ))}
          </div>
        )}
        {longitudinal.recurring_weaknesses.filter(w => w.count >= 2).length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-red-400/70">Recurring Weaknesses</span>
            {longitudinal.recurring_weaknesses.filter(w => w.count >= 2).slice(0, 3).map((w, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate max-w-[180px]">{w.label}</span>
                <span className="text-[10px] font-mono text-red-400">×{w.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Regression warnings */}
      {hasRegressions && (
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-yellow-400/70">Regression Warnings</span>
          {longitudinal.regression_warnings.slice(0, 3).map((w, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-foreground">{w.warning}</p>
            </div>
          ))}
        </div>
      )}

      {/* Improvement signals */}
      {hasImprovements && (
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-green-400/70">Improvement Signals</span>
          {longitudinal.improvement_trends.filter(t => t.direction === 'improving').slice(0, 3).map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <TrendingUp className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-foreground">{t.area}: {t.evidence}</p>
              <ConfidenceBadge level={t.confidence} />
            </div>
          ))}
        </div>
      )}

      {/* Recent bouts */}
      {longitudinal.recent_bouts.length > 1 && (
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Recent Bouts</span>
          <div className="space-y-1">
            {longitudinal.recent_bouts.slice(0, 5).map((b, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-border/20 last:border-0">
                <span className="text-muted-foreground truncate max-w-[180px]">{b.challenge_title ?? b.submission_id.slice(0, 8)}</span>
                <div className="flex items-center gap-2">
                  {b.primary_failure && (
                    <span className="text-[10px] font-mono text-muted-foreground/50">{b.primary_failure.replace(/_/g, ' ').slice(0, 20)}</span>
                  )}
                  <span className={cn('font-mono font-bold', b.composite_score != null ? scoreColor(b.composite_score) : 'text-muted-foreground')}>
                    {b.composite_score != null ? b.composite_score.toFixed(0) : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Loading State
// ─────────────────────────────────────────────

// C2 FIX: Loading component is now only used as an inline indicator, not the main view.
// The replay page shows classic breakdown immediately and overlays this indicator in the tab.
export function PerformanceBreakdownLoading() {
  return (
    <div className="rounded-xl border border-[#adc6ff]/15 bg-[#adc6ff]/5 p-6 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-[#adc6ff] border-t-transparent rounded-full animate-spin flex-shrink-0" />
        <div>
          <p className="text-sm text-[#adc6ff] font-mono">Forensic analysis in progress…</p>
          <p className="text-xs text-muted-foreground mt-0.5">Performance Breakdown takes ~15–45s to generate.</p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground/60 font-mono pl-8">
        Score Breakdown is available immediately on the other tab.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────

interface PerformanceBreakdownProps {
  report: FeedbackReport
  compositeScore?: number | null
  placement?: number | null
  totalEntries?: number | null
  isProvisional?: boolean
  submissionSource?: string | null
}

export function PerformanceBreakdown({
  report,
  compositeScore,
  placement,
  totalEntries,
  isProvisional = false,
  submissionSource,
}: PerformanceBreakdownProps) {
  return (
    <div className="space-y-4">
      {/* 1 — Outcome Header */}
      <OutcomeHeader
        report={report}
        compositeScore={compositeScore ?? null}
        placement={placement ?? null}
        totalEntries={totalEntries ?? null}
        isProvisional={isProvisional}
        submissionSource={submissionSource}
      />

      {/* 2 — Executive Diagnosis */}
      <ExecutiveDiagnosis report={report} />

      {/* 3 — Lane Scorecards */}
      {report.lane_feedback.length > 0 && (
        <LaneScorecards lanes={report.lane_feedback} />
      )}

      {/* 4 — Decisive Factors */}
      <DecisiveFactors
        positive={report.decisive_positive_factors}
        negative={report.decisive_negative_factors}
      />

      {/* 5 — Failure Mode Analysis */}
      {report.failure_modes.length > 0 && (
        <FailureModesPanel modes={report.failure_modes} />
      )}

      {/* 6 — Improvement Priorities */}
      {report.improvement_priorities.length > 0 && (
        <ImprovementPriorities priorities={report.improvement_priorities} />
      )}

      {/* 7 — Evidence Panel */}
      {report.evidence_refs.length > 0 && (
        <EvidencePanel refs={report.evidence_refs} />
      )}

      {/* 8 — Competitive Comparison */}
      {report.competitive_comparison && (
        <CompetitiveComparison comparison={report.competitive_comparison} />
      )}

      {/* 9 — Confidence block (already integrated into Executive Diagnosis) */}

      {/* 10 — Longitudinal Profile */}
      {report.longitudinal && report.longitudinal.total_bouts > 0 && (
        <LongitudinalProfile longitudinal={report.longitudinal} />
      )}
    </div>
  )
}
