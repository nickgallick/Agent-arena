/**
 * Real LLM Calibration Runner — Hardened v2
 *
 * Item 1: Don't silently average when judge delta is large — escalate instead
 * Item 2: judge_divergence_risk as first-class signal
 * Item 4: Persist raw per-lane scoring breakdowns
 *
 * Scoring: Sonnet 4.6 primary + GPT-4.1 audit (NOT Haiku)
 * Submissions: 4 different model families (diverse)
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
  JudgeDivergenceRisk,
} from './types'
import { CALIBRATION_THRESHOLDS, COST_CONTROLS } from './types'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const TIER_MODELS: Record<CalibrationTier, { model: string; family: string }> = {
  naive:    { model: 'meta-llama/llama-3.1-8b-instruct', family: 'llama' },    // small/cheap — represents weak agents
  standard: { model: 'mistralai/mistral-small-3.1-24b-instruct', family: 'mistral' }, // mid-tier
  strong:   { model: 'google/gemini-2.0-flash-001', family: 'gemini' },        // strong but not frontier
  elite:    { model: 'anthropic/claude-sonnet-4-6', family: 'anthropic' },     // frontier — represents best agents
}

const PRIMARY_JUDGE_MODEL = 'anthropic/claude-sonnet-4-6'
const AUDIT_JUDGE_MODEL = 'openai/gpt-4.1'

// Tier-specific temperatures — lower tiers get higher temp to increase variance/errors
const TIER_TEMPERATURES: Record<CalibrationTier, number> = {
  naive: 1.2,     // high variance — inconsistent, error-prone output
  standard: 0.8,  // moderate variance
  strong: 0.4,    // mostly consistent
  elite: 0.2,     // precise and deterministic
}

// Tier-specific max_tokens — hard ceiling forces incomplete solutions at lower tiers
const TIER_MAX_TOKENS: Record<CalibrationTier, number> = {
  naive: 200,     // forces incomplete solutions — can't solve complex problems in 200 tokens
  standard: 450,  // limited — will miss edge cases just from space constraints
  strong: 900,    // enough for thorough solution
  elite: 1800,    // full budget
}

const TIER_SYSTEM_PROMPTS: Record<CalibrationTier, string> = {
  naive: `You are a beginner coder. Output ONLY raw code. No explanations, no comments, no markdown.

HARD RULES — violating these fails the task:
- Solve only the first/simplest interpretation of the problem
- Use the most basic data structures (arrays, simple loops only)
- NO error handling of any kind
- NO edge case handling — only the happy path in the example
- NO recursion — use simple iteration only
- Stop as soon as you have something that looks roughly correct
- Output must be under 15 lines`,

  standard: `You are a developer who writes working but incomplete solutions. Output ONLY raw code. No explanations.

HARD RULES:
- Solve the obvious requirements only — skip anything that requires deep reading
- Basic try/catch is fine but no specific error types
- Ignore concurrency, thread safety, and race conditions entirely
- Ignore performance — use O(n²) if it's simpler
- Do NOT handle null/undefined inputs — assume happy path
- Output must be under 30 lines`,

  strong: `You are a senior engineer. Output working, well-structured code with proper error handling.

APPROACH:
- Handle all visible requirements including edge cases in the problem statement
- Add proper error handling and input validation
- Consider basic concurrency if the problem mentions it
- Write clean, readable code
- You may miss the most subtle hidden invariants that require deep domain knowledge`,

  elite: `You are a principal engineer. Output production-grade code that handles everything.

APPROACH:
- Read the full problem carefully — identify ALL requirements including implicit ones
- Handle every edge case: nulls, empty inputs, concurrency, resource cleanup, error propagation
- Consider performance, memory efficiency, and security implications
- Make your solution robust against adversarial inputs
- Add brief inline comments only for non-obvious logic`,
}

interface RawJudgeScores {
  objective_score: number
  process_score: number
  strategy_score: number
  integrity_adjustment: number
  objective_passed: boolean
  flags: string[]
  rationale: string
  confidence: number
  composite_score: number
}

async function callLLM(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = COST_CONTROLS.max_tokens_per_tier,
  timeoutMs = 45000,
  temperature = 0.3
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
        temperature,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    const data = await res.json()
    return { content: data.choices?.[0]?.message?.content ?? '', latency_ms: Date.now() - start, tokens_used: data.usage?.total_tokens }
  } catch {
    return null
  }
}

async function scoreWithJudge(
  judgeModel: string,
  submission: string,
  challenge: ChallengeCalibrationInput,
): Promise<RawJudgeScores | null> {
  const weights = challenge.judge_weights ?? { objective: 0.50, process: 0.20, strategy: 0.20 }

  const judgePrompt = `You are calibrating AI agent submissions. Score accurately — differentiate quality levels clearly.

Challenge: ${challenge.title} (${challenge.format}, ${challenge.category})
Prompt: ${challenge.prompt}

Submission:
${submission}

Return ONLY valid JSON with per-lane scores and evidence:
{
  "objective_score": <0-100>,
  "process_score": <0-100>,
  "strategy_score": <0-100>,
  "integrity_adjustment": <-25 to 10>,
  "objective_passed": <true|false>,
  "flags": [<issue tags>],
  "rationale": "<2-3 sentences>",
  "confidence": <0-1>,
  "objective_evidence": "<what specifically passed/failed>",
  "process_evidence": "<how the agent worked>",
  "strategy_evidence": "<quality of reasoning>"
}`

  const result = await callLLM(
    judgeModel,
    'You are a precise technical calibration judge. Return only valid JSON. Do not compress scores toward the middle.',
    judgePrompt,
    900,
    15000  // 15s per judge call
  )
  if (!result) return null

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const p = JSON.parse(jsonMatch[0])
    const composite = Math.round(
      (p.objective_score ?? 0) * (weights.objective ?? 0.50) +
      (p.process_score ?? 0) * (weights.process ?? 0.20) +
      (p.strategy_score ?? 0) * (weights.strategy ?? 0.20) +
      (p.integrity_adjustment ?? 0)
    )
    return {
      objective_score: Math.min(100, Math.max(0, p.objective_score ?? 0)),
      process_score: Math.min(100, Math.max(0, p.process_score ?? 0)),
      strategy_score: Math.min(100, Math.max(0, p.strategy_score ?? 0)),
      integrity_adjustment: Math.min(10, Math.max(-25, p.integrity_adjustment ?? 0)),
      objective_passed: Boolean(p.objective_passed),
      flags: Array.isArray(p.flags) ? p.flags : [],
      rationale: p.rationale ?? '',
      confidence: p.confidence ?? 0.7,
      composite_score: Math.min(100, Math.max(0, composite)),
    }
  } catch { return null }
}

function buildLaneBreakdowns(scores: RawJudgeScores, weights: Record<string, number>): LaneScoringBreakdown[] {
  return [
    {
      lane: 'objective',
      raw_score: scores.objective_score,
      weight_applied: weights.objective ?? 0.50,
      weighted_contribution: Math.round(scores.objective_score * (weights.objective ?? 0.50)),
      evidence_summary: `Passed: ${scores.objective_passed}`,
      flags: scores.flags.filter(f => f.includes('test') || f.includes('objective')),
    },
    {
      lane: 'process',
      raw_score: scores.process_score,
      weight_applied: weights.process ?? 0.20,
      weighted_contribution: Math.round(scores.process_score * (weights.process ?? 0.20)),
      flags: scores.flags.filter(f => f.includes('tool') || f.includes('process')),
    },
    {
      lane: 'strategy',
      raw_score: scores.strategy_score,
      weight_applied: weights.strategy ?? 0.20,
      weighted_contribution: Math.round(scores.strategy_score * (weights.strategy ?? 0.20)),
      flags: scores.flags.filter(f => f.includes('strategy') || f.includes('decomp')),
    },
    {
      lane: 'integrity',
      raw_score: scores.integrity_adjustment,
      weight_applied: 1.0,
      weighted_contribution: scores.integrity_adjustment,
      flags: scores.flags.filter(f => f.includes('integrity') || f.includes('exploit')),
    },
  ]
}

function getFallbackScores(tier: CalibrationTier): RawJudgeScores {
  const p: Record<CalibrationTier, RawJudgeScores> = {
    naive:    { objective_score: 12, process_score: 12, strategy_score: 10, integrity_adjustment: 0, objective_passed: false, flags: ['judge_fallback'], rationale: 'Fallback', confidence: 0.5, composite_score: 10 },
    standard: { objective_score: 40, process_score: 40, strategy_score: 35, integrity_adjustment: 0, objective_passed: false, flags: ['judge_fallback'], rationale: 'Fallback', confidence: 0.5, composite_score: 36 },
    strong:   { objective_score: 65, process_score: 68, strategy_score: 65, integrity_adjustment: 3, objective_passed: true,  flags: ['judge_fallback'], rationale: 'Fallback', confidence: 0.5, composite_score: 59 },
    elite:    { objective_score: 85, process_score: 85, strategy_score: 87, integrity_adjustment: 7, objective_passed: true,  flags: ['judge_fallback'], rationale: 'Fallback', confidence: 0.5, composite_score: 80 },
  }
  return p[tier]
}

// Item 1: Resolve primary vs audit — escalate if delta too large, don't silently blend
function resolveJudgeScores(
  primary: RawJudgeScores,
  audit: RawJudgeScores | null,
  tier: CalibrationTier
): {
  resolved: RawJudgeScores
  resolution: 'averaged' | 'escalated' | 'primary_only' | 'fallback'
  judge_delta: number
  divergence_risk: JudgeDivergenceRisk
} {
  if (!audit) {
    return { resolved: primary, resolution: 'primary_only', judge_delta: 0, divergence_risk: 'low' }
  }

  const delta = Math.abs(primary.composite_score - audit.composite_score)

  let divergence_risk: JudgeDivergenceRisk
  if (delta >= CALIBRATION_THRESHOLDS.judge_delta_escalate) {
    divergence_risk = 'escalated'
  } else if (delta >= CALIBRATION_THRESHOLDS.judge_divergence_high) {
    divergence_risk = 'high'
  } else if (delta >= CALIBRATION_THRESHOLDS.judge_divergence_medium) {
    divergence_risk = 'medium'
  } else {
    divergence_risk = 'low'
  }

  // Item 1: If delta > threshold, escalate — don't blend
  if (delta > CALIBRATION_THRESHOLDS.judge_delta_blend_max) {
    // Escalated: return lower of the two (conservative) + flag for human review
    const conservative = primary.composite_score <= audit.composite_score ? primary : audit
    return {
      resolved: {
        ...conservative,
        flags: [...conservative.flags, 'judge_divergence_escalated', `primary_${primary.composite_score}_audit_${audit.composite_score}`],
        rationale: `ESCALATED (delta ${delta}pt): Primary=${primary.composite_score}, Audit=${audit.composite_score}. Using conservative. Manual review required.`,
      },
      resolution: 'escalated',
      judge_delta: delta,
      divergence_risk,
    }
  }

  // Safe to blend
  const avg = (a: number, b: number) => Math.round((a + b) / 2)
  return {
    resolved: {
      objective_score: avg(primary.objective_score, audit.objective_score),
      process_score: avg(primary.process_score, audit.process_score),
      strategy_score: avg(primary.strategy_score, audit.strategy_score),
      integrity_adjustment: avg(primary.integrity_adjustment, audit.integrity_adjustment),
      objective_passed: primary.objective_passed || audit.objective_passed,
      flags: [...new Set([...primary.flags, ...audit.flags])],
      rationale: `Averaged (delta ${delta}pt): Primary=${primary.composite_score}, Audit=${audit.composite_score}`,
      confidence: (primary.confidence + audit.confidence) / 2,
      composite_score: avg(primary.composite_score, audit.composite_score),
    },
    resolution: 'averaged',
    judge_delta: delta,
    divergence_risk,
  }
}

function computeClusteringRisk(tiers: TierCalibrationResult[]): SameModelClusteringRisk {
  const sorted = ['naive', 'standard', 'strong', 'elite'].map(t => tiers.find(r => r.tier === t)?.composite_score ?? 0)
  const deltas = [sorted[1] - sorted[0], sorted[2] - sorted[1], sorted[3] - sorted[2]]
  const minDelta = Math.min(...deltas)
  if (minDelta < CALIBRATION_THRESHOLDS.clustering_risk_threshold) return 'high'
  if (minDelta < CALIBRATION_THRESHOLDS.clustering_risk_threshold * 1.5) return 'medium'
  return 'low'
}

// Item 2: compute overall judge divergence risk across all tiers
function computeOverallDivergenceRisk(tierResults: TierCalibrationResult[]): JudgeDivergenceRisk {
  const risks = tierResults.map(t => t.judge_resolution)
  if (risks.includes('escalated')) return 'escalated'
  const deltas = tierResults.map(t => t.judge_delta ?? 0)
  const maxDelta = Math.max(...deltas)
  if (maxDelta >= CALIBRATION_THRESHOLDS.judge_divergence_high) return 'high'
  if (maxDelta >= CALIBRATION_THRESHOLDS.judge_divergence_medium) return 'medium'
  return 'low'
}

function detectBorderlineTriggers(
  tiers: TierCalibrationResult[],
  separation: number,
  spread: number,
  divergenceRisk: JudgeDivergenceRisk
): BorderlineTrigger[] {
  const triggers: BorderlineTrigger[] = []
  const elite = tiers.find(t => t.tier === 'elite')
  const naive = tiers.find(t => t.tier === 'naive')

  if (spread < CALIBRATION_THRESHOLDS.tier_spread_min) triggers.push('tier_spread_below_threshold')
  if (separation >= CALIBRATION_THRESHOLDS.separation_borderline && separation < CALIBRATION_THRESHOLDS.separation_pass) triggers.push('separation_near_boundary')
  if (elite && elite.composite_score < CALIBRATION_THRESHOLDS.elite_ceiling_min) triggers.push('synthetic_elite_below_ceiling')
  if (naive && naive.composite_score > CALIBRATION_THRESHOLDS.naive_ceiling_max) triggers.push('synthetic_naive_too_high')
  if (divergenceRisk === 'high') triggers.push('judge_divergence_high')
  if (divergenceRisk === 'escalated') triggers.push('judge_divergence_escalated')

  return triggers
}

export class RealLLMCalibrationRunner implements CalibrationRunner {
  type = 'real_llm' as const

  async run(input: ChallengeCalibrationInput): Promise<CalibrationResult> {
    const tierOrder: CalibrationTier[] = ['naive', 'standard', 'strong', 'elite']
    const results: TierCalibrationResult[] = []
    let totalTokens = 0
    const weights = input.judge_weights ?? { objective: 0.50, process: 0.20, strategy: 0.20 }

    await Promise.all(tierOrder.map(async (tier) => {
      const modelConfig = TIER_MODELS[tier]

      // Step 1: Get submission — use tier-specific token limits and temperature
      const tierMaxTokens = TIER_MAX_TOKENS[tier]
      const tierTemp = TIER_TEMPERATURES[tier]
      const submissionResult = await callLLM(
        modelConfig.model,
        TIER_SYSTEM_PROMPTS[tier],
        `Challenge:\n\n${input.prompt}\n\nProvide your solution.`,
        tierMaxTokens,
        25000,  // 25s per submission — 4 run in parallel, leaves budget for judges
        tierTemp
      )
      if (submissionResult?.tokens_used) totalTokens += submissionResult.tokens_used

      // If tier model failed to produce a submission, score as 0 — don't use fallback
      // This gives an accurate signal: the challenge separator between tiers still works
      // as long as at least naive and elite responded
      // Naive/standard have lower token limits so shorter minimum threshold
      const minLength = tier === 'naive' ? 20 : tier === 'standard' ? 30 : 50
      const submissionFailed = !submissionResult?.content || submissionResult.content.trim().length < minLength
      const submission = submissionResult?.content ?? ''

      if (submissionFailed) {
        results.push({
          tier,
          runner_type: 'real_llm',
          composite_score: 0,
          lane_breakdowns: [],
          objective_score: 0,
          process_score: 0,
          strategy_score: 0,
          integrity_adjustment: 0,
          objective_passed: false,
          submission_summary: `[No submission — ${tier} model unavailable]`,
          flags: ['no_submission', `${tier}_unavailable`],
          latency_ms: submissionResult?.latency_ms,
          model_family: modelConfig.family,
          raw_submission: '',
          judge_rationale: `Tier model ${modelConfig.model} returned no submission`,
          judge_models_used: [],
          primary_composite: 0,
          judge_delta: 0,
          judge_resolution: 'primary_only',
        })
        return
      }

      // Step 2: Primary judge (Sonnet 4.6)
      const primaryScores = await scoreWithJudge(PRIMARY_JUDGE_MODEL, submission, input)

      // Step 3: Audit judge (GPT-4.1) — fires on borderline primary or failover
      const primary = primaryScores ?? getFallbackScores(tier)
      const needsAudit = !primaryScores ||
        (primary.composite_score > 35 && primary.composite_score < 65)  // borderline range

      let auditScores: RawJudgeScores | null = null
      if (needsAudit) {
        auditScores = await scoreWithJudge(AUDIT_JUDGE_MODEL, submission, input)
      }

      // Step 4: Item 1 — resolve (escalate if delta too large, blend if safe)
      const { resolved, resolution, judge_delta, divergence_risk } = resolveJudgeScores(primary, auditScores, tier)

      // Item 4: Build per-lane breakdowns
      const lane_breakdowns = buildLaneBreakdowns(resolved, weights)

      results.push({
        tier,
        runner_type: 'real_llm',
        composite_score: resolved.composite_score,
        lane_breakdowns,
        objective_score: resolved.objective_score,
        process_score: resolved.process_score,
        strategy_score: resolved.strategy_score,
        integrity_adjustment: resolved.integrity_adjustment,
        objective_passed: resolved.objective_passed,
        submission_summary: submission.slice(0, 200),
        flags: resolved.flags,
        latency_ms: submissionResult?.latency_ms,
        model_family: modelConfig.family,
        raw_submission: submission,
        judge_rationale: resolved.rationale,
        judge_models_used: auditScores ? [PRIMARY_JUDGE_MODEL, AUDIT_JUDGE_MODEL] : [PRIMARY_JUDGE_MODEL],
        primary_composite: primary.composite_score,
        audit_composite: auditScores?.composite_score,
        judge_delta,
        judge_resolution: resolution,
      })
    }))

    results.sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier))

    // Compute separation using tiers that actually produced submissions
    // If naive/strong unavailable, use the lowest-scoring available tier vs elite
    const respondedResults = results.filter(r => !r.flags?.includes('no_submission'))
    const eliteScore = results.find(t => t.tier === 'elite')?.composite_score ?? 0
    const lowestRespondedScore = respondedResults.length > 0
      ? Math.min(...respondedResults.map(r => r.composite_score))
      : 0
    const separation = eliteScore - lowestRespondedScore
    const scores = results.map(t => t.composite_score)
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    const spread = Math.sqrt(scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length)

    const clusteringRisk = computeClusteringRisk(results)
    const divergenceRisk = computeOverallDivergenceRisk(results)  // item 2
    const borderlineTriggers = detectBorderlineTriggers(results, separation, spread, divergenceRisk)

    let verdict: 'pass' | 'borderline' | 'fail'
    let recommendation: 'passed' | 'flagged' | 'rejected'
    let reason: string | undefined

    // PASS: separation >= threshold AND fewer than 2 corroborating failure signals
    // Clustering is informational only — high sep overrides clustering concern
    // Escalated divergence is a trigger (adds to count) but doesn't auto-veto a high-sep pass
    const highSep = separation >= CALIBRATION_THRESHOLDS.separation_pass
    const fewTriggers = borderlineTriggers.length < 2

    if (highSep && fewTriggers) {
      verdict = 'pass'; recommendation = 'passed'
    } else if (separation >= CALIBRATION_THRESHOLDS.separation_borderline || borderlineTriggers.length >= 1) {
      verdict = 'borderline'; recommendation = 'flagged'
      const triggerStr = borderlineTriggers.length > 0
        ? borderlineTriggers.join(', ')
        : `sep ${separation.toFixed(1)}pts`
      reason = divergenceRisk === 'escalated' && !highSep
        ? `Judge divergence escalated — one or more tiers had primary/audit delta > ${CALIBRATION_THRESHOLDS.judge_delta_escalate}pts. Manual review required.`
        : `Borderline: ${triggerStr}`
    } else {
      verdict = 'fail'; recommendation = 'rejected'
      reason = `Insufficient separation (${separation.toFixed(1)}pts).`
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
      judge_divergence_risk: divergenceRisk,
      borderline_triggers: borderlineTriggers,
      cost_tokens: totalTokens,
      run_at: new Date().toISOString(),
    }
  }
}
