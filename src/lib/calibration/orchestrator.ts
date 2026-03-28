/**
 * Calibration Orchestrator
 * 
 * Routes challenges to synthetic vs real LLM runners based on policy.
 * Persists results to DB. Updates challenge calibration_status.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { SyntheticCalibrationRunner } from './synthetic-runner'
import { RealLLMCalibrationRunner } from './real-llm-runner'
import type {
  ChallengeCalibrationInput,
  CalibrationResult,
  CalibrationPolicy,
} from './types'
import { CALIBRATION_POLICY, COST_CONTROLS } from './types'
import { createHash } from 'crypto'

const synthetic = new SyntheticCalibrationRunner()
const realLLM = new RealLLMCalibrationRunner()

function getPolicyForChallenge(challenge: ChallengeCalibrationInput): CalibrationPolicy {
  const type = challenge.challenge_type ?? 'standard'
  return CALIBRATION_POLICY[type] ?? 'synthetic_required_real_optional'
}

function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 16)
}

// Item 5: Full cache key — includes prompt, difficulty profile, judge config, model version
function buildCacheKey(input: ChallengeCalibrationInput): string {
  const components = [
    input.challenge_id,
    hashPrompt(input.prompt),
    input.difficulty_profile ? createHash('sha256').update(JSON.stringify(input.difficulty_profile)).digest('hex').slice(0, 8) : 'no-dp',
    input.judge_weights ? createHash('sha256').update(JSON.stringify(input.judge_weights)).digest('hex').slice(0, 8) : 'default-w',
    input.judge_config_version ?? 'v1',
    input.model_version ?? 'default',
    input.format,
  ]
  return components.join(':')
}

async function checkCache(
  challenge_id: string,
  promptHash: string,
  runnerType: string
): Promise<CalibrationResult | null> {
  const supabase = createAdminClient()
  const cutoff = new Date(Date.now() - COST_CONTROLS.cache_ttl_hours * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('challenge_calibration_results')
    .select('*')
    .eq('challenge_id', challenge_id)
    .eq('runner_type', runnerType)
    .gte('run_at', cutoff)
    .order('run_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return null

  // Verify prompt hasn't changed
  const cached = data as Record<string, unknown>
  if ((cached.metadata as Record<string, unknown>)?.prompt_hash === promptHash) {
    return cached as unknown as CalibrationResult
  }
  return null
}

export async function runCalibration(
  challenge: ChallengeCalibrationInput,
  forceRealLLM = false,
  skipCache = false
): Promise<{
  synthetic: CalibrationResult
  real_llm?: CalibrationResult
  final_recommendation: 'passed' | 'flagged' | 'rejected'
  final_reason?: string
  policy: CalibrationPolicy
}> {
  const policy = getPolicyForChallenge(challenge)
  const promptHash = hashPrompt(challenge.prompt)
  const cacheKey = buildCacheKey(challenge)

  // Check cache for synthetic (skip if metadata-only change)
  let syntheticResult: CalibrationResult | null = null
  if (!skipCache) {
    syntheticResult = await checkCache(challenge.challenge_id, promptHash, 'synthetic')
  }
  if (!syntheticResult) {
    syntheticResult = await synthetic.run(challenge)
  }

  let realResult: CalibrationResult | undefined

  const needsRealLLM =
    forceRealLLM ||
    policy === 'synthetic_required_real_required' ||
    (policy === 'synthetic_required_real_optional' && syntheticResult.discrimination_verdict === 'borderline')

  if (needsRealLLM) {
    realResult = await realLLM.run(challenge)
  }

  // Determine final recommendation
  // Real LLM result takes precedence if available
  let final_recommendation: 'passed' | 'flagged' | 'rejected'
  let final_reason: string | undefined

  if (realResult) {
    // Both ran — use the more conservative verdict
    if (realResult.recommendation === 'rejected' || syntheticResult.recommendation === 'rejected') {
      final_recommendation = 'rejected'
      final_reason = realResult.recommendation === 'rejected' ? realResult.reason : syntheticResult.reason
    } else if (realResult.recommendation === 'flagged' || syntheticResult.recommendation === 'flagged') {
      final_recommendation = 'flagged'
      final_reason = realResult.recommendation === 'flagged' ? realResult.reason : syntheticResult.reason
    } else {
      final_recommendation = 'passed'
    }
  } else {
    final_recommendation = syntheticResult.recommendation
    final_reason = syntheticResult.reason
  }

  // Persist to DB with raw artifacts, prompt hash, and full cache key
  await persistCalibrationResults(challenge.challenge_id, syntheticResult, realResult, final_recommendation, final_reason, promptHash, cacheKey)

  return {
    synthetic: syntheticResult,
    real_llm: realResult,
    final_recommendation,
    final_reason,
    policy,
  }
}

async function persistCalibrationResults(
  challenge_id: string,
  syntheticResult: CalibrationResult,
  realResult: CalibrationResult | undefined,
  final_recommendation: string,
  final_reason?: string,
  promptHash?: string,
  cacheKey?: string
) {
  const supabase = createAdminClient()

  const buildMetadata = (result: CalibrationResult) => ({
    prompt_hash: promptHash,
    cache_key: cacheKey,
    same_model_clustering_risk: result.same_model_clustering_risk,
    judge_divergence_risk: result.judge_divergence_risk,
    borderline_triggers: result.borderline_triggers,
    cost_tokens: result.cost_tokens,
    // Raw artifacts: store judge rationale and model info per tier
    tier_artifacts: result.tiers.map(t => ({
      tier: t.tier,
      model_family: t.model_family,
      judge_models_used: t.judge_models_used,
      judge_rationale: t.judge_rationale,
      flags: t.flags,
    })),
  })

  // Store synthetic result with full artifacts
  await supabase.from('challenge_calibration_results').upsert({
    challenge_id,
    runner_type: 'synthetic',
    separation_score: syntheticResult.separation_score,
    tier_spread: syntheticResult.tier_spread,
    discrimination_verdict: syntheticResult.discrimination_verdict,
    recommendation: syntheticResult.recommendation,
    reason: syntheticResult.reason,
    tier_results: syntheticResult.tiers,
    run_at: syntheticResult.run_at,
    metadata: buildMetadata(syntheticResult),
  }, { onConflict: 'challenge_id,runner_type', ignoreDuplicates: false })

  // Store real LLM result with full artifacts
  if (realResult) {
    await supabase.from('challenge_calibration_results').upsert({
      challenge_id,
      runner_type: 'real_llm',
      separation_score: realResult.separation_score,
      tier_spread: realResult.tier_spread,
      discrimination_verdict: realResult.discrimination_verdict,
      recommendation: realResult.recommendation,
      reason: realResult.reason,
      tier_results: realResult.tiers,
      run_at: realResult.run_at,
      metadata: buildMetadata(realResult),
    }, { onConflict: 'challenge_id,runner_type', ignoreDuplicates: false })
  }

  // Map recommendation to calibration_status
  const statusMap: Record<string, string> = {
    passed: 'passed',
    flagged: 'flagged',
    rejected: 'flagged', // rejected goes to flagged for human review, not auto-quarantine
  }
  const newStatus = statusMap[final_recommendation] ?? 'flagged'

  // Update challenge calibration_status + store separation data
  const syntheticTiers = syntheticResult.tiers
  const eliteTier = syntheticTiers.find(t => t.tier === 'elite')
  const naiveTier = syntheticTiers.find(t => t.tier === 'naive')

  await supabase.from('challenges').update({
    calibration_status: newStatus,
    tier_separation: syntheticResult.separation_score,
    ...(realResult ? {
      // Store real LLM separation as the authoritative CDI input when available
      tier_separation: realResult.separation_score,
    } : {}),
  }).eq('id', challenge_id)

  // Log to admin actions
  await supabase.from('challenge_admin_actions').insert({
    challenge_id,
    actor: 'calibration_system',
    action: 'calibration_run',
    reason: final_reason ?? `Calibration complete. Verdict: ${final_recommendation}. Separation: ${syntheticResult.separation_score}pts`,
    new_status: newStatus,
    metadata: {
      synthetic_verdict: syntheticResult.discrimination_verdict,
      real_llm_verdict: realResult?.discrimination_verdict,
      synthetic_separation: syntheticResult.separation_score,
      real_llm_separation: realResult?.separation_score,
      final_recommendation,
    },
  })
}
