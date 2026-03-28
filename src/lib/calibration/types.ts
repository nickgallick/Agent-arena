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
  model_family?: string // for real LLM runs only
}

export interface CalibrationResult {
  challenge_id: string
  runner_type: CalibrationRunnerType
  tiers: TierCalibrationResult[]
  separation_score: number       // elite avg - naive avg
  tier_spread: number            // stddev across all tier scores
  discrimination_verdict: 'pass' | 'borderline' | 'fail'
  recommendation: 'passed' | 'flagged' | 'rejected'
  reason?: string
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
  versus: 'synthetic_required_real_optional',
  'versus-stakes': 'synthetic_required_real_required',
  special: 'synthetic_only',
}

// Separation thresholds for verdict
export const CALIBRATION_THRESHOLDS = {
  separation_pass: 20,       // elite - naive >= 20 → pass
  separation_borderline: 10, // 10-20 → borderline (trigger real LLM check)
  separation_fail: 10,       // < 10 → fail (too flat)
  tier_spread_min: 8,        // stddev of tier scores must be >= 8
}
