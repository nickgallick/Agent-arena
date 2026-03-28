/**
 * Bouts Calibration System — Shared Types
 * 
 * Both synthetic and real LLM runners implement the CalibrationRunner interface.
 * Swap implementations without changing orchestrator code.
 */

export type CalibrationTier = 'naive' | 'standard' | 'strong' | 'elite'

export type CalibrationRunnerType = 'synthetic' | 'real_llm'

export type MutationType = 'semantic' | 'structural' | 'adversarial'

export type CalibrationPolicy = 'synthetic_only' | 'synthetic_required_real_optional' | 'synthetic_required_real_required'

export type SameModelClusteringRisk = 'low' | 'medium' | 'high'

export type BorderlineTrigger =
  | 'tier_spread_below_threshold'
  | 'separation_near_boundary'
  | 'synthetic_elite_below_ceiling'
  | 'synthetic_naive_too_high'
  | 'judge_spread_suspiciously_low'
  | 'score_compression_detected'

export interface ChallengeCalibrationInput {
  challenge_id: string
  title: string
  prompt: string
  format: string
  category: string
  difficulty_profile?: Record<string, number> | null
  judge_weights?: Record<string, number> | null
  time_limit_minutes: number
  has_objective_tests: boolean
  challenge_type?: string | null
}

export interface TierCalibrationResult {
  tier: CalibrationTier
  runner_type: CalibrationRunnerType
  composite_score: number
  objective_score: number
  process_score: number
  strategy_score: number
  integrity_adjustment: number
  objective_passed: boolean
  submission_summary: string
  flags: string[]
  latency_ms?: number
  model_family?: string
  // Raw artifacts for audit
  raw_submission?: string
  judge_rationale?: string
  judge_models_used?: string[]
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
  // New fields
  same_model_clustering_risk: SameModelClusteringRisk
  borderline_triggers: BorderlineTrigger[]
  cost_tokens?: number
  run_at: string
}

export interface CalibrationRunner {
  type: CalibrationRunnerType
  run(input: ChallengeCalibrationInput): Promise<CalibrationResult>
}

// Policy mapping: what calibration is required per challenge class
export const CALIBRATION_POLICY: Record<string, CalibrationPolicy> = {
  daily: 'synthetic_only',
  standard: 'synthetic_required_real_optional',
  featured: 'synthetic_required_real_required',
  boss: 'synthetic_required_real_required',
  abyss: 'synthetic_required_real_required',
  prize: 'synthetic_required_real_required',
  versus: 'synthetic_required_real_optional',          // unranked/casual
  'versus-ranked': 'synthetic_required_real_required', // ranked versus
  'versus-stakes': 'synthetic_required_real_required',
  special: 'synthetic_only',
}

// Separation thresholds for verdict
export const CALIBRATION_THRESHOLDS = {
  separation_pass: 20,
  separation_borderline: 10,
  separation_fail: 10,
  tier_spread_min: 8,
  // Borderline trigger thresholds
  elite_ceiling_min: 75,     // elite should score >= 75 or flag
  naive_ceiling_max: 30,     // naive should score <= 30 or flag
  judge_spread_suspicious: 3, // if all judges within 3pts of each other, flag
  clustering_risk_threshold: 8, // adjacent tier score delta < 8 = clustering risk
}

// Token budget per calibration type
export const COST_CONTROLS = {
  max_tokens_per_tier: 2000,
  max_total_tokens: 10000,
  max_real_retries: 2,
  cache_ttl_hours: 24, // skip real rerun if prompt hash unchanged within 24h
}
