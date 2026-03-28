/**
 * Bouts Calibration System — Shared Types
 */

export type CalibrationTier = 'naive' | 'standard' | 'strong' | 'elite'
export type CalibrationRunnerType = 'synthetic' | 'real_llm'
export type MutationType = 'semantic' | 'structural' | 'adversarial'
export type CalibrationPolicy = 'synthetic_only' | 'synthetic_required_real_optional' | 'synthetic_required_real_required'
export type SameModelClusteringRisk = 'low' | 'medium' | 'high'
export type JudgeDivergenceRisk = 'low' | 'medium' | 'high' | 'escalated'

export type BorderlineTrigger =
  | 'tier_spread_below_threshold'
  | 'separation_near_boundary'
  | 'synthetic_elite_below_ceiling'
  | 'synthetic_naive_too_high'
  | 'judge_spread_suspiciously_low'
  | 'score_compression_detected'
  | 'judge_divergence_high'         // new: primary vs audit delta too large
  | 'judge_divergence_escalated'    // new: escalated instead of blended

export interface ChallengeCalibrationInput {
  challenge_id: string
  title: string
  prompt: string
  format: string
  category: string
  difficulty_profile?: Record<string, number> | null
  judge_weights?: Record<string, number> | null
  judge_config_version?: string      // for cache key
  model_version?: string             // for cache key
  time_limit_minutes: number
  has_objective_tests: boolean
  challenge_type?: string | null
}

// Per-lane raw scores — preserved for full audit trail
export interface LaneScoringBreakdown {
  lane: 'objective' | 'process' | 'strategy' | 'integrity'
  raw_score: number
  weighted_contribution: number
  weight_applied: number
  evidence_summary?: string
  flags?: string[]
}

export interface TierCalibrationResult {
  tier: CalibrationTier
  runner_type: CalibrationRunnerType
  composite_score: number
  // Raw per-lane breakdowns (item 4)
  lane_breakdowns: LaneScoringBreakdown[]
  objective_score: number
  process_score: number
  strategy_score: number
  integrity_adjustment: number
  objective_passed: boolean
  submission_summary: string
  flags: string[]
  latency_ms?: number
  model_family?: string
  raw_submission?: string
  judge_rationale?: string
  judge_models_used?: string[]
  // Judge divergence info (item 1 + 2)
  primary_composite?: number
  audit_composite?: number
  judge_delta?: number
  judge_resolution?: 'averaged' | 'escalated' | 'primary_only' | 'fallback'
}

export interface CalibrationResult {
  challenge_id: string
  runner_type: CalibrationRunnerType
  tiers: TierCalibrationResult[]
  separation_score: number
  tier_spread: number
  discrimination_verdict: 'pass' | 'borderline' | 'fail'
  recommendation: 'passed' | 'flagged' | 'rejected'
  reason?: string
  same_model_clustering_risk: SameModelClusteringRisk
  judge_divergence_risk: JudgeDivergenceRisk   // item 2: first-class signal
  borderline_triggers: BorderlineTrigger[]
  cost_tokens?: number
  cache_key?: string                            // item 5: full cache key
  run_at: string
}

export interface CalibrationRunner {
  type: CalibrationRunnerType
  run(input: ChallengeCalibrationInput): Promise<CalibrationResult>
}

// Flagship families that require hard anti-drift gates (item 3)
export const FLAGSHIP_FAMILIES = new Set(['boss', 'abyss', 'versus-stakes', 'featured'])

// Hard anti-drift gates for flagship families
export const FLAGSHIP_ANTI_DRIFT_GATES = {
  require_family_identity_preserved: true,
  require_freshness_increased: true,
  max_generation: 5,
  require_invariants_listed: true,
}

export const CALIBRATION_POLICY: Record<string, CalibrationPolicy> = {
  daily: 'synthetic_only',
  standard: 'synthetic_required_real_optional',
  featured: 'synthetic_required_real_required',
  boss: 'synthetic_required_real_required',
  abyss: 'synthetic_required_real_required',
  prize: 'synthetic_required_real_required',
  versus: 'synthetic_required_real_optional',
  'versus-ranked': 'synthetic_required_real_required',
  'versus-stakes': 'synthetic_required_real_required',
  special: 'synthetic_only',
}

export const CALIBRATION_THRESHOLDS = {
  separation_pass: 20,
  separation_borderline: 10,
  separation_fail: 10,
  tier_spread_min: 8,
  elite_ceiling_min: 45,   // lowered — Sonnet can score 45-90 on hard challenges
  naive_ceiling_max: 45,   // raised — Llama 8B realistically scores 35-50 even when prompted naive
  judge_spread_suspicious: 3,
  clustering_risk_threshold: 8,
  // Judge divergence thresholds (item 1 + 2)
  judge_delta_blend_max: 35,       // avg if delta <= 35 (raised — normal LLM disagreement range)
  judge_delta_escalate: 45,        // escalate if delta > 45 (was 26 — was triggering on normal variance)
  judge_divergence_medium: 15,     // medium risk >= 15pt delta
  judge_divergence_high: 30,       // high risk >= 30pt delta
}

export const COST_CONTROLS = {
  max_tokens_per_tier: 2000,
  max_total_tokens: 10000,
  max_real_retries: 2,
  cache_ttl_hours: 24,
}
