export interface BreakdownTemplate {
  family: string
  outcome_type: string
  audience: string
  fields: string[]
  coaching_enabled: boolean
  rank_context_enabled: boolean
  rationale_enabled: boolean
}

export interface TemplateData {
  final_score: number
  result_state: string
  lane_subscores: Record<string, { raw: number; weighted: number; weight: number }>
  lane_run_results?: Record<string, {
    rationale_summary: string
    flags: string[]
    model_used: string
    confidence: string
  }>
  evidence_hashes?: Record<string, string>
  leakage_warnings?: string[]
  percentile?: number
  rank?: number
  challenge_family?: string
  audit_reason?: string
  dispute_delta?: number
  confidence_level: string
}

const OUTCOME_TYPES = ['clean_pass', 'audit_adjusted', 'flagged', 'exploit_penalized', 'failed'] as const
type OutcomeType = typeof OUTCOME_TYPES[number]

const FAMILIES = ['blacksite_debug', 'fog_of_war', 'false_summit', 'recovery_spiral', 'toolchain_betrayal', 'generic'] as const
type Family = typeof FAMILIES[number]

function resolveOutcomeType(result_state: string): OutcomeType {
  switch (result_state) {
    case 'clean': return 'clean_pass'
    case 'audited': return 'audit_adjusted'
    case 'flagged': case 'disputed': return 'flagged'
    case 'exploit_penalized': return 'exploit_penalized'
    case 'failed': case 'invalidated': return 'failed'
    default: return 'clean_pass'
  }
}

function resolveFamily(family: string): Family {
  if ((FAMILIES as readonly string[]).includes(family)) return family as Family
  return 'generic'
}

export function selectTemplate(family: string, result_state: string, audience: string): BreakdownTemplate {
  const outcome_type = resolveOutcomeType(result_state)
  const resolved_family = resolveFamily(family)

  return {
    family: resolved_family,
    outcome_type,
    audience,
    fields: getTemplateFields(audience),
    coaching_enabled: audience === 'competitor',
    rank_context_enabled: audience === 'competitor' || audience === 'spectator',
    rationale_enabled: audience === 'admin',
  }
}

function getTemplateFields(audience: string): string[] {
  switch (audience) {
    case 'competitor':
      return ['final_score', 'result_state', 'lane_breakdown', 'strengths', 'weaknesses', 'improvement_priorities', 'comparison_note', 'confidence_note']
    case 'spectator':
      return ['final_score', 'result_state', 'lane_summary', 'rank_context']
    case 'admin':
      return ['final_score', 'result_state', 'lane_breakdown', 'judge_rationale_summaries', 'evidence_package_hashes', 'leakage_warnings', 'audit_info', 'confidence_level']
    default:
      return ['final_score', 'result_state']
  }
}

export function applyTemplate(template: BreakdownTemplate, data: TemplateData): Record<string, unknown> {
  switch (template.audience) {
    case 'competitor':
      return buildCompetitorContent(template, data)
    case 'spectator':
      return buildSpectatorContent(template, data)
    case 'admin':
      return buildAdminContent(template, data)
    default:
      return { final_score: data.final_score, result_state: data.result_state }
  }
}

function buildCompetitorContent(template: BreakdownTemplate, data: TemplateData): Record<string, unknown> {
  const lane_breakdown: Record<string, { score: number; summary: string }> = {}

  for (const [lane, scores] of Object.entries(data.lane_subscores)) {
    if (['objective', 'process', 'strategy', 'integrity'].includes(lane)) {
      const rationale = data.lane_run_results?.[lane]?.rationale_summary ?? ''
      lane_breakdown[lane] = {
        score: Math.round(scores.raw),
        summary: rationale || generateLaneSummary(lane, scores.raw, template),
      }
    }
  }

  const { strengths, weaknesses, improvements } = generateCoachingContent(data, template)

  return {
    final_score: data.final_score,
    result_state: data.result_state,
    lane_breakdown,
    strengths,
    weaknesses,
    improvement_priorities: improvements,
    comparison_note: data.percentile
      ? `You scored in the ${data.percentile.toFixed(0)}th percentile on this challenge`
      : null,
    confidence_note: data.confidence_level === 'low'
      ? 'Score confidence is low — significant variance between judging lanes'
      : null,
  }
}

function buildSpectatorContent(_template: BreakdownTemplate, data: TemplateData): Record<string, unknown> {
  const lane_summary: Record<string, number> = {}
  for (const [lane, scores] of Object.entries(data.lane_subscores)) {
    if (['objective', 'process', 'strategy', 'integrity'].includes(lane)) {
      lane_summary[lane] = Math.round(scores.raw)
    }
  }

  return {
    final_score: data.final_score,
    result_state: data.result_state,
    lane_summary,
    rank_context: data.rank
      ? { rank: data.rank, percentile: data.percentile }
      : null,
  }
}

function buildAdminContent(_template: BreakdownTemplate, data: TemplateData): Record<string, unknown> {
  const lane_breakdown: Record<string, { score: number; weighted: number; weight: number; summary: string; flags: string[]; model: string }> = {}

  for (const [lane, scores] of Object.entries(data.lane_subscores)) {
    const run = data.lane_run_results?.[lane]
    lane_breakdown[lane] = {
      score: Math.round(scores.raw),
      weighted: scores.weighted,
      weight: scores.weight,
      summary: run?.rationale_summary ?? '',
      flags: run?.flags ?? [],
      model: run?.model_used ?? 'unknown',
    }
  }

  return {
    final_score: data.final_score,
    result_state: data.result_state,
    lane_breakdown,
    judge_rationale_summaries: data.lane_run_results
      ? Object.fromEntries(
          Object.entries(data.lane_run_results).map(([lane, r]) => [lane, r.rationale_summary])
        )
      : {},
    evidence_package_hashes: data.evidence_hashes ?? {},
    leakage_warnings: data.leakage_warnings ?? [],
    audit_info: {
      triggered: !!data.audit_reason,
      reason: data.audit_reason ?? null,
      score_delta: data.dispute_delta ?? null,
    },
    confidence_level: data.confidence_level,
  }
}

function generateLaneSummary(lane: string, score: number, template: BreakdownTemplate): string {
  const tier = score >= 80 ? 'strong' : score >= 60 ? 'adequate' : 'needs improvement'
  const familyContext = template.family !== 'generic' ? ` in the context of ${template.family.replace(/_/g, ' ')} challenge` : ''
  return `${lane} scored ${Math.round(score)} — ${tier}${familyContext}`
}

function generateCoachingContent(
  data: TemplateData,
  _template: BreakdownTemplate
): { strengths: string[]; weaknesses: string[]; improvements: string[] } {
  const strengths: string[] = []
  const weaknesses: string[] = []
  const improvements: string[] = []

  for (const [lane, scores] of Object.entries(data.lane_subscores)) {
    if (!['objective', 'process', 'strategy', 'integrity'].includes(lane)) continue
    if (scores.raw >= 75) {
      strengths.push(`Strong ${lane} score (${Math.round(scores.raw)})`)
    } else if (scores.raw < 55) {
      weaknesses.push(`Low ${lane} score (${Math.round(scores.raw)}) — focus area`)
      improvements.push(`Improve ${lane} approach`)
    }
  }

  if (strengths.length === 0) strengths.push('Completed challenge submission')
  if (weaknesses.length === 0) weaknesses.push('No critical weaknesses identified')
  if (improvements.length === 0) improvements.push('Review scoring breakdown for optimization opportunities')

  return { strengths, weaknesses, improvements }
}
