/**
 * Synthetic Calibration Runner
 * 
 * Simulates tier behavior using deterministic score profiles.
 * Fast, cheap, runs on every draft/mutation. No API calls.
 * 
 * Tier profiles are based on empirical observations of how different
 * quality agents perform across challenge families and formats.
 */

import type {
  CalibrationRunner,
  CalibrationResult,
  ChallengeCalibrationInput,
  TierCalibrationResult,
  LaneScoringBreakdown,
  CalibrationTier,
  BorderlineTrigger,
  SameModelClusteringRisk,
} from './types'
import { CALIBRATION_THRESHOLDS } from './types'

// Base score profiles per tier — median expected scores
// These represent the "average" run at each tier
const TIER_PROFILES: Record<CalibrationTier, {
  objective: [number, number]   // [min, max] range
  process: [number, number]
  strategy: [number, number]
  integrity: number             // fixed adjustment
  pass_rate: number             // probability of passing objective
  flags: string[]
  submission_desc: string
}> = {
  naive: {
    objective: [0, 25],
    process: [5, 20],
    strategy: [5, 15],
    integrity: 0,
    pass_rate: 0.05,
    flags: ['shallow_attempt', 'no_verification'],
    submission_desc: 'Minimal effort. Basic syntax match. No test validation. Fails most hidden invariants.',
  },
  standard: {
    objective: [25, 55],
    process: [30, 55],
    strategy: [25, 50],
    integrity: 0,
    pass_rate: 0.35,
    flags: ['visible_test_overfit', 'weak_recovery'],
    submission_desc: 'Passes visible tests. Misses hidden invariants. Moderate tool use. Weak recovery.',
  },
  strong: {
    objective: [55, 80],
    process: [60, 80],
    strategy: [60, 80],
    integrity: 3,
    pass_rate: 0.70,
    flags: [],
    submission_desc: 'Passes majority of tests including some hidden. Good execution. Occasional false summit.',
  },
  elite: {
    objective: [80, 95],
    process: [80, 95],
    strategy: [82, 96],
    integrity: 7,
    pass_rate: 0.90,
    flags: [],
    submission_desc: 'Passes all visible and most hidden tests. Clean execution, strong recovery, correct invariant handling.',
  },
}

// Difficulty modifiers — harder challenges compress scores toward lower end
function applyDifficultyModifier(
  baseRange: [number, number],
  difficulty_profile: Record<string, number> | null | undefined,
  tier: CalibrationTier
): number {
  const [min, max] = baseRange

  // Calculate composite difficulty (1-10 scale)
  let difficulty = 5
  if (difficulty_profile) {
    const values = Object.values(difficulty_profile).filter(v => typeof v === 'number')
    if (values.length > 0) {
      difficulty = values.reduce((a, b) => a + b, 0) / values.length
    }
  }

  // Harder challenges push scores toward lower end of range
  // Elite agents are less affected, naive agents are more affected
  const tierDifficultyResistance: Record<CalibrationTier, number> = {
    naive: 0.1,    // very susceptible to difficulty
    standard: 0.3,
    strong: 0.6,
    elite: 0.85,   // mostly resistant
  }

  const resistance = tierDifficultyResistance[tier]
  const difficultyPenalty = ((difficulty - 5) / 5) * (1 - resistance) * (max - min) * 0.4

  // Score = midpoint of range, adjusted for difficulty, with small variance
  const midpoint = (min + max) / 2
  const variance = (max - min) * 0.15
  const jitter = (Math.random() - 0.5) * variance
  return Math.max(min, Math.min(max, midpoint - difficultyPenalty + jitter))
}

function computeSeparation(tiers: TierCalibrationResult[]): number {
  const elite = tiers.find(t => t.tier === 'elite')
  const naive = tiers.find(t => t.tier === 'naive')
  if (!elite || !naive) return 0
  return elite.composite_score - naive.composite_score
}

function computeTierSpread(tiers: TierCalibrationResult[]): number {
  const scores = tiers.map(t => t.composite_score)
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length
  return Math.sqrt(variance)
}

function computeClusteringRisk(tiers: TierCalibrationResult[]): SameModelClusteringRisk {
  const sorted = ['naive', 'standard', 'strong', 'elite'].map(t => tiers.find(r => r.tier === t)?.composite_score ?? 0)
  const deltas = [sorted[1] - sorted[0], sorted[2] - sorted[1], sorted[3] - sorted[2]]
  const minDelta = Math.min(...deltas)
  if (minDelta < CALIBRATION_THRESHOLDS.clustering_risk_threshold) return 'high'
  if (minDelta < CALIBRATION_THRESHOLDS.clustering_risk_threshold * 1.5) return 'medium'
  return 'low'
}

function detectBorderlineTriggers(
  tiers: TierCalibrationResult[],
  separation: number,
  spread: number
): BorderlineTrigger[] {
  const triggers: BorderlineTrigger[] = []
  const elite = tiers.find(t => t.tier === 'elite')
  const naive = tiers.find(t => t.tier === 'naive')

  if (spread < CALIBRATION_THRESHOLDS.tier_spread_min) triggers.push('tier_spread_below_threshold')
  if (separation >= CALIBRATION_THRESHOLDS.separation_borderline && separation < CALIBRATION_THRESHOLDS.separation_pass) {
    triggers.push('separation_near_boundary')
  }
  if (elite && elite.composite_score < CALIBRATION_THRESHOLDS.elite_ceiling_min) triggers.push('synthetic_elite_below_ceiling')
  if (naive && naive.composite_score > CALIBRATION_THRESHOLDS.naive_ceiling_max) triggers.push('synthetic_naive_too_high')

  return triggers
}

function getVerdict(
  separation: number,
  spread: number,
  tiers: TierCalibrationResult[]
): {
  verdict: 'pass' | 'borderline' | 'fail'
  recommendation: 'passed' | 'flagged' | 'rejected'
  reason?: string
  borderline_triggers: BorderlineTrigger[]
  same_model_clustering_risk: SameModelClusteringRisk
} {
  const borderline_triggers = detectBorderlineTriggers(tiers, separation, spread)
  const same_model_clustering_risk = computeClusteringRisk(tiers)

  if (
    separation >= CALIBRATION_THRESHOLDS.separation_pass &&
    spread >= CALIBRATION_THRESHOLDS.tier_spread_min &&
    same_model_clustering_risk !== 'high'
  ) {
    return { verdict: 'pass', recommendation: 'passed', borderline_triggers, same_model_clustering_risk }
  }
  if (separation >= CALIBRATION_THRESHOLDS.separation_borderline || borderline_triggers.length > 0) {
    return {
      verdict: 'borderline',
      recommendation: 'flagged',
      reason: `Borderline: ${borderline_triggers.join(', ') || `separation ${separation.toFixed(1)}pts`}. Real LLM calibration recommended.`,
      borderline_triggers,
      same_model_clustering_risk,
    }
  }
  return {
    verdict: 'fail',
    recommendation: 'rejected',
    reason: same_model_clustering_risk === 'high'
      ? `High clustering risk — adjacent tiers scoring too similarly.`
      : spread < CALIBRATION_THRESHOLDS.tier_spread_min
        ? `Score distribution too flat (spread: ${spread.toFixed(1)}). Challenge does not discriminate.`
        : `Insufficient tier separation (${separation.toFixed(1)}pts < ${CALIBRATION_THRESHOLDS.separation_pass}pts required).`,
    borderline_triggers,
    same_model_clustering_risk,
  }
}

export class SyntheticCalibrationRunner implements CalibrationRunner {
  type = 'synthetic' as const

  async run(input: ChallengeCalibrationInput): Promise<CalibrationResult> {
    const tiers: CalibrationTier[] = ['naive', 'standard', 'strong', 'elite']
    const results: TierCalibrationResult[] = []

    for (const tier of tiers) {
      const profile = TIER_PROFILES[tier]

      const objective = Math.round(applyDifficultyModifier(profile.objective, input.difficulty_profile, tier))
      const process = Math.round(applyDifficultyModifier(profile.process, input.difficulty_profile, tier))
      const strategy = Math.round(applyDifficultyModifier(profile.strategy, input.difficulty_profile, tier))
      const integrity = profile.integrity
      const passed = Math.random() < profile.pass_rate

      // Compute composite using standard weights (Sprint as default)
      const weights = input.judge_weights ?? { objective: 0.50, process: 0.20, strategy: 0.20, integrity: 0.10 }
      const composite = Math.round(
        (objective * (weights.objective ?? 0.50)) +
        (process * (weights.process ?? 0.20)) +
        (strategy * (weights.strategy ?? 0.20)) +
        integrity
      )

      const lane_breakdowns: LaneScoringBreakdown[] = [
        { lane: 'objective', raw_score: objective, weight_applied: weights.objective ?? 0.50, weighted_contribution: Math.round(objective * (weights.objective ?? 0.50)), evidence_summary: `Synthetic: passed=${passed}` },
        { lane: 'process',   raw_score: process,   weight_applied: weights.process ?? 0.20,   weighted_contribution: Math.round(process * (weights.process ?? 0.20)) },
        { lane: 'strategy',  raw_score: strategy,  weight_applied: weights.strategy ?? 0.20,  weighted_contribution: Math.round(strategy * (weights.strategy ?? 0.20)) },
        { lane: 'integrity', raw_score: integrity, weight_applied: 1.0,                        weighted_contribution: integrity },
      ]

      results.push({
        tier,
        runner_type: 'synthetic',
        composite_score: Math.min(100, Math.max(0, composite)),
        lane_breakdowns,
        objective_score: objective,
        process_score: process,
        strategy_score: strategy,
        integrity_adjustment: integrity,
        objective_passed: passed,
        submission_summary: profile.submission_desc,
        flags: [...profile.flags],
        judge_resolution: 'primary_only',
        judge_delta: 0,
      })
    }

    const separation = computeSeparation(results)
    const spread = computeTierSpread(results)
    const { verdict, recommendation, reason, borderline_triggers, same_model_clustering_risk } = getVerdict(separation, spread, results)

    return {
      challenge_id: input.challenge_id,
      runner_type: 'synthetic',
      tiers: results,
      separation_score: Math.round(separation * 10) / 10,
      tier_spread: Math.round(spread * 10) / 10,
      discrimination_verdict: verdict,
      recommendation,
      reason,
      same_model_clustering_risk,
      judge_divergence_risk: 'low', // synthetic always low — single deterministic path
      borderline_triggers,
      run_at: new Date().toISOString(),
    }
  }
}
