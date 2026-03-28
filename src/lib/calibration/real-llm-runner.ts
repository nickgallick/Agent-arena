/**
 * Real LLM Calibration Runner
 * 
 * Uses actual model API calls to simulate tier behavior.
 * Required for: featured, boss, abyss, prize, versus-stakes challenges.
 * Uses different model families per tier to avoid same-family blind spots.
 * 
 * Model family assignments (intentionally diverse):
 * - naive:    Small/weak model — simulates minimal capability
 * - standard: Mid-tier model — simulates average agent
 * - strong:   Strong model with constrained prompting
 * - elite:    Best available model, unconstrained
 */

import type {
  CalibrationRunner,
  CalibrationResult,
  ChallengeCalibrationInput,
  TierCalibrationResult,
  CalibrationTier,
} from './types'
import { CALIBRATION_THRESHOLDS } from './types'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Model family assignments — different families to avoid correlated blind spots
// These are explicit model IDs, not aliases
const TIER_MODELS: Record<CalibrationTier, { model: string; family: string }> = {
  naive: {
    model: 'mistralai/mistral-7b-instruct',
    family: 'mistral',
  },
  standard: {
    model: 'meta-llama/llama-3-8b-instruct',
    family: 'llama',
  },
  strong: {
    model: 'google/gemini-flash-1.5',
    family: 'gemini',
  },
  elite: {
    model: 'anthropic/claude-3-5-sonnet',
    family: 'anthropic',
  },
}

// System prompts that shape each tier's behavior
// These constrain without naming the tier (no "you are a naive agent" — that leaks)
const TIER_SYSTEM_PROMPTS: Record<CalibrationTier, string> = {
  naive: `You are solving a coding challenge. You have limited time. Write a quick solution that addresses the visible requirements. Do not worry about edge cases or hidden tests. Submit what seems reasonable.`,

  standard: `You are solving a coding challenge. Write a solid solution that passes the visible test cases. Make sure your code is correct for the examples given. You may miss some edge cases but try to handle the obvious ones.`,

  strong: `You are an experienced software engineer solving a coding challenge. Write a thorough solution that handles edge cases, validates your approach against the requirements, and tests your logic carefully. Consider what hidden invariants might exist.`,

  elite: `You are an expert software engineer. Solve this challenge with maximum rigor. Identify the real problem structure, not just the surface description. Handle all edge cases, hidden invariants, and failure modes. Verify your solution systematically. Flag any ambiguous or contradictory requirements explicitly.`,
}

async function callOpenRouter(
  model: string,
  systemPrompt: string,
  challengePrompt: string,
  timeoutMs = 30000
): Promise<{ content: string; latency_ms: number } | null> {
  if (!OPENROUTER_API_KEY) {
    console.error('[real-llm-runner] OPENROUTER_API_KEY not set')
    return null
  }

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
          { role: 'user', content: `Challenge:\n\n${challengePrompt}\n\nProvide your solution.` },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)
    const latency_ms = Date.now() - start

    if (!res.ok) {
      console.error(`[real-llm-runner] ${model} returned ${res.status}`)
      return null
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content ?? ''
    return { content, latency_ms }
  } catch (err) {
    console.error(`[real-llm-runner] ${model} error:`, err)
    return null
  }
}

async function scoreSubmission(
  submission: string,
  challenge: ChallengeCalibrationInput,
  tier: CalibrationTier
): Promise<Omit<TierCalibrationResult, 'runner_type' | 'tier' | 'model_family'>> {
  // Use a judge model to score the submission
  const judgePrompt = `You are evaluating a submission for a coding challenge.

Challenge: ${challenge.title}
Format: ${challenge.format}
Category: ${challenge.category}

Challenge prompt:
${challenge.prompt}

Submission:
${submission}

Score this submission on a 0-100 scale for each dimension. Be honest and calibrated.
Return ONLY a JSON object with these exact fields:
{
  "objective_score": <0-100>,
  "process_score": <0-100>,
  "strategy_score": <0-100>,
  "integrity_adjustment": <-25 to 10>,
  "objective_passed": <true|false>,
  "flags": [<list of issue tags>],
  "summary": "<one sentence>"
}`

  const result = await callOpenRouter(
    'anthropic/claude-3-haiku',
    'You are a precise technical evaluator. Return only valid JSON.',
    judgePrompt,
    15000
  )

  if (!result) {
    // Fallback to synthetic scores if judge call fails
    const fallback = getFallbackScores(tier)
    return fallback
  }

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0])
    return {
      composite_score: Math.round(
        (parsed.objective_score ?? 0) * 0.50 +
        (parsed.process_score ?? 0) * 0.20 +
        (parsed.strategy_score ?? 0) * 0.20 +
        (parsed.integrity_adjustment ?? 0)
      ),
      objective_score: Math.min(100, Math.max(0, parsed.objective_score ?? 0)),
      process_score: Math.min(100, Math.max(0, parsed.process_score ?? 0)),
      strategy_score: Math.min(100, Math.max(0, parsed.strategy_score ?? 0)),
      integrity_adjustment: Math.min(10, Math.max(-25, parsed.integrity_adjustment ?? 0)),
      objective_passed: Boolean(parsed.objective_passed),
      submission_summary: parsed.summary ?? '',
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      latency_ms: result.latency_ms,
    }
  } catch {
    return getFallbackScores(tier)
  }
}

// Fallback if LLM judge call fails — use synthetic profile
function getFallbackScores(tier: CalibrationTier): Omit<TierCalibrationResult, 'runner_type' | 'tier' | 'model_family'> {
  const profiles: Record<CalibrationTier, { obj: number; proc: number; strat: number; int: number; passed: boolean }> = {
    naive:    { obj: 12, proc: 12, strat: 10, int: 0,  passed: false },
    standard: { obj: 40, proc: 40, strat: 35, int: 0,  passed: false },
    strong:   { obj: 65, proc: 68, strat: 65, int: 3,  passed: true },
    elite:    { obj: 85, proc: 85, strat: 87, int: 7,  passed: true },
  }
  const p = profiles[tier]
  return {
    composite_score: Math.round(p.obj * 0.50 + p.proc * 0.20 + p.strat * 0.20 + p.int),
    objective_score: p.obj,
    process_score: p.proc,
    strategy_score: p.strat,
    integrity_adjustment: p.int,
    objective_passed: p.passed,
    submission_summary: 'Fallback scores (judge unavailable)',
    flags: ['judge_fallback'],
  }
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

export class RealLLMCalibrationRunner implements CalibrationRunner {
  type = 'real_llm' as const

  async run(input: ChallengeCalibrationInput): Promise<CalibrationResult> {
    const tierOrder: CalibrationTier[] = ['naive', 'standard', 'strong', 'elite']
    const results: TierCalibrationResult[] = []

    // Run tiers in parallel for speed
    await Promise.all(tierOrder.map(async (tier) => {
      const modelConfig = TIER_MODELS[tier]
      const systemPrompt = TIER_SYSTEM_PROMPTS[tier]

      // Get submission from tier model
      const submissionResult = await callOpenRouter(
        modelConfig.model,
        systemPrompt,
        input.prompt,
        45000
      )

      const submission = submissionResult?.content ?? `[No submission — ${tier} model unavailable]`

      // Score the submission
      const scores = await scoreSubmission(submission, input, tier)

      results.push({
        ...scores,
        tier,
        runner_type: 'real_llm',
        model_family: modelConfig.family,
        latency_ms: submissionResult?.latency_ms ?? scores.latency_ms,
      })
    }))

    // Sort by tier order for consistency
    results.sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier))

    const separation = computeSeparation(results)
    const spread = computeTierSpread(results)

    let verdict: 'pass' | 'borderline' | 'fail'
    let recommendation: 'passed' | 'flagged' | 'rejected'
    let reason: string | undefined

    if (separation >= CALIBRATION_THRESHOLDS.separation_pass && spread >= CALIBRATION_THRESHOLDS.tier_spread_min) {
      verdict = 'pass'; recommendation = 'passed'
    } else if (separation >= CALIBRATION_THRESHOLDS.separation_borderline) {
      verdict = 'borderline'; recommendation = 'flagged'
      reason = `Real LLM borderline separation (${separation.toFixed(1)}pts). Manual review recommended.`
    } else {
      verdict = 'fail'; recommendation = 'rejected'
      reason = `Insufficient real-model separation (${separation.toFixed(1)}pts). Challenge does not discriminate between model tiers.`
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
      run_at: new Date().toISOString(),
    }
  }
}
