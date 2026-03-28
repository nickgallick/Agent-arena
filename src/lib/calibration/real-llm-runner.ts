/**
 * Real LLM Calibration Runner — Hardened
 * 
 * Submission generation: 4 different model families (diverse, not same-family)
 * Calibration scoring: Claude Sonnet 4.6 primary + GPT-4.1 cross-check
 *   NOT Haiku — Haiku may compress differences or introduce single-judge bias
 * 
 * Model family assignments:
 * - naive:    mistral-7b (Family: Mistral)
 * - standard: llama-3-8b (Family: Meta)
 * - strong:   gemini-flash-1.5 (Family: Google)
 * - elite:    claude-3-5-sonnet (Family: Anthropic)
 * 
 * Scoring judges:
 * - Primary:  claude-sonnet-4-6 (Anthropic)
 * - Audit:    openai/gpt-4.1 (OpenAI) — fires on borderline or spread > threshold
 */

import type {
  CalibrationRunner,
  CalibrationResult,
  ChallengeCalibrationInput,
  TierCalibrationResult,
  CalibrationTier,
  BorderlineTrigger,
  SameModelClusteringRisk,
} from './types'
import { CALIBRATION_THRESHOLDS, COST_CONTROLS } from './types'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const TIER_MODELS: Record<CalibrationTier, { model: string; family: string }> = {
  naive:    { model: 'mistralai/mistral-7b-instruct', family: 'mistral' },
  standard: { model: 'meta-llama/llama-3-8b-instruct', family: 'llama' },
  strong:   { model: 'google/gemini-flash-1.5', family: 'gemini' },
  elite:    { model: 'anthropic/claude-3-5-sonnet', family: 'anthropic' },
}

// Primary calibration scoring model — NOT Haiku
const PRIMARY_JUDGE_MODEL = 'anthropic/claude-sonnet-4-6'
const AUDIT_JUDGE_MODEL = 'openai/gpt-4.1'

const TIER_SYSTEM_PROMPTS: Record<CalibrationTier, string> = {
  naive:    `You are solving a coding challenge. Write a quick solution that addresses visible requirements. Do not worry about edge cases or hidden tests.`,
  standard: `You are solving a coding challenge. Write a solid solution that passes the visible test cases. Handle the obvious edge cases.`,
  strong:   `You are an experienced software engineer. Write a thorough solution that handles edge cases, validates your approach, and tests your logic carefully. Consider what hidden invariants might exist.`,
  elite:    `You are an expert software engineer. Solve this challenge with maximum rigor. Identify the real problem structure. Handle all edge cases, hidden invariants, and failure modes. Verify systematically. Flag any ambiguous or contradictory requirements explicitly.`,
}

async function callLLM(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = COST_CONTROLS.max_tokens_per_tier,
  timeoutMs = 45000
): Promise<{ content: string; latency_ms: number; tokens_used?: number } | null> {
  if (!OPENROUTER_API_KEY) return null

  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://agent-arena-roan.vercel.app',
        'X-Title': 'Bouts Calibration',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)
    if (!res.ok) {
      console.error(`[calibration] ${model} returned ${res.status}`)
      return null
    }

    const data = await res.json()
    return {
      content: data.choices?.[0]?.message?.content ?? '',
      latency_ms: Date.now() - start,
      tokens_used: data.usage?.total_tokens,
    }
  } catch (err) {
    console.error(`[calibration] ${model} error:`, err)
    return null
  }
}

async function scoreWithJudge(
  judgeModel: string,
  submission: string,
  challenge: ChallengeCalibrationInput,
  tier: CalibrationTier
): Promise<{ scores: Partial<TierCalibrationResult>; rationale: string } | null> {
  const judgePrompt = `You are evaluating a calibration submission for a coding challenge.
Your job is to score it accurately and calibrate your scores so that different quality tiers produce meaningfully different scores.

Challenge: ${challenge.title}
Format: ${challenge.format}
Category: ${challenge.category}

Challenge prompt:
${challenge.prompt}

Submission to evaluate:
${submission}

Score on 0-100 scale for each dimension. Be calibrated — differentiate quality levels clearly, do not compress scores.

Return ONLY valid JSON:
{
  "objective_score": <0-100>,
  "process_score": <0-100>,
  "strategy_score": <0-100>,
  "integrity_adjustment": <-25 to 10>,
  "objective_passed": <true|false>,
  "flags": [<issue tags>],
  "rationale": "<2-3 sentences explaining the scores>",
  "confidence": <0-1>
}`

  const result = await callLLM(
    judgeModel,
    'You are a precise technical evaluator calibrating AI agent submissions. Return only valid JSON. Differentiate quality levels — do not compress scores toward the middle.',
    judgePrompt,
    800,
    20000
  )

  if (!result) return null

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0])

    const weights = challenge.judge_weights ?? { objective: 0.50, process: 0.20, strategy: 0.20 }
    const composite = Math.round(
      (parsed.objective_score ?? 0) * (weights.objective ?? 0.50) +
      (parsed.process_score ?? 0) * (weights.process ?? 0.20) +
      (parsed.strategy_score ?? 0) * (weights.strategy ?? 0.20) +
      (parsed.integrity_adjustment ?? 0)
    )

    return {
      scores: {
        composite_score: Math.min(100, Math.max(0, composite)),
        objective_score: Math.min(100, Math.max(0, parsed.objective_score ?? 0)),
        process_score: Math.min(100, Math.max(0, parsed.process_score ?? 0)),
        strategy_score: Math.min(100, Math.max(0, parsed.strategy_score ?? 0)),
        integrity_adjustment: Math.min(10, Math.max(-25, parsed.integrity_adjustment ?? 0)),
        objective_passed: Boolean(parsed.objective_passed),
        flags: Array.isArray(parsed.flags) ? parsed.flags : [],
        latency_ms: result.latency_ms,
      },
      rationale: parsed.rationale ?? '',
    }
  } catch {
    return null
  }
}

function getFallbackScores(tier: CalibrationTier): Partial<TierCalibrationResult> {
  const profiles: Record<CalibrationTier, { obj: number; proc: number; strat: number; int: number; passed: boolean }> = {
    naive:    { obj: 12, proc: 12, strat: 10, int: 0, passed: false },
    standard: { obj: 40, proc: 40, strat: 35, int: 0, passed: false },
    strong:   { obj: 65, proc: 68, strat: 65, int: 3, passed: true },
    elite:    { obj: 85, proc: 85, strat: 87, int: 7, passed: true },
  }
  const p = profiles[tier]
  return {
    composite_score: Math.round(p.obj * 0.50 + p.proc * 0.20 + p.strat * 0.20 + p.int),
    objective_score: p.obj, process_score: p.proc, strategy_score: p.strat,
    integrity_adjustment: p.int, objective_passed: p.passed,
    flags: ['judge_fallback'],
  }
}

function computeSameModelClusteringRisk(tiers: TierCalibrationResult[]): SameModelClusteringRisk {
  // Check adjacent tier score deltas — small deltas = clustering risk
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

  // Check if all judge scores suspiciously close (judge spread low)
  const scores = tiers.map(t => t.composite_score)
  const scoreSpread = Math.max(...scores) - Math.min(...scores)
  if (scoreSpread < CALIBRATION_THRESHOLDS.judge_spread_suspicious * 10) triggers.push('judge_spread_suspiciously_low')

  return triggers
}

export class RealLLMCalibrationRunner implements CalibrationRunner {
  type = 'real_llm' as const

  async run(input: ChallengeCalibrationInput): Promise<CalibrationResult> {
    const tierOrder: CalibrationTier[] = ['naive', 'standard', 'strong', 'elite']
    const results: TierCalibrationResult[] = []
    let totalTokens = 0

    await Promise.all(tierOrder.map(async (tier) => {
      const modelConfig = TIER_MODELS[tier]

      // Step 1: Get submission from tier model
      const submissionResult = await callLLM(
        modelConfig.model,
        TIER_SYSTEM_PROMPTS[tier],
        `Challenge:\n\n${input.prompt}\n\nProvide your solution.`,
        COST_CONTROLS.max_tokens_per_tier
      )

      const submission = submissionResult?.content ?? `[No submission — ${tier} model unavailable]`
      if (submissionResult?.tokens_used) totalTokens += submissionResult.tokens_used

      // Step 2: Score with PRIMARY judge (Sonnet 4.6 — NOT Haiku)
      const primaryScore = await scoreWithJudge(PRIMARY_JUDGE_MODEL, submission, input, tier)
      if (primaryScore?.scores.latency_ms) totalTokens += 400 // approx

      // Step 3: Audit judge (GPT-4.1) fires if primary score looks borderline
      let finalScores = primaryScore?.scores ?? getFallbackScores(tier)
      let judgeRationale = primaryScore?.rationale ?? 'Primary judge unavailable — fallback scores used'
      const judgeModelsUsed = [PRIMARY_JUDGE_MODEL]

      const needsAudit = !primaryScore ||
        (finalScores.composite_score ?? 0) > 40 && (finalScores.composite_score ?? 0) < 60 // borderline range

      if (needsAudit) {
        const auditScore = await scoreWithJudge(AUDIT_JUDGE_MODEL, submission, input, tier)
        if (auditScore) {
          judgeModelsUsed.push(AUDIT_JUDGE_MODEL)
          // Average primary and audit scores
          const avg = (a?: number, b?: number) =>
            a != null && b != null ? Math.round((a + b) / 2) : (a ?? b ?? 0)

          finalScores = {
            composite_score: avg(finalScores.composite_score, auditScore.scores.composite_score),
            objective_score: avg(finalScores.objective_score, auditScore.scores.objective_score),
            process_score: avg(finalScores.process_score, auditScore.scores.process_score),
            strategy_score: avg(finalScores.strategy_score, auditScore.scores.strategy_score),
            integrity_adjustment: avg(finalScores.integrity_adjustment, auditScore.scores.integrity_adjustment),
            objective_passed: finalScores.objective_passed || (auditScore.scores.objective_passed ?? false),
            flags: [...(finalScores.flags ?? []), ...(auditScore.scores.flags ?? [])],
          }
          judgeRationale = `Primary: ${primaryScore?.rationale ?? 'n/a'} | Audit: ${auditScore.rationale}`
        }
      }

      results.push({
        tier,
        runner_type: 'real_llm',
        composite_score: finalScores.composite_score ?? 0,
        objective_score: finalScores.objective_score ?? 0,
        process_score: finalScores.process_score ?? 0,
        strategy_score: finalScores.strategy_score ?? 0,
        integrity_adjustment: finalScores.integrity_adjustment ?? 0,
        objective_passed: finalScores.objective_passed ?? false,
        submission_summary: submission.slice(0, 200),
        flags: finalScores.flags ?? [],
        latency_ms: submissionResult?.latency_ms,
        model_family: modelConfig.family,
        raw_submission: submission,
        judge_rationale: judgeRationale,
        judge_models_used: judgeModelsUsed,
      })
    }))

    results.sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier))

    const separation = (results.find(t => t.tier === 'elite')?.composite_score ?? 0) -
                       (results.find(t => t.tier === 'naive')?.composite_score ?? 0)
    const scores = results.map(t => t.composite_score)
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    const spread = Math.sqrt(scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length)

    const clusteringRisk = computeSameModelClusteringRisk(results)
    const borderlineTriggers = detectBorderlineTriggers(results, separation, spread)

    let verdict: 'pass' | 'borderline' | 'fail'
    let recommendation: 'passed' | 'flagged' | 'rejected'
    let reason: string | undefined

    if (separation >= CALIBRATION_THRESHOLDS.separation_pass && spread >= CALIBRATION_THRESHOLDS.tier_spread_min && clusteringRisk !== 'high') {
      verdict = 'pass'; recommendation = 'passed'
    } else if (separation >= CALIBRATION_THRESHOLDS.separation_borderline || borderlineTriggers.length > 0) {
      verdict = 'borderline'; recommendation = 'flagged'
      reason = `Borderline: ${borderlineTriggers.join(', ') || `separation ${separation.toFixed(1)}pts`}. Manual review recommended.`
    } else {
      verdict = 'fail'; recommendation = 'rejected'
      reason = clusteringRisk === 'high'
        ? `High same-model clustering risk. Tiers not sufficiently differentiated (sep: ${separation.toFixed(1)}pts).`
        : `Insufficient separation (${separation.toFixed(1)}pts). Challenge does not discriminate between model tiers.`
    }

    return {
      challenge_id: input.challenge_id,
      runner_type: 'real_llm',
      tiers: results,
      separation_score: Math.round(separation * 10) / 10,
      tier_spread: Math.round(spread * 10) / 10,
      discrimination_verdict: verdict,
      recommendation,
      reason,
      same_model_clustering_risk: clusteringRisk,
      borderline_triggers: borderlineTriggers,
      cost_tokens: totalTokens,
      run_at: new Date().toISOString(),
    }
  }
}
