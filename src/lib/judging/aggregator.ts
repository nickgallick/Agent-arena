import type { SupabaseClient } from '@supabase/supabase-js'
import type { VersionSnapshot } from '@/lib/submissions/version-snapshot'

export interface AggregationResult {
  final_score: number
  pre_audit_score?: number
  post_audit_score?: number
  result_state: 'clean' | 'audited' | 'flagged' | 'disputed' | 'failed' | 'invalidated' | 'exploit_penalized'
  confidence_level: 'low' | 'medium' | 'high'
  audit_triggered: boolean
  audit_reason?: string
  dispute_delta?: number
  lane_subscores: Record<string, { raw: number; weighted: number; weight: number }>
}

const EXPLOIT_PATTERNS = [
  'exploit',
  'bypass',
  'injection',
  'overflow',
  'unauthorized_access',
  'privilege_escalation',
  'sandbox_escape',
]

export async function aggregate(
  supabase: SupabaseClient,
  opts: {
    judge_run_id: string
    lane_scores: Record<string, number>
    judge_weights: { objective: number; process: number; strategy: number; integrity: number }
    audit_result?: { score: number; reason: string }
    integrity_flags: string[]
    version_snapshot: VersionSnapshot
  }
): Promise<AggregationResult> {
  const { judge_run_id, lane_scores, judge_weights, audit_result, integrity_flags, version_snapshot } = opts

  // Check for exploit flags
  const hasExploitFlag = integrity_flags.some(flag =>
    EXPLOIT_PATTERNS.some(pattern => flag.toLowerCase().includes(pattern))
  )

  // Compute weighted score from primary lanes
  const primaryLanes: Array<keyof typeof judge_weights> = ['objective', 'process', 'strategy', 'integrity']
  let totalWeight = 0
  let weightedSum = 0
  const lane_subscores: Record<string, { raw: number; weighted: number; weight: number }> = {}

  for (const lane of primaryLanes) {
    const raw = lane_scores[lane] ?? 0
    const weight = judge_weights[lane]
    const weighted = (raw * weight) / 100
    weightedSum += weighted
    totalWeight += weight
    lane_subscores[lane] = { raw, weighted, weight }
  }

  // Normalize if weights don't sum to 100
  const pre_audit_score = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : weightedSum

  // Determine confidence based on score spread
  const primaryScores = primaryLanes.map(l => lane_scores[l] ?? 0)
  const scoreSpread = Math.max(...primaryScores) - Math.min(...primaryScores)
  let confidence_level: 'low' | 'medium' | 'high'
  if (scoreSpread <= 20) {
    confidence_level = 'high'
  } else if (scoreSpread <= 35) {
    confidence_level = 'medium'
  } else {
    confidence_level = 'low'
  }

  // Determine result state and final score
  let result_state: AggregationResult['result_state'] = 'clean'
  let final_score = pre_audit_score
  let post_audit_score: number | undefined
  let dispute_delta: number | undefined
  let audit_triggered = false
  let audit_reason: string | undefined

  if (hasExploitFlag) {
    result_state = 'exploit_penalized'
    final_score = Math.max(0, pre_audit_score * 0.5) // 50% penalty for exploit
    lane_subscores['exploit_penalty'] = { raw: -50, weighted: -(pre_audit_score * 0.5), weight: 0 }
  } else if (audit_result) {
    audit_triggered = true
    audit_reason = audit_result.reason

    // Include audit lane score if provided
    if (lane_scores['audit'] !== undefined) {
      lane_subscores['audit'] = {
        raw: lane_scores['audit'],
        weighted: lane_scores['audit'],
        weight: 0, // audit is a modifier, not weighted
      }
    }

    // Post-audit score: weighted average of primary and audit
    post_audit_score = (pre_audit_score + audit_result.score) / 2
    dispute_delta = post_audit_score - pre_audit_score
    final_score = post_audit_score
    result_state = 'audited'
  }

  return {
    final_score: Math.round(final_score * 100) / 100,
    pre_audit_score: Math.round(pre_audit_score * 100) / 100,
    post_audit_score: post_audit_score !== undefined ? Math.round(post_audit_score * 100) / 100 : undefined,
    result_state,
    confidence_level,
    audit_triggered,
    audit_reason,
    dispute_delta: dispute_delta !== undefined ? Math.round(dispute_delta * 100) / 100 : undefined,
    lane_subscores,
  }
}
