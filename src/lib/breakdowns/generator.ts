import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AggregationResult } from '@/lib/judging/aggregator'
import type { LaneRunResult } from '@/lib/judging/lane-runner'
import { selectTemplate, applyTemplate, type TemplateData } from './template-engine'
import { auditForLeakage } from './leakage-auditor'

export async function generateBreakdowns(
  supabase: SupabaseClient,
  opts: {
    match_result_id: string
    submission_id: string
    challenge_id: string
    agent_id: string
    aggregation_result: AggregationResult
    lane_scores: Record<string, LaneRunResult>
  }
): Promise<void> {
  const { match_result_id, submission_id, challenge_id, aggregation_result, lane_scores } = opts

  // Fetch challenge family for template selection
  const { data: challenge } = await supabase
    .from('challenges')
    .select('family')
    .eq('id', challenge_id)
    .single()

  const family = (challenge?.family as string) ?? 'generic'

  // Fetch match result for rank context
  const { data: matchResult } = await supabase
    .from('match_results')
    .select('percentile, rank_at_finalization')
    .eq('id', match_result_id)
    .single()

  // Build evidence hashes from lane artifacts
  const { data: artifacts } = await supabase
    .from('judge_lane_artifacts')
    .select('lane, content_hash')
    .eq('judge_run_id', opts.match_result_id) // approximation

  const evidenceHashes: Record<string, string> = {}
  if (artifacts) {
    for (const a of artifacts) {
      evidenceHashes[a.lane as string] = a.content_hash as string
    }
  }

  const laneRunResults: Record<string, {
    rationale_summary: string
    flags: string[]
    model_used: string
    confidence: string
  }> = {}
  for (const [lane, result] of Object.entries(lane_scores)) {
    laneRunResults[lane] = {
      rationale_summary: result.rationale_summary,
      flags: result.flags,
      model_used: result.model_used,
      confidence: result.confidence,
    }
  }

  const templateData: TemplateData = {
    final_score: aggregation_result.final_score,
    result_state: aggregation_result.result_state,
    lane_subscores: aggregation_result.lane_subscores,
    lane_run_results: laneRunResults,
    evidence_hashes: evidenceHashes,
    percentile: matchResult?.percentile ?? undefined,
    rank: matchResult?.rank_at_finalization ?? undefined,
    challenge_family: family,
    audit_reason: aggregation_result.audit_reason,
    dispute_delta: aggregation_result.dispute_delta,
    confidence_level: aggregation_result.confidence_level,
  }

  const audiences: Array<'competitor' | 'spectator' | 'admin'> = ['competitor', 'spectator', 'admin']

  for (const audience of audiences) {
    const template = selectTemplate(family, aggregation_result.result_state, audience)
    const content = applyTemplate(template, templateData)
    const { passed, warnings } = auditForLeakage(content, audience)

    if (audience === 'admin') {
      templateData.leakage_warnings = warnings
    }

    const content_hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(content))
      .digest('hex')

    // Get current max version for this result+audience
    const { data: existing } = await supabase
      .from('match_breakdowns')
      .select('version')
      .eq('match_result_id', match_result_id)
      .eq('audience', audience)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    const version = (existing?.version ?? 0) + 1

    const { error } = await supabase.from('match_breakdowns').insert({
      match_result_id,
      submission_id,
      audience,
      version,
      content,
      content_hash,
      leakage_audit_passed: passed,
      leakage_warnings: warnings,
    })

    if (error) {
      throw new Error(`Failed to insert ${audience} breakdown: ${error.message}`)
    }
  }
}
