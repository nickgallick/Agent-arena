'use client'

// PostMatchBreakdown — Phase 6
// Shows real lane scores, telemetry, dispute status, dimension breakdowns
// All data sourced from judge_outputs + run_metrics — no fake data
// Forge · 2026-03-27

import { CapabilityRadar } from '@/components/leaderboard/capability-radar'
import { AlertTriangle, CheckCircle, Shield, Zap, Brain, Wrench, BarChart2, Clock } from 'lucide-react'

interface JudgeOutput {
  id: string
  lane: string
  model_id: string
  score: number
  confidence: number
  dimension_scores: Record<string, number>
  evidence_refs: string[]
  short_rationale: string
  flags: string[]
  integrity_outcome?: string
  integrity_adjustment?: number
  latency_ms?: number
  is_fallback: boolean
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
  processScore?: number | null
  strategyScore?: number | null
  integrityAdjustment?: number
  efficiencyScore?: number | null
  runMetrics?: RunMetrics | null
  disputeFlag?: DisputeFlag | null
  challengeFormat?: string | null
}

const LANE_META: Record<string, { label: string; icon: React.ElementType; color: string; model: string }> = {
  process:   { label: 'Process',   icon: Wrench, color: 'text-blue-400',   model: 'Claude' },
  strategy:  { label: 'Strategy',  icon: Brain,  color: 'text-purple-400', model: 'GPT-4o' },
  integrity: { label: 'Integrity', icon: Shield, color: 'text-green-400',  model: 'Gemini' },
  audit:     { label: 'Audit',     icon: BarChart2, color: 'text-yellow-400', model: 'Claude Opus' },
}

function ScoreBar({ value, max = 100, color = 'bg-blue-500' }: { value: number; max?: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function pct(v: number) { return `${(v * 100).toFixed(0)}%` }
function scoreColor(v: number) {
  if (v >= 70) return 'text-green-400'
  if (v >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

export function PostMatchBreakdown({
  judgeOutputs,
  compositeScore,
  processScore,
  strategyScore,
  integrityAdjustment = 0,
  efficiencyScore,
  runMetrics,
  disputeFlag,
  challengeFormat = 'standard',
}: PostMatchBreakdownProps) {
  const hasLaneData = judgeOutputs.length > 0
  const hasMetrics = runMetrics != null

  // Build radar data from lane scores
  const radarData = {
    reasoning_depth: strategyScore ?? 50,
    tool_discipline: runMetrics ? runMetrics.tool_discipline * 100 : (processScore ?? 50),
    recovery_quality: processScore ?? 50,
    strategic_planning: strategyScore ?? 50,
    integrity_reliability: compositeScore ? Math.min(100, 50 + (integrityAdjustment ?? 0) * 2) : 50,
    verification_discipline: runMetrics ? runMetrics.verification_density * 200 : 50,
  }

  return (
    <div className="space-y-6">

      {/* Dispute banner */}
      {disputeFlag && disputeFlag.status !== 'resolved' && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-300">Score Under Review</p>
            <p className="text-xs text-yellow-400/80 mt-0.5">
              Judge spread exceeded threshold ({disputeFlag.max_judge_spread?.toFixed(1)}pts).
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

      {/* Composite score header */}
      {compositeScore != null && (
        <div className="rounded-xl border border-border bg-card p-6 flex items-center gap-6">
          <div className="flex-shrink-0">
            <CapabilityRadar data={radarData} size={100} showLabels={false} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
              Composite Score · {challengeFormat} format
            </div>
            <div className={`text-4xl font-mono font-bold ${scoreColor(compositeScore)}`}>
              {compositeScore.toFixed(1)}
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
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
      )}

      {/* Lane judge breakdown */}
      {hasLaneData && (
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Judge Breakdown</h3>
          {judgeOutputs.map(output => {
            const meta = LANE_META[output.lane] ?? { label: output.lane, icon: BarChart2, color: 'text-muted-foreground', model: output.model_id }
            const Icon = meta.icon
            return (
              <div key={output.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${meta.color}`} />
                    <span className={`text-sm font-semibold ${meta.color}`}>{meta.label} Judge</span>
                    <span className="text-[10px] font-mono text-muted-foreground">· {meta.model}</span>
                    {output.is_fallback && (
                      <span className="text-[10px] font-mono text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">fallback</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {output.latency_ms && (
                      <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />{(output.latency_ms / 1000).toFixed(1)}s
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground">
                      conf {(output.confidence * 100).toFixed(0)}%
                    </span>
                    <span className={`text-xl font-mono font-bold ${scoreColor(output.score)}`}>
                      {output.score.toFixed(0)}
                    </span>
                  </div>
                </div>

                <ScoreBar value={output.score} color={
                  output.lane === 'process' ? 'bg-blue-500' :
                  output.lane === 'strategy' ? 'bg-purple-500' :
                  output.lane === 'integrity' ? 'bg-green-500' : 'bg-yellow-500'
                } />

                {output.short_rationale && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{output.short_rationale}</p>
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
                        <ScoreBar value={val} color="bg-white/20" />
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
                    {output.integrity_adjustment !== 0 && (
                      <span>{output.integrity_adjustment! > 0 ? '+' : ''}{output.integrity_adjustment}</span>
                    )}
                  </div>
                )}

                {/* Evidence refs */}
                {output.evidence_refs && output.evidence_refs.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-border/50">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Evidence</span>
                    {output.evidence_refs.slice(0, 3).map((ref, i) => (
                      <p key={i} className="text-[11px] text-muted-foreground italic pl-2 border-l border-border">
                        "{ref}"
                      </p>
                    ))}
                  </div>
                )}

                {/* Flags */}
                {output.flags && output.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {output.flags.map((flag, i) => (
                      <span key={i} className="text-[10px] font-mono bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Telemetry breakdown */}
      {hasMetrics && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-semibold text-foreground">Telemetry</h3>
            <span className="text-[10px] font-mono text-muted-foreground">· {runMetrics.total_events} events captured</span>
          </div>

          {/* Key metrics grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Thrash Rate',    value: pct(runMetrics.thrash_rate),      bad: runMetrics.thrash_rate > 0.3 },
              { label: 'Tool Discipline',value: pct(runMetrics.tool_discipline),   bad: runMetrics.tool_discipline < 0.5 },
              { label: 'Verify Density', value: pct(runMetrics.verification_density), bad: runMetrics.verification_density < 0.1 },
              { label: 'Waste Ratio',    value: pct(runMetrics.wasted_action_ratio), bad: runMetrics.wasted_action_ratio > 0.4 },
              { label: 'Pivot Count',    value: String(runMetrics.pivot_count),   bad: false },
              { label: 'Errors',         value: String(runMetrics.error_count),   bad: runMetrics.error_count > 5 },
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
                { pct: runMetrics.pct_explore,    color: 'bg-blue-500',   label: 'explore' },
                { pct: runMetrics.pct_plan,        color: 'bg-indigo-500', label: 'plan' },
                { pct: runMetrics.pct_implement,   color: 'bg-purple-500', label: 'implement' },
                { pct: runMetrics.pct_verify,      color: 'bg-green-500',  label: 'verify' },
                { pct: runMetrics.pct_recover,     color: 'bg-red-500',    label: 'recover' },
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
                { label: 'Explore',    pct: runMetrics.pct_explore,    color: 'bg-blue-500' },
                { label: 'Plan',       pct: runMetrics.pct_plan,        color: 'bg-indigo-500' },
                { label: 'Implement',  pct: runMetrics.pct_implement,   color: 'bg-purple-500' },
                { label: 'Verify',     pct: runMetrics.pct_verify,      color: 'bg-green-500' },
                { label: 'Recover',    pct: runMetrics.pct_recover,     color: 'bg-red-500' },
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
              { label: 'Process Score',   val: runMetrics.telemetry_process_score },
              { label: 'Recovery Score',  val: runMetrics.telemetry_recovery_score },
              { label: 'Efficiency Score',val: runMetrics.telemetry_efficiency_score },
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

      {/* No data state */}
      {!hasLaneData && !hasMetrics && compositeScore == null && (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Score breakdown not yet available for this entry.</p>
        </div>
      )}
    </div>
  )
}
