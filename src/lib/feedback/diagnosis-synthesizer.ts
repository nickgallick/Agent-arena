// Stage 2: Diagnosis Synthesis
// Forge · 2026-03-31
//
// LLM call: produces the core diagnosis from extracted signals.
// Separated from coaching so the diagnosis is clean, analytical,
// and not contaminated by the "tell them what to do" voice.
//
// Architecture note: diagnosis answers WHAT HAPPENED and WHY.
// Coaching (stage 3) answers WHAT TO DO NEXT.
// Never mix the two in a single prompt — it produces generic summaries.

import {
  FAILURE_MODE_CODES,
  FAILURE_MODE_DESCRIPTIONS,
  type ExtractedSignals,
  type DiagnosisOutput,
  type FailureModeClassification,
  type LaneDiagnosis,
  type DecisiveFactor,
  type CompetitiveComparison,
  type FailureModeCode,
} from './types'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
// Use Haiku for diagnosis — same quality for structured JSON output, 5-10x faster (< 15s).
// Sonnet was taking 85-90s on the 3000-token prompt, busting Vercel's 60s function limit.
const DIAGNOSIS_MODEL = 'anthropic/claude-haiku-4-5'

// ─────────────────────────────────────────────
// Prompt construction
// ─────────────────────────────────────────────

function buildDiagnosisPrompt(signals: ExtractedSignals): string {
  const laneBlock = signals.lane_signals.map(l => {
    const dims = Object.entries(l.dimension_scores)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join('\n')
    return `
Lane: ${l.lane.toUpperCase()}
Score: ${l.score}/100
Confidence: ${l.confidence}
Flags: ${l.flags.join(', ') || 'none'}
Judge rationale: ${l.rationale || '(none)'}
Strongest signal: ${l.positive_signal || '(not populated)'}
Primary weakness: ${l.primary_weakness || '(not populated)'}
Dimension scores:
${dims || '  (none)'}
Evidence refs: ${l.evidence_refs.slice(0, 3).join(', ') || 'none'}
`.trim()
  }).join('\n\n')

  const telBlock = signals.telemetry ? `
Telemetry:
- Thrash rate: ${(signals.telemetry.thrash_rate * 100).toFixed(0)}%
- Tool discipline: ${(signals.telemetry.tool_discipline * 100).toFixed(0)}%
- Verification density: ${(signals.telemetry.verification_density * 100).toFixed(0)}%
- Wasted action ratio: ${(signals.telemetry.wasted_action_ratio * 100).toFixed(0)}%
- Pct time in verify phase: ${(signals.telemetry.pct_verify * 100).toFixed(0)}%
- Pct time in recover phase: ${(signals.telemetry.pct_recover * 100).toFixed(0)}%
- Error count: ${signals.telemetry.error_count}
- Pivot count: ${signals.telemetry.pivot_count}
- Total events: ${signals.telemetry.total_events}
- Telemetry process score: ${signals.telemetry.telemetry_process_score.toFixed(0)}
- Telemetry efficiency score: ${signals.telemetry.telemetry_efficiency_score.toFixed(0)}
`.trim() : 'Telemetry: not available'

  const priorBlock = signals.prior_profile ? `
Prior agent profile (${signals.prior_profile.total_bouts} bouts):
- Rolling overall: ${signals.prior_profile.rolling_overall_score ?? 'N/A'}
- Rolling objective: ${signals.prior_profile.rolling_objective_score ?? 'N/A'}
- Rolling process: ${signals.prior_profile.rolling_process_score ?? 'N/A'}
- Rolling strategy: ${signals.prior_profile.rolling_strategy_score ?? 'N/A'}
- Recurring failure modes: ${signals.prior_profile.recurring_failure_modes.map(f => `${f.code}(×${f.count})`).join(', ') || 'none yet'}
- Recurring weaknesses: ${signals.prior_profile.recurring_weaknesses.slice(0, 3).map(w => w.label).join(', ') || 'none yet'}
`.trim() : 'Prior agent profile: first bout (no history)'

  const failureTaxonomy = FAILURE_MODE_CODES
    .filter(c => c !== 'none_detected')
    .map(c => `- ${c}: ${FAILURE_MODE_DESCRIPTIONS[c]}`)
    .join('\n')

  const placementBlock = signals.placement && signals.total_entries
    ? `Placement: #${signals.placement} of ${signals.total_entries} entries`
    : 'Placement: not yet ranked'

  // B1/D3 FIX: Only emit real computed deltas. Never ask LLM to estimate these.
  const fs = signals.field_stats
  const compScore = signals.composite_score
  const hasRealComparison = fs != null && fs.sample_count >= 5 && compScore != null

  const competitiveComparisonInstruction = hasRealComparison && fs
    ? `REAL COMPUTED FIELD STATS (use these exact values — do NOT estimate or invent any numbers):
- Field sample count: ${fs.sample_count} entries
- Winner composite: ${fs.winner_composite?.toFixed(1) ?? 'N/A'}
- Top-quartile composite: ${fs.top_quartile_composite?.toFixed(1) ?? 'N/A'}
- Median composite: ${fs.median_composite?.toFixed(1) ?? 'N/A'}
- This submission composite: ${compScore.toFixed(1)}
- vs_median delta (REAL): ${compScore != null && fs.median_composite != null ? (compScore - fs.median_composite).toFixed(1) : 'N/A'}
- vs_top_quartile delta (REAL): ${compScore != null && fs.top_quartile_composite != null ? (compScore - fs.top_quartile_composite).toFixed(1) : 'N/A'}
- vs_winner delta (REAL): ${compScore != null && fs.winner_composite != null ? (compScore - fs.winner_composite).toFixed(1) : 'N/A'}
${signals.prior_profile?.rolling_overall_score != null && compScore != null
  ? `- vs_prior_baseline delta (REAL): ${(compScore - signals.prior_profile.rolling_overall_score).toFixed(1)} (this bout vs rolling average of ${signals.prior_profile.rolling_overall_score.toFixed(1)})`
  : '- vs_prior_baseline: no prior average yet'}

RULE: Use the exact computed deltas above. Do NOT estimate, round differently, or invent new numbers.
competitive_comparison narrative: write ONE sentence summarizing competitive position using the data above.`
    : `COMPETITIVE COMPARISON: null — sample size is ${fs?.sample_count ?? 0} (minimum 5 required).
DO NOT generate any competitive_comparison data. Set competitive_comparison to null.
Never invent or estimate numeric comparisons when real data is unavailable.`

  return `You are an expert performance analyst for an AI agent competition platform called Bouts.
Your job is to produce FORENSIC PERFORMANCE INTELLIGENCE — not commentary, not a summary.
A serious ML engineer or AI builder will read this. They expect precision, not encouragement.

TONE REQUIREMENTS:
✓ "You lost on validation discipline, not raw capability."
✓ "The decisive error was locking the first workable path without checking the hidden constraint."
✓ "Your agent is fast, but currently too willing to treat plausible as confirmed."
✗ "Your solution demonstrated both strengths and weaknesses."
✗ "There is room for improvement."
✗ "It may be beneficial to..."
Never use: "good effort", "shows promise", "well done", "nice work", "room to grow"

SUBMISSION DATA:
Challenge family: ${signals.challenge_family ?? 'generic'}
Challenge category: ${signals.challenge_category ?? 'unknown'}
Composite score: ${signals.composite_score != null ? signals.composite_score.toFixed(1) + '/100' : 'N/A'}
Integrity adjustment: ${signals.integrity_adjustment >= 0 ? '+' : ''}${signals.integrity_adjustment}
${placementBlock}

LANE SCORES:
${laneBlock}

${telBlock}

${priorBlock}

${competitiveComparisonInstruction}

FAILURE MODE TAXONOMY (classify using these exact codes):
${failureTaxonomy}

Submission content (first 2000 chars for context):
${signals.submission_content_snippet ? `"""\n${signals.submission_content_snippet}\n"""` : '(not available)'}

TASK: Produce a JSON diagnosis with EXACTLY this structure. Every field must be populated with SPECIFIC evidence-backed content. No null for key fields. No generic prose.

{
  "overall_summary": "1-2 sentences. Must include composite score, strongest lane, weakest lane, and one causal observation.",
  "executive_diagnosis": "3-4 sentences. Why won/lost. Strongest trait. Weakest trait. Decisive swing. Be specific and analytical.",
  "result_narrative": "2-3 sentences. What actually happened in plain language. Describe the execution arc. Reference specific signals.",
  "primary_loss_driver": "single short phrase, e.g. 'validation discipline failure' or 'hidden constraint miss'",
  "secondary_loss_driver": "single short phrase or null",
  "decisive_moment": "REQUIRED: The single most important event or pattern. MUST reference at least one of: a specific flag name, a telemetry metric value, a score differential, or a concrete behavior observed in the submission. Example: 'The agent locked path A at step 12 without verifying constraint C (flag: hidden_constraint_miss, objective score dropped 23 points) — this decision propagated to all subsequent outputs.' Generic phrases like 'the agent struggled with X' are not acceptable.",
  "dominant_strength": "The agent's clearest demonstrated strength. MUST be specific. E.g. 'Rapid structural decomposition — the agent broke down the problem into correct subparts within the first 8 steps.'",
  "dominant_weakness": "The agent's clearest demonstrated weakness. MUST be specific. E.g. 'Low verification density — only 2% of actions were verification steps despite 40+ implementation actions.'",
  "failure_modes": [
    {
      "failure_mode_code": "(one of the taxonomy codes above)",
      "severity": "critical|high|medium|low",
      "confidence": "high|medium|low",
      "primary_flag": true/false,
      "explanation": "Specific to this submission. What evidence led to this classification.",
      "evidence_signal": "The exact data point(s) that support this — score, flag, metric, rationale fragment."
    }
  ],
  "lane_diagnoses": [
    {
      "lane": "objective|process|strategy|integrity",
      "score": number,
      "confidence": "high|medium|low",
      "strongest_behavior": "Specific. What the agent did well in this lane.",
      "weakest_behavior": "Specific. What the agent did poorly in this lane.",
      "primary_driver": "Root cause of this lane result. Not 'weak strategy' — what specifically caused it.",
      "secondary_driver": "Secondary cause or null",
      "what_went_right": "Evidence-linked. 1-2 sentences.",
      "what_went_wrong": "Evidence-linked. 1-2 sentences.",
      "what_this_means": "Interpretation. Why this result matters for agent quality.",
      "improvement_recommendation": "Specific action. Not advice — an engineering task.",
      "evidence_refs": ["signal descriptions from the data above"]
    }
  ],
  "decisive_positive_factors": [
    {
      "title": "Short label",
      "description": "What happened and why it helped",
      "impact_direction": "positive",
      "impact_magnitude": "high|medium|low",
      "lane": "which lane this factor primarily affected",
      "evidence_signal": "The data point that shows this"
    }
  ],
  "decisive_negative_factors": [
    {
      "title": "Short label",
      "description": "What happened and why it hurt",
      "impact_direction": "negative",
      "impact_magnitude": "high|medium|low",
      "lane": "which lane this factor primarily affected",
      "evidence_signal": "The data point that shows this"
    }
  ],
  "competitive_comparison": ${hasRealComparison && fs ? `{
    "vs_median": {
      "label": "vs. median (${fs.sample_count} entries)",
      "composite_delta": ${compScore != null && fs.median_composite != null ? (compScore - fs.median_composite).toFixed(1) : 'null'},
      "objective_delta": null,
      "process_delta": null,
      "strategy_delta": null,
      "summary": "write exactly one sentence — use the real delta above, e.g. 'Scored X.X points above the median of ${fs.median_composite?.toFixed(1)} across ${fs.sample_count} entries.'"
    },
    "vs_top_quartile": {
      "label": "vs. top 25%",
      "composite_delta": ${compScore != null && fs.top_quartile_composite != null ? (compScore - fs.top_quartile_composite).toFixed(1) : 'null'},
      "objective_delta": null,
      "process_delta": null,
      "strategy_delta": null,
      "summary": "one sentence using the real delta"
    },
    "vs_winner": {
      "label": "vs. current leader",
      "composite_delta": ${compScore != null && fs.winner_composite != null ? (compScore - fs.winner_composite).toFixed(1) : 'null'},
      "objective_delta": null,
      "process_delta": null,
      "strategy_delta": null,
      "summary": "one sentence using the real delta"
    },
    "vs_prior_baseline": ${signals.prior_profile?.rolling_overall_score != null && compScore != null ? `{
      "label": "vs. your prior average (${signals.prior_profile.total_bouts} bouts)",
      "composite_delta": ${(compScore - signals.prior_profile.rolling_overall_score).toFixed(1)},
      "objective_delta": null,
      "process_delta": null,
      "strategy_delta": null,
      "summary": "one sentence using the real delta"
    }` : 'null'},
    "narrative": "One sentence using ONLY the computed values above. DO NOT invent any numbers."
  }` : 'null'},
  "confidence_overall": "high|medium|low",
  "evidence_density_score": number 0-10 (how much hard evidence supports this diagnosis),
  "ambiguity_level": "low|medium|high"
}

Populate failure_modes with 1-3 entries. Mark primary_flag=true on the dominant one only.
Populate decisive_positive_factors with 1-3 entries and decisive_negative_factors with 1-3 entries.
Lane diagnoses must cover every lane in the input data.
Return ONLY the JSON object. No preamble, no explanation, no markdown fences.`
}

// ─────────────────────────────────────────────
// LLM call
// ─────────────────────────────────────────────

async function callOpenRouter(
  prompt: string,
  model: string,
  timeoutMs = 45_000
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
        'X-Title': 'Bouts Performance Feedback',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,   // Low temp — we want precise, analytical output
        max_tokens: 2500,   // Reduced from 3000 — Haiku is more concise
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 200)}`)
    }

    const data = await res.json() as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('Empty response from OpenRouter')
    return content
  } finally {
    clearTimeout(timeout)
  }
}

// ─────────────────────────────────────────────
// Parse and validate LLM output
// ─────────────────────────────────────────────

function parseDiagnosisResponse(raw: string, signals: ExtractedSignals): DiagnosisOutput {
  // Strip markdown fences if present
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // If JSON parse fails, build a minimal fallback from the signals data
    return buildFallbackDiagnosis(signals)
  }

  // Validate and normalize failure modes
  const failureModes: FailureModeClassification[] = []
  const rawModes = Array.isArray(parsed.failure_modes) ? parsed.failure_modes as Record<string, unknown>[] : []
  for (const m of rawModes) {
    const code = String(m.failure_mode_code ?? '')
    if (!(FAILURE_MODE_CODES as readonly string[]).includes(code)) continue
    failureModes.push({
      failure_mode_code: code as FailureModeCode,
      severity:          (['critical','high','medium','low'].includes(String(m.severity ?? '')) ? String(m.severity) : 'medium') as 'critical'|'high'|'medium'|'low',
      confidence:        (['high','medium','low'].includes(String(m.confidence ?? '')) ? String(m.confidence) : 'medium') as 'high'|'medium'|'low',
      primary_flag:      Boolean(m.primary_flag),
      explanation:       String(m.explanation ?? ''),
      evidence_signal:   String(m.evidence_signal ?? ''),
    })
  }
  if (failureModes.length === 0) {
    failureModes.push({
      failure_mode_code: 'none_detected',
      severity: 'low',
      confidence: 'medium',
      primary_flag: true,
      explanation: 'No dominant failure mode identified from the available signals.',
      evidence_signal: 'Insufficient signal to classify a specific failure mode.',
    })
  }

  // Validate lane diagnoses
  const laneDiagnoses: LaneDiagnosis[] = []
  const rawLanes = Array.isArray(parsed.lane_diagnoses) ? parsed.lane_diagnoses as Record<string, unknown>[] : []
  for (const l of rawLanes) {
    laneDiagnoses.push({
      lane:                      String(l.lane ?? ''),
      score:                     Number(l.score ?? 0),
      percentile:                l.percentile != null ? Number(l.percentile) : null,
      confidence:                (['high','medium','low'].includes(String(l.confidence ?? '')) ? String(l.confidence) : 'medium') as 'high'|'medium'|'low',
      strongest_behavior:        String(l.strongest_behavior ?? ''),
      weakest_behavior:          String(l.weakest_behavior ?? ''),
      primary_driver:            String(l.primary_driver ?? ''),
      secondary_driver:          l.secondary_driver ? String(l.secondary_driver) : null,
      what_went_right:           String(l.what_went_right ?? ''),
      what_went_wrong:           String(l.what_went_wrong ?? ''),
      what_this_means:           String(l.what_this_means ?? ''),
      improvement_recommendation: String(l.improvement_recommendation ?? ''),
      evidence_refs:             Array.isArray(l.evidence_refs) ? (l.evidence_refs as string[]).map(String) : [],
    })
  }

  // Normalize decisive factors
  const normalizeFactors = (raw: unknown): DecisiveFactor[] => {
    if (!Array.isArray(raw)) return []
    return (raw as Record<string, unknown>[]).map(f => ({
      title:            String(f.title ?? ''),
      description:      String(f.description ?? ''),
      impact_direction: f.impact_direction === 'positive' ? 'positive' : 'negative',
      impact_magnitude: (['high','medium','low'].includes(String(f.impact_magnitude ?? '')) ? String(f.impact_magnitude) : 'medium') as 'high'|'medium'|'low',
      lane:             String(f.lane ?? 'all'),
      evidence_signal:  String(f.evidence_signal ?? ''),
    }))
  }

  // Normalize competitive comparison
  let competitiveComparison: CompetitiveComparison | null = null
  const rawCC = parsed.competitive_comparison
  if (rawCC && typeof rawCC === 'object') {
    const cc = rawCC as Record<string, unknown>
    const normalizePoint = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return null
      const p = raw as Record<string, unknown>
      return {
        label:           String(p.label ?? ''),
        composite_delta: p.composite_delta != null ? Number(p.composite_delta) : null,
        objective_delta: p.objective_delta != null ? Number(p.objective_delta) : null,
        process_delta:   p.process_delta != null ? Number(p.process_delta) : null,
        strategy_delta:  p.strategy_delta != null ? Number(p.strategy_delta) : null,
        summary:         String(p.summary ?? ''),
      }
    }
    competitiveComparison = {
      vs_median:        normalizePoint(cc.vs_median),
      vs_top_quartile:  normalizePoint(cc.vs_top_quartile),
      vs_winner:        normalizePoint(cc.vs_winner),
      vs_prior_baseline: normalizePoint(cc.vs_prior_baseline),
      narrative:        String(cc.narrative ?? ''),
    }
  }

  return {
    overall_summary:          String(parsed.overall_summary ?? ''),
    executive_diagnosis:      String(parsed.executive_diagnosis ?? ''),
    result_narrative:         String(parsed.result_narrative ?? ''),
    primary_loss_driver:      String(parsed.primary_loss_driver ?? ''),
    secondary_loss_driver:    parsed.secondary_loss_driver ? String(parsed.secondary_loss_driver) : null,
    decisive_moment:          String(parsed.decisive_moment ?? ''),
    dominant_strength:        String(parsed.dominant_strength ?? ''),
    dominant_weakness:        String(parsed.dominant_weakness ?? ''),
    failure_modes:            failureModes,
    lane_diagnoses:           laneDiagnoses,
    decisive_positive_factors: normalizeFactors(parsed.decisive_positive_factors),
    decisive_negative_factors: normalizeFactors(parsed.decisive_negative_factors),
    competitive_comparison:   competitiveComparison,
    confidence_overall:       (['high','medium','low'].includes(String(parsed.confidence_overall ?? '')) ? String(parsed.confidence_overall) : 'medium') as 'high'|'medium'|'low',
    evidence_density_score:   parsed.evidence_density_score != null ? Number(parsed.evidence_density_score) : 5,
    ambiguity_level:          (['low','medium','high'].includes(String(parsed.ambiguity_level ?? '')) ? String(parsed.ambiguity_level) : 'medium') as 'low'|'medium'|'high',
  }
}

// ─────────────────────────────────────────────
// Fallback when LLM fails / parse fails
// Uses pure signal data — never blank fields
// ─────────────────────────────────────────────

function buildFallbackDiagnosis(signals: ExtractedSignals): DiagnosisOutput {
  const scores = signals.lane_signals.map(l => ({ lane: l.lane, score: l.score }))
  const sorted = [...scores].sort((a, b) => b.score - a.score)
  const bestLane = sorted[0]
  const worstLane = sorted[sorted.length - 1]
  const composite = signals.composite_score

  const allFlags = signals.lane_signals.flatMap(l => l.flags)
  const primaryFailure: FailureModeCode = allFlags.some(f => f.includes('constraint')) ? 'hidden_constraint_miss'
    : allFlags.some(f => f.includes('valid')) ? 'validation_omission'
    : signals.telemetry && signals.telemetry.thrash_rate > 0.35 ? 'premature_convergence'
    : 'none_detected'

  return {
    overall_summary: composite != null
      ? `Composite score ${composite.toFixed(1)}/100. Strongest lane: ${bestLane?.lane ?? 'N/A'} (${bestLane?.score.toFixed(0) ?? '?'}). Weakest lane: ${worstLane?.lane ?? 'N/A'} (${worstLane?.score.toFixed(0) ?? '?'}).`
      : 'Score breakdown not fully available for this submission.',
    executive_diagnosis: 'Diagnosis synthesized from raw signal data (LLM unavailable).',
    result_narrative: `Lane data indicates strongest performance in ${bestLane?.lane ?? 'unknown'} and weakest in ${worstLane?.lane ?? 'unknown'}.`,
    primary_loss_driver: worstLane?.lane ?? 'unknown',
    secondary_loss_driver: null,
    decisive_moment: allFlags.length > 0 ? `Flags raised: ${allFlags.join(', ')}` : 'No specific decisive moment identified from available signals.',
    dominant_strength: bestLane ? `${bestLane.lane} lane performance (score: ${bestLane.score.toFixed(0)}/100)` : 'Unable to determine from available signals.',
    dominant_weakness: worstLane ? `${worstLane.lane} lane performance (score: ${worstLane.score.toFixed(0)}/100)` : 'Unable to determine from available signals.',
    failure_modes: [{
      failure_mode_code: primaryFailure,
      severity: 'medium',
      confidence: 'low',
      primary_flag: true,
      explanation: 'Classified from raw signal data without LLM synthesis.',
      evidence_signal: allFlags.join(', ') || 'No flags detected.',
    }],
    lane_diagnoses: signals.lane_signals.map(l => ({
      lane: l.lane,
      score: l.score,
      percentile: null,
      confidence: l.confidence,
      strongest_behavior: l.positive_signal ?? `${l.lane} lane score: ${l.score.toFixed(0)}/100`,
      weakest_behavior: l.primary_weakness ?? `${l.flags.length > 0 ? 'Flags: ' + l.flags.join(', ') : 'No specific weakness signal available'}`,
      primary_driver: l.rationale || `Score of ${l.score.toFixed(0)} reflects judge output confidence ${(l.confidence).toString()}`,
      secondary_driver: null,
      what_went_right: l.positive_signal ?? 'See lane score.',
      what_went_wrong: l.primary_weakness ?? (l.flags.length > 0 ? l.flags.join(', ') : 'See lane score.'),
      what_this_means: `${l.lane} contribution to composite score.`,
      improvement_recommendation: l.score < 50 ? `Focus on improving ${l.lane} lane performance.` : `Maintain ${l.lane} quality.`,
      evidence_refs: l.evidence_refs,
    })),
    decisive_positive_factors: [],
    decisive_negative_factors: [],
    competitive_comparison: null,
    confidence_overall: 'low',
    evidence_density_score: 3,
    ambiguity_level: 'high',
  }
}

// ─────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────

export async function synthesizeDiagnosis(signals: ExtractedSignals): Promise<DiagnosisOutput> {
  const prompt = buildDiagnosisPrompt(signals)
  let raw: string
  try {
    // 30s timeout — Haiku is fast (typically 5-15s for this prompt size).
    // Both diagnosis + coaching together should stay well under Vercel's 60s limit.
    raw = await callOpenRouter(prompt, DIAGNOSIS_MODEL, 30_000)
  } catch (err) {
    console.error('[feedback/diagnosis-synthesizer] LLM call failed:', err)
    return buildFallbackDiagnosis(signals)
  }
  return parseDiagnosisResponse(raw, signals)
}
