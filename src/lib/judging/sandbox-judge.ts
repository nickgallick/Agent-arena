/**
 * Deterministic sandbox judging — no LLM calls, no on-chain calls.
 *
 * Produces stable, predictable results for SDK/integration testing.
 * Scores are fixed per sandbox challenge ID.
 */

import { randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { logEvent } from '@/lib/analytics/log-event'

const SANDBOX_SCORES: Record<string, { objective: number; process: number; strategy: number; integrity: number }> = {
  '00000000-0000-0000-0000-000000000001': { objective: 78, process: 72, strategy: 65, integrity: 88 },
  '00000000-0000-0000-0000-000000000002': { objective: 82, process: 75, strategy: 70, integrity: 90 },
  '00000000-0000-0000-0000-000000000003': { objective: 85, process: 80, strategy: 75, integrity: 92 },
}

const DEFAULT_SCORES = { objective: 75, process: 70, strategy: 65, integrity: 85 }

function getScores(challengeId: string) {
  return SANDBOX_SCORES[challengeId] ?? DEFAULT_SCORES
}

function computeWeightedScore(scores: { objective: number; process: number; strategy: number; integrity: number }): number {
  return (
    scores.objective * 0.5 +
    scores.process * 0.2 +
    scores.strategy * 0.2 +
    scores.integrity * 0.1
  )
}

export async function runSandboxJudging(opts: {
  submissionId: string
  challengeId: string
  sessionId: string
  agentId: string
}): Promise<void> {
  const { submissionId, challengeId, sessionId, agentId } = opts
  const supabase = createAdminClient()

  const scores = getScores(challengeId)
  const finalScore = Math.round(computeWeightedScore(scores) * 100) / 100
  const matchResultId = randomUUID()

  // Insert match_result
  const { error: mrError } = await supabase.from('match_results').insert({
    id: matchResultId,
    submission_id: submissionId,
    challenge_id: challengeId,
    agent_id: agentId,
    final_score: finalScore,
    pre_audit_score: finalScore,
    post_audit_score: null,
    result_state: 'final',
    confidence_level: 'high',
    audit_triggered: false,
    audit_reason: null,
    dispute_delta: null,
    is_sandbox: true,
    version_snapshot: { sandbox: true, deterministic: true },
  })

  if (mrError) {
    throw new Error(`Sandbox judge: failed to insert match_result: ${mrError.message}`)
  }

  // Insert match_lane_scores
  const laneInserts = [
    { lane: 'objective', raw_score: scores.objective, weight_applied: 50, weighted_contribution: scores.objective * 0.5 },
    { lane: 'process', raw_score: scores.process, weight_applied: 20, weighted_contribution: scores.process * 0.2 },
    { lane: 'strategy', raw_score: scores.strategy, weight_applied: 20, weighted_contribution: scores.strategy * 0.2 },
    { lane: 'integrity', raw_score: scores.integrity, weight_applied: 10, weighted_contribution: scores.integrity * 0.1 },
  ].map(lane => ({
    match_result_id: matchResultId,
    lane: lane.lane,
    raw_score: lane.raw_score,
    weighted_contribution: lane.weighted_contribution,
    weight_applied: lane.weight_applied,
  }))

  await supabase.from('match_lane_scores').insert(laneInserts)

  // Insert match_breakdowns for competitor + spectator audiences
  const breakdownBase = {
    match_result_id: matchResultId,
    submission_id: submissionId,
    challenge_id: challengeId,
    agent_id: agentId,
    final_score: finalScore,
    result_state: 'final',
    lane_breakdown: {
      objective: { score: scores.objective, summary: 'Sandbox deterministic score — integration testing.' },
      process: { score: scores.process, summary: 'Sandbox deterministic score — integration testing.' },
      strategy: { score: scores.strategy, summary: 'Sandbox deterministic score — integration testing.' },
      integrity: { score: scores.integrity, summary: 'Sandbox deterministic score — integration testing.' },
    },
    strengths: ['Successfully integrated with the Bouts API', 'Session creation and submission pipeline working correctly'],
    weaknesses: ['This is a sandbox result — no real evaluation was performed'],
    improvement_priorities: ['Move to production challenges once integration is verified'],
    comparison_note: 'Sandbox mode: deterministic scores used for all agents. Final rankings are not meaningful.',
    confidence_note: 'Scores are fixed for sandbox challenges. Use production challenges for real evaluation.',
  }

  await supabase.from('match_breakdowns').insert([
    { ...breakdownBase, audience: 'competitor' },
    { ...breakdownBase, audience: 'spectator' },
  ])

  // Update submission to completed
  await supabase
    .from('submissions')
    .update({ submission_status: 'completed' })
    .eq('id', submissionId)

  // Update challenge_session to completed
  await supabase
    .from('challenge_sessions')
    .update({ status: 'completed' })
    .eq('id', sessionId)

  // Fire-and-forget: check if this is the agent's first sandbox completion
  void (async () => {
    try {
      const { count } = await supabase
        .from('match_results')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agentId)
        .eq('is_sandbox', true)
      if (count === 1) {
        logEvent({
          event_type: 'first_sandbox_flow_completed',
          metadata: { agent_id: agentId, submission_id: submissionId, challenge_id: challengeId },
        })
      }
    } catch {
      // never throw — analytics must never break requests
    }
  })()
}
