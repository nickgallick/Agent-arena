import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ObjectiveResults {
  pass_count: number
  fail_count: number
  visible_pass_count: number
  visible_fail_count: number
  hidden_pass_count: number
  hidden_fail_count: number
  raw_score: number
  build_output?: string
}

export interface EvidencePackage {
  lane: 'objective' | 'process' | 'strategy' | 'integrity' | 'audit'
  content: Record<string, unknown>
  content_hash: string
  allowed_fields: string[]
  forbidden_fields_excluded: string[]
}

// Lane isolation definitions
const LANE_ALLOWED_FIELDS: Record<string, string[]> = {
  objective: ['submission_content', 'visible_test_config', 'build_output'],
  process: ['submission_content', 'tool_use_telemetry', 'file_touch_sequence', 'timing_signals'],
  strategy: ['submission_content', 'reasoning_outputs', 'plan_artifacts'],
  integrity: ['submission_content', 'sandbox_logs', 'constraint_violations', 'claims_vs_reality'],
  audit: ['objective_completion_summary', 'disagreement_description', 'integrity_anomaly_flags'],
}

const LANE_FORBIDDEN_FIELDS: Record<string, string[]> = {
  objective: ['expected_outputs', 'hidden_test_answers', 'judge_rationale', 'other_lane_scores'],
  process: ['test_answers', 'expected_outputs', 'judge_rationale', 'other_lane_scores'],
  strategy: ['test_answers', 'expected_outputs', 'judge_rationale', 'other_lane_scores'],
  integrity: ['test_answers', 'expected_outputs', 'judge_rationale', 'other_lane_scores'],
  audit: ['raw_lane_scores', 'answer_keys', 'specific_test_outputs', 'judge_rationale_full'],
}

export async function buildEvidencePackage(
  supabase: SupabaseClient,
  opts: {
    submission_id: string
    judge_run_id: string
    lane: 'objective' | 'process' | 'strategy' | 'integrity' | 'audit'
    objective_results?: ObjectiveResults
    submission_content: string
  }
): Promise<EvidencePackage> {
  const { submission_id, judge_run_id, lane, objective_results, submission_content } = opts

  const allowed_fields = LANE_ALLOWED_FIELDS[lane] ?? []
  const forbidden_fields_excluded = LANE_FORBIDDEN_FIELDS[lane] ?? []

  const content = buildLaneContent(lane, submission_content, objective_results)
  const content_hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(content))
    .digest('hex')

  const pkg: EvidencePackage = {
    lane,
    content,
    content_hash,
    allowed_fields,
    forbidden_fields_excluded,
  }

  // Store in judge_lane_artifacts
  const { error } = await supabase.from('judge_lane_artifacts').upsert({
    judge_run_id,
    lane,
    artifact_type: 'evidence_package',
    content: pkg as unknown as Record<string, unknown>,
    content_hash,
  }, { onConflict: 'judge_run_id,lane,artifact_type' })

  if (error) {
    throw new Error(`Failed to store evidence package for lane ${lane}: ${error.message}`)
  }

  return pkg
}

function buildLaneContent(
  lane: string,
  submission_content: string,
  objective_results?: ObjectiveResults
): Record<string, unknown> {
  switch (lane) {
    case 'objective':
      return {
        submission_content,
        visible_test_config: { description: 'Visible test configuration (no answers)' },
        build_output: objective_results?.build_output ?? null,
      }

    case 'process':
      return {
        submission_content,
        tool_use_telemetry: null,
        file_touch_sequence: null,
        timing_signals: null,
      }

    case 'strategy':
      return {
        submission_content,
        reasoning_outputs: null,
        plan_artifacts: null,
      }

    case 'integrity':
      return {
        submission_content,
        sandbox_logs: null,
        constraint_violations: null,
        claims_vs_reality: null,
      }

    case 'audit':
      // STRICT: only bounded summaries, no raw scores, no answer keys
      return {
        objective_completion_summary: objective_results
          ? {
              visible_pass_rate: objective_results.visible_pass_count / Math.max(1, objective_results.visible_pass_count + objective_results.visible_fail_count),
              hidden_pass_rate: objective_results.hidden_pass_count / Math.max(1, objective_results.hidden_pass_count + objective_results.hidden_fail_count),
              total_pass_rate: objective_results.pass_count / Math.max(1, objective_results.pass_count + objective_results.fail_count),
            }
          : null,
        disagreement_description: null,
        integrity_anomaly_flags: [],
      }

    default:
      return { submission_content }
  }
}
