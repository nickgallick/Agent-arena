// Premium Feedback System — Shared Types
// Forge · 2026-03-31
//
// Four-stage pipeline:
//   Stage 1: Signal Extraction  — pull raw signals from judge outputs, telemetry, evidence
//   Stage 2: Diagnosis Synthesis — LLM synthesizes diagnosis from extracted signals
//   Stage 3: Coaching Translation — LLM generates actionable coaching from diagnosis
//   Stage 4: Longitudinal Update — updates agent_performance_profiles
//
// Every type is explicit. No 'any'. No loose objects.

// ─────────────────────────────────────────────
// Failure Mode Taxonomy
// ─────────────────────────────────────────────

export const FAILURE_MODE_CODES = [
  'hidden_constraint_miss',
  'validation_omission',
  'premature_convergence',
  'brittle_workaround',
  'hallucinated_completion',
  'unsupported_certainty',
  'misleading_implication',
  'poor_recovery',
  'spec_drift',
  'shallow_decomposition',
  'tool_misuse',
  'overoptimized_visible_req',
  'sacrificed_reliability',
  'format_noncompliance',
  'timeout_pacing_collapse',
  'none_detected',
] as const

export type FailureModeCode = typeof FAILURE_MODE_CODES[number]

export const FAILURE_MODE_LABELS: Record<FailureModeCode, string> = {
  hidden_constraint_miss:      'Hidden Constraint Miss',
  validation_omission:         'Validation Omission',
  premature_convergence:       'Premature Convergence',
  brittle_workaround:          'Brittle Workaround',
  hallucinated_completion:     'Hallucinated Completion',
  unsupported_certainty:       'Unsupported Certainty',
  misleading_implication:      'Misleading Implication',
  poor_recovery:               'Poor Recovery',
  spec_drift:                  'Spec Drift',
  shallow_decomposition:       'Shallow Decomposition',
  tool_misuse:                 'Tool Misuse',
  overoptimized_visible_req:   'Overoptimized Visible Requirements',
  sacrificed_reliability:      'Sacrificed Reliability for Speed',
  format_noncompliance:        'Format Noncompliance',
  timeout_pacing_collapse:     'Timeout / Pacing Collapse',
  none_detected:               'No Failure Mode Detected',
}

export const FAILURE_MODE_DESCRIPTIONS: Record<FailureModeCode, string> = {
  hidden_constraint_miss:      'Agent ignored a non-obvious constraint in the spec or hidden tests',
  validation_omission:         'Output was not verified before being marked complete — claimed done without confirming',
  premature_convergence:       'Locked the first viable path without exploring alternatives or checking edge cases',
  brittle_workaround:          'Applied a fix that works on the visible case but fails under slight variation',
  hallucinated_completion:     'Claimed task was complete when it demonstrably was not',
  unsupported_certainty:       'Expressed high confidence in claims that lacked supporting evidence or verification',
  misleading_implication:      'Output implies correctness or completeness it does not actually have',
  poor_recovery:               'Failed to effectively recover from early errors — compounded rather than corrected',
  spec_drift:                  'Solution gradually diverged from original requirements during implementation',
  shallow_decomposition:       'Skipped depth on hard sub-problems — surfaced the structure but avoided the hard parts',
  tool_misuse:                 'Misused available tools or chose the wrong tool for the job',
  overoptimized_visible_req:   'Nailed the visible/easy requirements while ignoring hidden or harder ones',
  sacrificed_reliability:      'Traded correctness or robustness for speed — fast answer that is often wrong',
  format_noncompliance:        'Output violated the required format, schema, or structural constraints',
  timeout_pacing_collapse:     'Ran out of time or session budget — poor pacing or wasted effort on wrong things',
  none_detected:               'No dominant failure mode identified in this submission',
}

// ─────────────────────────────────────────────
// Stage 1 — Extracted Signals
// ─────────────────────────────────────────────

export interface LaneSignal {
  lane: string
  score: number
  confidence: 'high' | 'medium' | 'low'
  flags: string[]
  rationale: string
  dimension_scores: Record<string, number>
  positive_signal: string | null
  primary_weakness: string | null
  integrity_outcome?: string | null
  integrity_adjustment?: number
  evidence_refs: string[]
}

export interface TelemetrySignal {
  thrash_rate: number
  tool_discipline: number
  verification_density: number
  wasted_action_ratio: number
  pct_verify: number
  pct_recover: number
  pct_implement: number
  pct_explore: number
  error_count: number
  retry_count: number
  revert_count: number
  pivot_count: number
  total_events: number
  total_duration_ms: number
  telemetry_process_score: number
  telemetry_recovery_score: number
  telemetry_efficiency_score: number
}

export interface ExtractedSignals {
  submission_id: string
  entry_id: string | null
  agent_id: string
  challenge_id: string
  challenge_family: string | null
  challenge_category: string | null
  challenge_type: string | null
  composite_score: number | null
  lane_signals: LaneSignal[]
  telemetry: TelemetrySignal | null
  integrity_adjustment: number
  placement: number | null
  total_entries: number | null
  challenge_ends_at: string | null
  // Prior agent profile for longitudinal context
  prior_profile: AgentPriorProfile | null
  // Judge outputs raw (for evidence extraction)
  judge_outputs_raw: JudgeOutputRaw[]
  // Submission content snippet (first 2000 chars for LLM context)
  submission_content_snippet: string | null
}

export interface JudgeOutputRaw {
  id: string
  lane: string
  score: number
  confidence: number
  flags: string[]
  short_rationale: string
  dimension_scores: Record<string, number>
  positive_signal: string | null
  primary_weakness: string | null
}

export interface AgentPriorProfile {
  total_bouts: number
  rolling_overall_score: number | null
  rolling_objective_score: number | null
  rolling_process_score: number | null
  rolling_strategy_score: number | null
  rolling_integrity_score: number | null
  recurring_failure_modes: { code: string; count: number }[]
  recurring_weaknesses: { label: string; count: number }[]
  recurring_strengths: { label: string; count: number }[]
}

// ─────────────────────────────────────────────
// Stage 2 — Diagnosis Output
// ─────────────────────────────────────────────

export interface FailureModeClassification {
  failure_mode_code: FailureModeCode
  severity: 'critical' | 'high' | 'medium' | 'low'
  confidence: 'high' | 'medium' | 'low'
  primary_flag: boolean
  explanation: string
  evidence_signal: string     // What in the data points to this
}

export interface LaneDiagnosis {
  lane: string
  score: number
  percentile: number | null
  confidence: 'high' | 'medium' | 'low'
  strongest_behavior: string
  weakest_behavior: string
  primary_driver: string
  secondary_driver: string | null
  what_went_right: string
  what_went_wrong: string
  what_this_means: string
  improvement_recommendation: string
  evidence_refs: string[]
}

export interface DiagnosisOutput {
  // Executive summary
  overall_summary: string
  executive_diagnosis: string
  result_narrative: string

  // Causal attribution
  primary_loss_driver: string
  secondary_loss_driver: string | null
  decisive_moment: string

  // Character signals
  dominant_strength: string
  dominant_weakness: string

  // Failure modes
  failure_modes: FailureModeClassification[]

  // Lane-level
  lane_diagnoses: LaneDiagnosis[]

  // Decisive factors
  decisive_positive_factors: DecisiveFactor[]
  decisive_negative_factors: DecisiveFactor[]

  // Competitive context
  competitive_comparison: CompetitiveComparison | null

  // Confidence
  confidence_overall: 'high' | 'medium' | 'low'
  evidence_density_score: number
  ambiguity_level: 'low' | 'medium' | 'high'
}

export interface DecisiveFactor {
  title: string
  description: string
  impact_direction: 'positive' | 'negative'
  impact_magnitude: 'high' | 'medium' | 'low'
  lane: string
  evidence_signal: string
}

export interface CompetitiveComparison {
  vs_median: ComparisonPoint | null
  vs_top_quartile: ComparisonPoint | null
  vs_winner: ComparisonPoint | null
  vs_prior_baseline: ComparisonPoint | null
  narrative: string    // e.g. "Outperformed field on strategy, lost on validation discipline"
}

export interface ComparisonPoint {
  label: string
  composite_delta: number | null     // positive = above, negative = below
  objective_delta: number | null
  process_delta: number | null
  strategy_delta: number | null
  summary: string
}

// ─────────────────────────────────────────────
// Stage 3 — Coaching Output
// ─────────────────────────────────────────────

export interface ImprovementPriority {
  priority_rank: number
  priority_tier: 'fix_first' | 'fix_next' | 'stretch'
  title: string
  recommendation: string
  rationale: string
  expected_impact: 'high' | 'medium' | 'low'
  implementation_difficulty: 'low' | 'medium' | 'high'
  lane_target: 'objective' | 'process' | 'strategy' | 'integrity' | 'all'
}

export interface CoachingOutput {
  highest_leverage_fix: string
  next_best_fix: string
  improvement_priorities: ImprovementPriority[]
}

// ─────────────────────────────────────────────
// Evidence Ref
// ─────────────────────────────────────────────

export interface EvidenceRef {
  ref_type: 'transcript_excerpt' | 'tool_trace' | 'output_diff' | 'rule_check' |
            'judge_note' | 'artifact' | 'integrity_mismatch' | 'timing_event' |
            'lane_score' | 'metric_signal'
  ref_key: string | null
  label: string
  excerpt: string | null
  relevance: string | null
  metadata: Record<string, unknown>
}

// ─────────────────────────────────────────────
// Full Feedback Report (assembled from all stages)
// ─────────────────────────────────────────────

export interface FeedbackReport {
  report_id: string
  submission_id: string
  entry_id: string | null
  version: number
  status: 'pending' | 'generating' | 'ready' | 'failed' | 'stale'

  // Stage 2 — diagnosis
  overall_summary: string | null
  executive_diagnosis: string | null
  result_narrative: string | null
  primary_loss_driver: string | null
  secondary_loss_driver: string | null
  decisive_moment: string | null
  dominant_strength: string | null
  dominant_weakness: string | null
  confidence_overall: 'high' | 'medium' | 'low'
  evidence_density_score: number | null
  ambiguity_level: 'low' | 'medium' | 'high'

  // Stage 3 — coaching
  highest_leverage_fix: string | null
  next_best_fix: string | null
  improvement_priorities: ImprovementPriority[]

  // Lane cards
  lane_feedback: LaneDiagnosis[]

  // Failure modes
  failure_modes: FailureModeClassification[]

  // Decisive factors
  decisive_positive_factors: DecisiveFactor[]
  decisive_negative_factors: DecisiveFactor[]

  // Competitive comparison
  competitive_comparison: CompetitiveComparison | null

  // Evidence panel
  evidence_refs: EvidenceRef[]

  // Longitudinal (from agent profile)
  longitudinal: AgentLongitudinalSummary | null

  created_at: string
  updated_at: string
}

// ─────────────────────────────────────────────
// Longitudinal Summary (for display)
// ─────────────────────────────────────────────

export interface AgentLongitudinalSummary {
  total_bouts: number
  rolling_overall_score: number | null
  lane_trends: LaneTrend[]
  recurring_strengths: RecurringPattern[]
  recurring_weaknesses: RecurringPattern[]
  recurring_failure_modes: RecurringFailureMode[]
  improvement_trends: ImprovementTrend[]
  regression_warnings: RegressionWarning[]
  challenge_type_performance: ChallengeTypePerf[]
  score_volatility: number | null
  recent_bouts: RecentBout[]
}

export interface LaneTrend {
  lane: string
  scores: number[]          // Last up to 10 scores
  trend_direction: 'improving' | 'declining' | 'stable' | 'volatile'
  current_avg: number | null
}

export interface RecurringPattern {
  code: string
  label: string
  count: number
  last_seen: string | null
}

export interface RecurringFailureMode {
  failure_mode_code: FailureModeCode
  label: string
  count: number
  last_seen: string | null
  severity: string
}

export interface ImprovementTrend {
  area: string
  direction: 'improving' | 'declining' | 'stable'
  confidence: 'high' | 'medium' | 'low'
  evidence: string
}

export interface RegressionWarning {
  lane: string
  warning: string
  detected_at: string
  severity: 'critical' | 'high' | 'medium'
}

export interface ChallengeTypePerf {
  type: string
  avg_score: number
  count: number
  trend: 'improving' | 'declining' | 'stable'
}

export interface RecentBout {
  submission_id: string
  composite_score: number | null
  primary_failure: string | null
  challenge_title: string | null
  created_at: string
}
