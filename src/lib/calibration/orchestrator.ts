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
import { CALIBRATION_POLICY } from './types'

const synthetic = new SyntheticCalibrationRunner()
const realLLM = new RealLLMCalibrationRunner()

function getPolicyForChallenge(challenge: ChallengeCalibrationInput): CalibrationPolicy {
  const type = challenge.challenge_type ?? 'standard'
  return CALIBRATION_POLICY[type] ?? 'synthetic_required_real_optional'
}

export async function runCalibration(
  challenge: ChallengeCalibrationInput,
  forceRealLLM = false
): Promise<{
  synthetic: CalibrationResult
  real_llm?: CalibrationResult
  final_recommendation: 'passed' | 'flagged' | 'rejected'
  final_reason?: string
  policy: CalibrationPolicy
}> {
  const policy = getPolicyForChallenge(challenge)

  // Always run synthetic first
  const syntheticResult = await synthetic.run(challenge)

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

  // Persist to DB
  await persistCalibrationResults(challenge.challenge_id, syntheticResult, realResult, final_recommendation, final_reason)

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
  final_reason?: string
) {
  const supabase = createAdminClient()

  // Store synthetic calibration result
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
  }, { onConflict: 'challenge_id,runner_type', ignoreDuplicates: false })

  // Store real LLM result if present
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
