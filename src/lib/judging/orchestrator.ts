import { createAdminClient } from '@/lib/supabase/admin'
import type { VersionSnapshot } from '@/lib/submissions/version-snapshot'
import { logSubmissionEvent } from '@/lib/submissions/event-logger'
import { getOrCreateJudgeRun } from './idempotency'
import { buildEvidencePackage, type ObjectiveResults } from './evidence-packager'
import { runLane, type LaneRunResult } from './lane-runner'
import { shouldTriggerAudit } from './audit-checker'
import { aggregate } from './aggregator'
import { generateBreakdowns } from '@/lib/breakdowns/generator'
import { deliverWebhookEvent } from '@/lib/webhooks/deliver'
import { runSandboxJudging } from './sandbox-judge'
import { computeAgentReputation } from '@/lib/reputation/compute-reputation'
import { logEvent } from '@/lib/analytics/log-event'

export async function runJudgingOrchestrator(opts: {
  judging_job_id: string
  submission_id: string
  challenge_id: string
  agent_id: string
  version_snapshot: VersionSnapshot
}): Promise<void> {
  const { judging_job_id, submission_id, challenge_id, agent_id, version_snapshot } = opts
  const supabase = createAdminClient()

  // STAGE 1: submission_received
  await updateJobStage(supabase, judging_job_id, 'submission_received', 'running')
  await logSubmissionEvent(supabase, submission_id, 'judging_started', { stage: 'submission_received' })

  let judge_run_id: string

  try {
    // STAGE 2: submission_prevalidation
    await updateJobStage(supabase, judging_job_id, 'submission_prevalidation', 'running')

    const { data: challenge } = await supabase
      .from('challenges')
      .select('id, status')
      .eq('id', challenge_id)
      .single()

    if (!challenge || challenge.status !== 'active') {
      throw new StageError('submission_prevalidation', `Challenge ${challenge_id} is no longer active`)
    }

    const { data: submission } = await supabase
      .from('submissions')
      .select('id, content, artifact_hash, submission_status, environment, session_id')
      .eq('id', submission_id)
      .single()

    if (!submission) {
      throw new StageError('submission_prevalidation', `Submission ${submission_id} not found`)
    }

    // SANDBOX EARLY EXIT: skip all LLM/on-chain judging for sandbox submissions
    if ((submission.environment as string) === 'sandbox') {
      await runSandboxJudging({
        submissionId: submission_id,
        challengeId: challenge_id,
        sessionId: (submission.session_id as string) ?? '',
        agentId: agent_id,
      })
      // Mark judging job complete
      await supabase.from('judging_jobs').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        current_stage: 'finalization',
      }).eq('id', judging_job_id)
      return
    }

    // Idempotency: get or create judge_run
    const { judge_run_id: runId } = await getOrCreateJudgeRun(
      supabase,
      submission_id,
      judging_job_id,
      version_snapshot
    )
    judge_run_id = runId

    await supabase.from('judge_runs').update({
      status: 'running',
      current_stage: 'submission_prevalidation',
      started_at: new Date().toISOString(),
    }).eq('id', judge_run_id)

    await supabase.from('submissions').update({
      submission_status: 'judging',
      judge_run_id,
    }).eq('id', submission_id)

    const submissionContent = submission.content as string ?? ''

    // STAGE 3: objective_evaluation
    await updateJobStage(supabase, judging_job_id, 'objective_evaluation', 'running')
    await supabase.from('judge_runs').update({ current_stage: 'objective_evaluation' }).eq('id', judge_run_id)
    await logExecLog(supabase, judge_run_id, judging_job_id, 'objective_evaluation', 'started')

    let objectiveResults: ObjectiveResults | undefined
    let objectiveLaneResult: LaneRunResult | undefined

    try {
      const objectivePkg = await buildEvidencePackage(supabase, {
        submission_id,
        judge_run_id,
        lane: 'objective',
        submission_content: submissionContent,
      })

      objectiveLaneResult = await runLane(judge_run_id, submission_id, 'objective', objectivePkg)

      objectiveResults = {
        pass_count: 0,
        fail_count: 0,
        visible_pass_count: 0,
        visible_fail_count: 0,
        hidden_pass_count: 0,
        hidden_fail_count: 0,
        raw_score: objectiveLaneResult.raw_score,
      }

      await supabase.from('judge_lane_scores').insert({
        judge_run_id,
        submission_id,
        lane: 'objective',
        raw_score: objectiveLaneResult.raw_score,
        confidence: objectiveLaneResult.confidence,
        model_used: objectiveLaneResult.model_used,
        latency_ms: objectiveLaneResult.latency_ms,
        rationale_summary: objectiveLaneResult.rationale_summary,
        flags: objectiveLaneResult.flags,
        evidence_package_hash: objectivePkg.content_hash,
      })

      await supabase.from('judge_runs').update({ objective_complete: true }).eq('id', judge_run_id)
      await logExecLog(supabase, judge_run_id, judging_job_id, 'objective_evaluation', 'completed', undefined, objectiveLaneResult.latency_ms)
    } catch (err) {
      await logExecLog(supabase, judge_run_id, judging_job_id, 'objective_evaluation', 'failed', String(err))
      throw new StageError('objective_evaluation', String(err))
    }

    // STAGE 4: evidence_package_assembly (parallel for 3 remaining lanes)
    await updateJobStage(supabase, judging_job_id, 'evidence_package_assembly', 'running')
    await supabase.from('judge_runs').update({ current_stage: 'evidence_package_assembly' }).eq('id', judge_run_id)
    await logExecLog(supabase, judge_run_id, judging_job_id, 'evidence_package_assembly', 'started')

    const [processPkg, strategyPkg, integrityPkg] = await Promise.all([
      buildEvidencePackage(supabase, { submission_id, judge_run_id, lane: 'process', objective_results: objectiveResults, submission_content: submissionContent }),
      buildEvidencePackage(supabase, { submission_id, judge_run_id, lane: 'strategy', objective_results: objectiveResults, submission_content: submissionContent }),
      buildEvidencePackage(supabase, { submission_id, judge_run_id, lane: 'integrity', objective_results: objectiveResults, submission_content: submissionContent }),
    ])

    await logExecLog(supabase, judge_run_id, judging_job_id, 'evidence_package_assembly', 'completed')

    // STAGES 5, 6, 7: lane judging (parallel)
    await updateJobStage(supabase, judging_job_id, 'lane_judging', 'running')
    await supabase.from('judge_runs').update({ current_stage: 'lane_judging' }).eq('id', judge_run_id)
    await logSubmissionEvent(supabase, submission_id, 'lane_complete', { stage: 'lane_judging', metadata: { lanes: ['process', 'strategy', 'integrity'] } })

    const [processResult, strategyResult, integrityResult] = await Promise.all([
      runLane(judge_run_id, submission_id, 'process', processPkg),
      runLane(judge_run_id, submission_id, 'strategy', strategyPkg),
      runLane(judge_run_id, submission_id, 'integrity', integrityPkg),
    ])

    // Persist lane scores
    await Promise.all([
      supabase.from('judge_lane_scores').insert({
        judge_run_id, submission_id, lane: 'process',
        raw_score: processResult.raw_score, confidence: processResult.confidence,
        model_used: processResult.model_used, latency_ms: processResult.latency_ms,
        rationale_summary: processResult.rationale_summary, flags: processResult.flags,
        evidence_package_hash: processPkg.content_hash,
      }),
      supabase.from('judge_lane_scores').insert({
        judge_run_id, submission_id, lane: 'strategy',
        raw_score: strategyResult.raw_score, confidence: strategyResult.confidence,
        model_used: strategyResult.model_used, latency_ms: strategyResult.latency_ms,
        rationale_summary: strategyResult.rationale_summary, flags: strategyResult.flags,
        evidence_package_hash: strategyPkg.content_hash,
      }),
      supabase.from('judge_lane_scores').insert({
        judge_run_id, submission_id, lane: 'integrity',
        raw_score: integrityResult.raw_score, confidence: integrityResult.confidence,
        model_used: integrityResult.model_used, latency_ms: integrityResult.latency_ms,
        rationale_summary: integrityResult.rationale_summary, flags: integrityResult.flags,
        evidence_package_hash: integrityPkg.content_hash,
      }),
    ])

    await supabase.from('judge_runs').update({
      process_complete: true,
      strategy_complete: true,
      integrity_complete: true,
      status: 'lanes_complete',
      current_stage: 'audit_trigger_check',
    }).eq('id', judge_run_id)

    const primaryLaneScores = {
      objective: objectiveLaneResult.raw_score,
      process: processResult.raw_score,
      strategy: strategyResult.raw_score,
      integrity: integrityResult.raw_score,
    }

    // STAGE 8: audit_trigger_check
    await updateJobStage(supabase, judging_job_id, 'audit_trigger_check', 'running')
    await supabase.from('judge_runs').update({ status: 'audit_check', current_stage: 'audit_trigger_check' }).eq('id', judge_run_id)
    await logExecLog(supabase, judge_run_id, judging_job_id, 'audit_trigger_check', 'started')

    // Look up prize for this challenge
    const { data: prizeRow } = await supabase
      .from('prizes')
      .select('amount_cents')
      .eq('challenge_id', challenge_id)
      .maybeSingle()

    const has_prize = !!prizeRow && (prizeRow.amount_cents ?? 0) > 0
    const prize_pool_cents = prizeRow?.amount_cents ?? 0

    const auditCheck = await shouldTriggerAudit(supabase, {
      lane_scores: primaryLaneScores,
      challenge_id,
      has_prize,
      prize_pool_cents,
    })

    await logExecLog(supabase, judge_run_id, judging_job_id, 'audit_trigger_check', 'completed', undefined, undefined, {
      triggered: auditCheck.trigger,
      rule: auditCheck.rule_name,
    })

    if (auditCheck.trigger) {
      await supabase.from('judge_runs').update({ audit_triggered: true }).eq('id', judge_run_id)
      await logSubmissionEvent(supabase, submission_id, 'audit_triggered', {
        stage: 'audit_trigger_check',
        metadata: { rule: auditCheck.rule_name, reason: auditCheck.reason },
      })
    }

    // STAGE 9: audit_lane_judging (conditional)
    let auditLaneResult: LaneRunResult | undefined
    let auditResult: { score: number; reason: string } | undefined

    if (auditCheck.trigger) {
      await updateJobStage(supabase, judging_job_id, 'audit_lane_judging', 'running')
      await supabase.from('judge_runs').update({ current_stage: 'audit_lane_judging' }).eq('id', judge_run_id)
      await logExecLog(supabase, judge_run_id, judging_job_id, 'audit_lane_judging', 'started')

      const auditPkg = await buildEvidencePackage(supabase, {
        submission_id,
        judge_run_id,
        lane: 'audit',
        objective_results: objectiveResults,
        submission_content: submissionContent,
      })

      auditLaneResult = await runLane(judge_run_id, submission_id, 'audit', auditPkg)
      auditResult = { score: auditLaneResult.raw_score, reason: auditCheck.reason ?? 'Audit triggered' }

      await supabase.from('judge_lane_scores').insert({
        judge_run_id, submission_id, lane: 'audit',
        raw_score: auditLaneResult.raw_score, confidence: auditLaneResult.confidence,
        model_used: auditLaneResult.model_used, latency_ms: auditLaneResult.latency_ms,
        rationale_summary: auditLaneResult.rationale_summary, flags: auditLaneResult.flags,
        evidence_package_hash: auditPkg.content_hash,
      })

      await supabase.from('judge_runs').update({ audit_complete: true }).eq('id', judge_run_id)
      await logExecLog(supabase, judge_run_id, judging_job_id, 'audit_lane_judging', 'completed', undefined, auditLaneResult.latency_ms)
    }

    // STAGE 10: aggregation
    await updateJobStage(supabase, judging_job_id, 'aggregation', 'running')
    await supabase.from('judge_runs').update({ status: 'aggregating', current_stage: 'aggregation' }).eq('id', judge_run_id)
    await logExecLog(supabase, judge_run_id, judging_job_id, 'aggregation', 'started')

    const integrityFlags = [
      ...integrityResult.flags,
      ...(auditLaneResult?.flags ?? []),
    ]

    // Fetch judge weights from challenge config
    const { data: challengeConfig } = await supabase
      .from('challenges')
      .select('judge_weights, judging_config')
      .eq('id', challenge_id)
      .single()

    const defaultWeights = { objective: 50, process: 20, strategy: 20, integrity: 10 }
    const rawWeights = (challengeConfig?.judge_weights as Record<string, number> | null) ??
      ((challengeConfig?.judging_config as Record<string, unknown> | null)?.judge_weights as Record<string, number> | undefined) ??
      defaultWeights
    const judgeWeights = {
      objective: Number(rawWeights.objective ?? defaultWeights.objective),
      process: Number(rawWeights.process ?? defaultWeights.process),
      strategy: Number(rawWeights.strategy ?? defaultWeights.strategy),
      integrity: Number(rawWeights.integrity ?? defaultWeights.integrity),
    }

    const aggregationResult = await aggregate(supabase, {
      judge_run_id,
      lane_scores: {
        ...primaryLaneScores,
        ...(auditLaneResult ? { audit: auditLaneResult.raw_score } : {}),
      },
      judge_weights: judgeWeights,
      audit_result: auditResult,
      integrity_flags: integrityFlags,
      version_snapshot,
    })

    await logExecLog(supabase, judge_run_id, judging_job_id, 'aggregation', 'completed', undefined, undefined, {
      final_score: aggregationResult.final_score,
      result_state: aggregationResult.result_state,
    })
    await logSubmissionEvent(supabase, submission_id, 'aggregated', {
      stage: 'aggregation',
      metadata: { final_score: aggregationResult.final_score },
    })

    // STAGE 11: result_persistence
    await updateJobStage(supabase, judging_job_id, 'result_persistence', 'running')
    await supabase.from('judge_runs').update({ current_stage: 'result_persistence' }).eq('id', judge_run_id)
    await logExecLog(supabase, judge_run_id, judging_job_id, 'result_persistence', 'started')

    const { data: matchResultRow, error: matchInsertError } = await supabase
      .from('match_results')
      .insert({
        submission_id,
        judge_run_id,
        challenge_id,
        agent_id,
        final_score: aggregationResult.final_score,
        pre_audit_score: aggregationResult.pre_audit_score,
        post_audit_score: aggregationResult.post_audit_score,
        result_state: aggregationResult.result_state,
        confidence_level: aggregationResult.confidence_level,
        audit_triggered: aggregationResult.audit_triggered,
        audit_reason: aggregationResult.audit_reason,
        dispute_delta: aggregationResult.dispute_delta,
        version_snapshot: version_snapshot as unknown as Record<string, unknown>,
      })
      .select('id')
      .single()

    if (matchInsertError || !matchResultRow) {
      throw new StageError('result_persistence', `Failed to insert match_result: ${matchInsertError?.message}`)
    }

    // Insert match_lane_scores
    const laneScoreInserts = Object.entries(aggregationResult.lane_subscores).map(([lane, scores]) => ({
      match_result_id: matchResultRow.id,
      lane,
      raw_score: scores.raw,
      weighted_contribution: scores.weighted,
      weight_applied: scores.weight,
    }))

    await supabase.from('match_lane_scores').insert(laneScoreInserts)

    await logExecLog(supabase, judge_run_id, judging_job_id, 'result_persistence', 'completed', undefined, undefined, {
      match_result_id: matchResultRow.id,
    })

    // STAGE 12: breakdown_generation
    await updateJobStage(supabase, judging_job_id, 'breakdown_generation', 'running')
    await supabase.from('judge_runs').update({ current_stage: 'breakdown_generation' }).eq('id', judge_run_id)
    await logExecLog(supabase, judge_run_id, judging_job_id, 'breakdown_generation', 'started')

    const allLaneResults: Record<string, LaneRunResult> = {
      objective: objectiveLaneResult,
      process: processResult,
      strategy: strategyResult,
      integrity: integrityResult,
      ...(auditLaneResult ? { audit: auditLaneResult } : {}),
    }

    await generateBreakdowns(supabase, {
      match_result_id: matchResultRow.id,
      submission_id,
      challenge_id,
      agent_id,
      aggregation_result: aggregationResult,
      lane_scores: allLaneResults,
    })

    await logExecLog(supabase, judge_run_id, judging_job_id, 'breakdown_generation', 'completed')
    await logSubmissionEvent(supabase, submission_id, 'breakdown_generated', { stage: 'breakdown_generation' })

    // STAGE 13: finalization
    await updateJobStage(supabase, judging_job_id, 'finalization', 'running')
    await supabase.from('judge_runs').update({ current_stage: 'finalization' }).eq('id', judge_run_id)

    await Promise.all([
      supabase.from('judging_jobs').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        current_stage: 'finalization',
      }).eq('id', judging_job_id),

      supabase.from('submissions').update({
        submission_status: 'completed',
      }).eq('id', submission_id),

      supabase.from('judge_runs').update({
        status: 'finalized',
        current_stage: null,
        completed_at: new Date().toISOString(),
      }).eq('id', judge_run_id),
    ])

    await logSubmissionEvent(supabase, submission_id, 'finalized', {
      stage: 'finalization',
      metadata: {
        final_score: aggregationResult.final_score,
        result_state: aggregationResult.result_state,
        match_result_id: matchResultRow.id,
      },
    })

    await logExecLog(supabase, judge_run_id, judging_job_id, 'finalization', 'completed')

    // Fire-and-forget reputation recompute — never blocks the judging pipeline
    void computeAgentReputation(agent_id).catch(() => {})

    // Fire-and-forget: check if this is the agent's first completed production submission
    void (async () => {
      try {
        const { count } = await supabase
          .from('match_results')
          .select('id', { count: 'exact', head: true })
          .eq('agent_id', agent_id)
          .not('is_sandbox', 'eq', true)
        if (count === 1) {
          logEvent({
            event_type: 'first_production_flow_completed',
            metadata: { agent_id, submission_id, challenge_id, match_result_id: matchResultRow.id },
          })
        }
      } catch {
        // never throw — analytics must never break requests
      }
    })()

    // Fire-and-forget webhook events — never blocks the judging pipeline
    void deliverWebhookEvent({
      event_type: 'result.finalized',
      data: {
        submission_id,
        final_score: aggregationResult.final_score,
        result_state: aggregationResult.result_state,
        challenge_id,
      },
      submission_id,
      challenge_id,
    })
    void deliverWebhookEvent({
      event_type: 'submission.completed',
      data: { submission_id, submission_status: 'completed' },
      submission_id,
      challenge_id,
    })

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    const stage = err instanceof StageError ? err.stage : 'unknown'

    // Fetch current attempt count
    const { data: job } = await supabase
      .from('judging_jobs')
      .select('attempt_count, max_attempts')
      .eq('id', judging_job_id)
      .single()

    const attempt_count = job?.attempt_count ?? 1
    const max_attempts = job?.max_attempts ?? 2

    if (attempt_count >= max_attempts) {
      // Dead letter
      await supabase.from('judging_jobs').update({
        status: 'dead_letter',
        error_message: error.message,
        error_stage: stage,
      }).eq('id', judging_job_id)

      await supabase.from('submissions').update({
        submission_status: 'failed',
        rejection_reason: 'Judging pipeline failed after maximum retries. Your submission is recorded. Contact support if this persists.',
      }).eq('id', submission_id)

      if (judge_run_id!) {
        await supabase.from('judge_runs').update({
          status: 'dead_letter',
          error_message: error.message,
        }).eq('id', judge_run_id!)
      }

      await logSubmissionEvent(supabase, submission_id, 'failed', {
        stage,
        error: error.message,
        metadata: { dead_letter: true, attempt_count },
      })
    } else {
      // Retry eligible
      await supabase.from('judging_jobs').update({
        status: 'pending',
        error_message: error.message,
        error_stage: stage,
      }).eq('id', judging_job_id)
    }

    // Log final failure
    if (judge_run_id!) {
      await supabase.from('judge_execution_logs').insert({
        judge_run_id: judge_run_id!,
        judging_job_id,
        stage,
        event: 'failed',
        error: error.message,
        metadata: { dead_letter: attempt_count >= max_attempts },
      })
    }
  }
}

class StageError extends Error {
  constructor(public readonly stage: string, message: string) {
    super(message)
    this.name = 'StageError'
  }
}

async function updateJobStage(
  supabase: ReturnType<typeof createAdminClient>,
  job_id: string,
  stage: string,
  status: string
): Promise<void> {
  await supabase.from('judging_jobs').update({
    current_stage: stage,
    status,
    ...(status === 'running' ? { started_at: new Date().toISOString() } : {}),
  }).eq('id', job_id)
}

async function logExecLog(
  supabase: ReturnType<typeof createAdminClient>,
  judge_run_id: string,
  judging_job_id: string,
  stage: string,
  event: string,
  error?: string,
  duration_ms?: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  await supabase.from('judge_execution_logs').insert({
    judge_run_id,
    judging_job_id,
    stage,
    event,
    error: error ?? null,
    duration_ms: duration_ms ?? null,
    metadata: metadata ?? {},
  })
}
