// Stage 3: Coaching Translation
// Forge · 2026-03-31
//
// Separate LLM call from diagnosis. The diagnosis tells you WHAT happened and WHY.
// Coaching tells you WHAT TO DO NEXT.
//
// These must be separate prompts because:
// 1. Diagnosis tone = forensic analyst (analytical, precise)
// 2. Coaching tone = expert mentor (actionable, direct, engineering-specific)
// 3. Mixing them produces "here's what went wrong and what to do" generic summaries
//
// Coaching output must feel like:
// ✓ "Add a post-generation assertion step that validates your output against constraint C before returning."
// ✓ "Your verify phase is 2% of session. Target 15%+ — add test runs after each major implementation chunk."
// ✗ "Consider improving your verification process."
// ✗ "You may want to think about constraints more carefully."

import type { DiagnosisOutput, ExtractedSignals, CoachingOutput, ImprovementPriority } from './types'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const COACHING_MODEL = 'anthropic/claude-sonnet-4-6'

function buildCoachingPrompt(
  diagnosis: DiagnosisOutput,
  signals: ExtractedSignals
): string {
  const laneWeaknesses = diagnosis.lane_diagnoses
    .map(l => `${l.lane.toUpperCase()} (${l.score}/100): ${l.weakest_behavior}`)
    .join('\n')

  const failureModes = diagnosis.failure_modes
    .filter(f => f.primary_flag || f.severity === 'critical' || f.severity === 'high')
    .map(f => `[${f.failure_mode_code}] ${f.explanation}`)
    .join('\n')

  const telBlock = signals.telemetry
    ? `Thrash: ${(signals.telemetry.thrash_rate * 100).toFixed(0)}% | Verify density: ${(signals.telemetry.verification_density * 100).toFixed(0)}% | Waste: ${(signals.telemetry.wasted_action_ratio * 100).toFixed(0)}% | Errors: ${signals.telemetry.error_count}`
    : '(telemetry not available)'

  const recurringContext = signals.prior_profile?.recurring_failure_modes.length
    ? `Recurring patterns from ${signals.prior_profile.total_bouts} prior bouts: ${signals.prior_profile.recurring_failure_modes.map(f => `${f.code}(×${f.count})`).join(', ')}`
    : '(first bout — no prior history)'

  return `You are an elite AI engineering coach reviewing a competitor's performance in an AI agent competition called Bouts.

Your job is to produce SPECIFIC, ACTIONABLE coaching. Not observations. Not descriptions. Engineering tasks.

TONE:
✓ "Add a post-generation assertion that validates your output against constraint X before returning."
✓ "Target 15%+ of session time in the verify phase. Currently ${signals.telemetry ? (signals.telemetry.pct_verify * 100).toFixed(0) : '?'}%."
✓ "The core fix is a validation pass before finalizing any output that claims correctness."
✗ "Consider improving your approach to constraints."
✗ "Verification could be stronger."
✗ "You demonstrated some weaknesses in process."

DIAGNOSIS SUMMARY:
- Primary loss driver: ${diagnosis.primary_loss_driver}
- Secondary: ${diagnosis.secondary_loss_driver ?? 'none'}
- Dominant weakness: ${diagnosis.dominant_weakness}
- Decisive moment: ${diagnosis.decisive_moment}

LANE WEAKNESSES:
${laneWeaknesses}

FAILURE MODES IDENTIFIED:
${failureModes || 'none_detected'}

TELEMETRY:
${telBlock}

LONGITUDINAL CONTEXT:
${recurringContext}

Return EXACTLY this JSON structure. Every recommendation must be SPECIFIC — reference the actual failure mode, the specific lane, the specific metric. No generic advice.

{
  "highest_leverage_fix": "The single most important change. One specific engineering task. E.g. 'Implement a constraint-verification pass: after generating your solution, re-read the problem spec and explicitly check each stated constraint before returning.'",
  "next_best_fix": "Second priority. Specific engineering task.",
  "improvement_priorities": [
    {
      "priority_rank": 1,
      "priority_tier": "fix_first",
      "title": "Short label (5 words max)",
      "recommendation": "Specific, concrete engineering recommendation. What exactly to build/change.",
      "rationale": "Why this matters for THIS submission specifically. Reference the actual signal.",
      "expected_impact": "high|medium|low",
      "implementation_difficulty": "low|medium|high",
      "lane_target": "objective|process|strategy|integrity|all"
    },
    {
      "priority_rank": 2,
      "priority_tier": "fix_first",
      ... (2nd most important fix_first item)
    },
    {
      "priority_rank": 3,
      "priority_tier": "fix_next",
      ... (first fix_next item)
    },
    {
      "priority_rank": 4,
      "priority_tier": "fix_next",
      ... (second fix_next item, optional)
    },
    {
      "priority_rank": 5,
      "priority_tier": "stretch",
      ... (stretch goal — higher difficulty, higher ceiling)
    }
  ]
}

Rules:
- fix_first: 2 items (immediate, high leverage, low-medium difficulty)
- fix_next: 1-2 items (important but can wait one cycle)
- stretch: 1 item (ambitious improvement, higher ceiling)
- Total priorities: 4-5 items
- Every recommendation must reference the specific failure mode or signal it addresses
- Never use the word "consider" or "may" or "could" — these are imperatives
Return ONLY the JSON. No preamble, no markdown.`
}

async function callOpenRouter(
  prompt: string,
  model: string,
  timeoutMs = 30_000
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://agent-arena-roan.vercel.app',
        'X-Title': 'Bouts Coaching',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 200)}`)
    }

    const data = await res.json() as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('Empty response')
    return content
  } finally {
    clearTimeout(timeout)
  }
}

function parseCoachingResponse(raw: string): CoachingOutput {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return buildFallbackCoaching()
  }

  const rawPriorities = Array.isArray(parsed.improvement_priorities)
    ? (parsed.improvement_priorities as Record<string, unknown>[])
    : []

  const priorities: ImprovementPriority[] = rawPriorities.slice(0, 10).map((p, i) => ({
    priority_rank:            Number(p.priority_rank ?? (i + 1)),
    priority_tier:            (['fix_first','fix_next','stretch'].includes(String(p.priority_tier ?? '')) ? String(p.priority_tier) : 'fix_next') as 'fix_first'|'fix_next'|'stretch',
    title:                    String(p.title ?? `Priority ${i + 1}`),
    recommendation:           String(p.recommendation ?? ''),
    rationale:                String(p.rationale ?? ''),
    expected_impact:          (['high','medium','low'].includes(String(p.expected_impact ?? '')) ? String(p.expected_impact) : 'medium') as 'high'|'medium'|'low',
    implementation_difficulty: (['low','medium','high'].includes(String(p.implementation_difficulty ?? '')) ? String(p.implementation_difficulty) : 'medium') as 'low'|'medium'|'high',
    lane_target:              (['objective','process','strategy','integrity','all'].includes(String(p.lane_target ?? '')) ? String(p.lane_target) : 'all') as 'objective'|'process'|'strategy'|'integrity'|'all',
  }))

  return {
    highest_leverage_fix: String(parsed.highest_leverage_fix ?? ''),
    next_best_fix:        String(parsed.next_best_fix ?? ''),
    improvement_priorities: priorities,
  }
}

function buildFallbackCoaching(): CoachingOutput {
  return {
    highest_leverage_fix: 'Review the primary failure mode identified in the diagnosis and address the root cause directly.',
    next_best_fix: 'Increase verification density — add test runs after each major implementation step.',
    improvement_priorities: [
      {
        priority_rank: 1,
        priority_tier: 'fix_first',
        title: 'Address Primary Failure',
        recommendation: 'Review the primary failure mode and implement a direct fix targeting the root cause identified in this diagnosis.',
        rationale: 'The primary failure mode was the dominant driver of score loss in this bout.',
        expected_impact: 'high',
        implementation_difficulty: 'medium',
        lane_target: 'all',
      },
      {
        priority_rank: 2,
        priority_tier: 'fix_next',
        title: 'Increase Verification Coverage',
        recommendation: 'Add explicit verification steps after each major implementation chunk. Target 15%+ of session in verify phase.',
        rationale: 'Verification density was a signal driver in this bout.',
        expected_impact: 'medium',
        implementation_difficulty: 'low',
        lane_target: 'process',
      },
    ],
  }
}

export async function translateCoaching(
  diagnosis: DiagnosisOutput,
  signals: ExtractedSignals
): Promise<CoachingOutput> {
  const prompt = buildCoachingPrompt(diagnosis, signals)
  let raw: string
  try {
    raw = await callOpenRouter(prompt, COACHING_MODEL, 30_000)
  } catch (err) {
    console.error('[feedback/coaching-translator] LLM call failed:', err)
    return buildFallbackCoaching()
  }
  return parseCoachingResponse(raw)
}
