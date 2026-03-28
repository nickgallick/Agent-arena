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

/**
 * Prompt complexity analysis — reads actual prompt characteristics to estimate difficulty.
 * Replaces the old difficulty_profile-only approach which was prompt-agnostic.
 */
interface PromptSignals {
  complexity: number        // 1-10: estimated task complexity
  ambiguity: number         // 1-10: how underspecified the requirements are
  hidden_invariants: number // 1-10: likely number of unstated constraints
  trivial_score: number     // 0-1: how solvable by a naive agent (high = easy)
}

function analyzePrompt(
  prompt: string,
  difficulty_profile: Record<string, number> | null | undefined,
  format: string,
  has_objective_tests: boolean
): PromptSignals {
  const p = prompt.toLowerCase()
  const wordCount = prompt.split(/\s+/).length

  // Complexity signals from prompt text
  let complexity = 5
  const complexityBoosters = [
    'concurren', 'race condition', 'thread', 'async', 'deadlock',
    'distributed', 'eventual consistency', 'idempotent', 'transaction',
    'rollback', 'invariant', 'constraint', 'edge case', 'security',
    'auth', 'rate limit', 'retry', 'circuit breaker', 'failover',
    'memory leak', 'overflow', 'injection', 'sanitiz',
  ]
  const complexityReducers = [
    'simple', 'basic', 'easy', 'beginner', 'straightforward',
    'just', 'only', 'trivial', 'hello world',
  ]
  complexity += complexityBoosters.filter(k => p.includes(k)).length * 0.8
  complexity -= complexityReducers.filter(k => p.includes(k)).length * 1.5
  // Longer prompts = more requirements = harder
  if (wordCount > 300) complexity += 1.5
  else if (wordCount > 150) complexity += 0.8
  else if (wordCount < 60) complexity -= 1.5
  // Multiple explicit bugs = good discriminator
  const bugCountMatch = p.match(/(\d+)\s*bug/)
  if (bugCountMatch) {
    const bugCount = parseInt(bugCountMatch[1])
    complexity += Math.min(bugCount * 0.6, 3)
  }
  // Use difficulty_profile if provided
  if (difficulty_profile) {
    const vals = Object.values(difficulty_profile).filter(v => typeof v === 'number')
    if (vals.length > 0) {
      const profileDifficulty = vals.reduce((a, b) => a + b, 0) / vals.length
      complexity = (complexity + profileDifficulty) / 2
    }
  }
  complexity = Math.max(1, Math.min(10, complexity))

  // Ambiguity: underspecified prompts are harder for weak agents but elite handles them
  let ambiguity = 4
  if (!has_objective_tests) ambiguity += 2
  if (p.includes('your choice') || p.includes('as you see fit') || p.includes('appropriate')) ambiguity += 1.5
  if (p.includes('must') || p.includes('required') || p.includes('exactly')) ambiguity -= 1.5
  ambiguity = Math.max(1, Math.min(10, ambiguity))

  // Hidden invariants: how many unstated requirements likely exist
  let hidden_invariants = 4
  if (p.includes('production') || p.includes('real world')) hidden_invariants += 2
  if (p.includes('concurrent') || p.includes('parallel')) hidden_invariants += 2
  if (format === 'agentic' || format === 'systems') hidden_invariants += 1.5
  if (p.includes('fix') || p.includes('debug') || p.includes('bug')) hidden_invariants += 1
  hidden_invariants = Math.max(1, Math.min(10, hidden_invariants))

  // Trivial score: how easily a naive agent can score points
  // High = naive agent can copy example output; Low = requires deep understanding
  let trivial_score = 0.5
  if (p.includes('serialize') || p.includes('parse') || p.includes('format')) trivial_score += 0.2
  if (p.includes('sort') || p.includes('filter') || p.includes('map')) trivial_score += 0.15
  if (complexity > 7) trivial_score -= 0.3
  if (hidden_invariants > 7) trivial_score -= 0.25
  if (wordCount < 80) trivial_score += 0.2  // short/vague prompts easier to fake
  trivial_score = Math.max(0.05, Math.min(0.95, trivial_score))

  return { complexity, ambiguity, hidden_invariants, trivial_score }
}

// Difficulty modifiers — uses prompt signals + difficulty_profile
function applyDifficultyModifier(
  baseRange: [number, number],
  difficulty_profile: Record<string, number> | null | undefined,
  tier: CalibrationTier,
  signals: PromptSignals
): number {
  const [min, max] = baseRange
  const midpoint = (min + max) / 2

  // Tier-specific response to difficulty
  const tierResistance: Record<CalibrationTier, number> = {
    naive: 0.1,     // very susceptible — complexity tanks naive scores
    standard: 0.35,
    strong: 0.65,
    elite: 0.88,    // mostly resistant to complexity
  }

  // Naive tier also gets boosted by trivial_score — if task is easy to fake, naive scores higher
  const trivialBoost = tier === 'naive'
    ? signals.trivial_score * (max - min) * 0.4
    : tier === 'standard'
      ? signals.trivial_score * (max - min) * 0.2
      : 0

  // Complexity penalty — normalized to 0-1 range from 1-10 scale
  const normalizedComplexity = (signals.complexity - 1) / 9
  const penalty = normalizedComplexity * (1 - tierResistance[tier]) * (max - min) * 0.5

  // Hidden invariants specifically hurt standard more than naive (naive doesn't attempt them anyway)
  const invariantPenalty = tier === 'standard'
    ? ((signals.hidden_invariants - 1) / 9) * (max - min) * 0.2
    : tier === 'strong'
      ? ((signals.hidden_invariants - 1) / 9) * (max - min) * 0.1
      : 0

  const variance = (max - min) * 0.12
  const jitter = (Math.random() - 0.5) * variance

  return Math.max(min, Math.min(max, midpoint - penalty - invariantPenalty + trivialBoost + jitter))
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

  // Synthetic pass: high separation + fewer than 2 failure triggers = pass
  // Clustering is informational only at this stage — real LLM handles it better
  if (separation >= CALIBRATION_THRESHOLDS.separation_pass && borderline_triggers.length < 2) {
    return { verdict: 'pass', recommendation: 'passed', borderline_triggers, same_model_clustering_risk }
  }
  if (separation >= CALIBRATION_THRESHOLDS.separation_borderline || borderline_triggers.length >= 1) {
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

    // Analyze prompt characteristics — this is what makes synthetic prompt-aware
    const signals = analyzePrompt(
      input.prompt,
      input.difficulty_profile,
      input.format,
      input.has_objective_tests
    )

    for (const tier of tiers) {
      const profile = TIER_PROFILES[tier]

      const objective = Math.round(applyDifficultyModifier(profile.objective, input.difficulty_profile, tier, signals))
      const process = Math.round(applyDifficultyModifier(profile.process, input.difficulty_profile, tier, signals))
      const strategy = Math.round(applyDifficultyModifier(profile.strategy, input.difficulty_profile, tier, signals))
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
      // Store prompt signals for debugging
      cost_tokens: 0,
      cache_key: `synthetic:complexity=${signals.complexity.toFixed(1)}:trivial=${signals.trivial_score.toFixed(2)}`,
      run_at: new Date().toISOString(),
    }
  }
}
