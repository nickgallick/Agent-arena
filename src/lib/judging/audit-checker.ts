import type { SupabaseClient } from '@supabase/supabase-js'

interface AuditTriggerRule {
  id: string
  rule_name: string
  rule_type: string
  params: Record<string, unknown>
  applies_to_formats: string[]
  priority: number
}

export async function shouldTriggerAudit(
  supabase: SupabaseClient,
  opts: {
    lane_scores: Record<string, number>
    challenge_id: string
    has_prize: boolean
    prize_pool_cents?: number
  }
): Promise<{ trigger: boolean; reason?: string; rule_name?: string }> {
  const { lane_scores, has_prize, prize_pool_cents } = opts

  const { data: rules, error } = await supabase
    .from('audit_trigger_rules')
    .select('id, rule_name, rule_type, params, applies_to_formats, priority')
    .eq('enabled', true)
    .order('priority', { ascending: true })

  if (error || !rules) {
    // Conservative: if we can't read rules, don't trigger audit
    return { trigger: false }
  }

  for (const rule of rules as AuditTriggerRule[]) {
    const result = evaluateRule(rule, lane_scores, has_prize, prize_pool_cents)
    if (result.triggered) {
      return { trigger: true, reason: result.reason, rule_name: rule.rule_name }
    }
  }

  return { trigger: false }
}

function evaluateRule(
  rule: AuditTriggerRule,
  lane_scores: Record<string, number>,
  has_prize: boolean,
  prize_pool_cents?: number
): { triggered: boolean; reason?: string } {
  const params = rule.params

  switch (rule.rule_type) {
    case 'divergence_threshold': {
      const lanes = params.lanes as string[] | undefined
      const threshold = params.threshold as number | undefined
      const requires_objective_below = params.requires_objective_below as number | undefined

      if (!lanes || threshold === undefined) return { triggered: false }

      const scores = lanes.map(l => lane_scores[l]).filter(s => s !== undefined)
      if (scores.length < 2) return { triggered: false }

      const spread = Math.max(...scores) - Math.min(...scores)
      if (spread < threshold) return { triggered: false }

      // Optional: requires objective score below threshold
      if (requires_objective_below !== undefined) {
        const objectiveScore = lane_scores['objective']
        if (objectiveScore === undefined || objectiveScore >= requires_objective_below) {
          return { triggered: false }
        }
      }

      return {
        triggered: true,
        reason: `Lane divergence of ${spread.toFixed(1)}pts between ${lanes.join('/')} exceeds threshold ${threshold}`,
      }
    }

    case 'score_anomaly': {
      const min_final_score = params.min_final_score as number | undefined
      const max_integrity_score = params.max_integrity_score as number | undefined

      if (min_final_score === undefined || max_integrity_score === undefined) {
        return { triggered: false }
      }

      // Compute simple average as proxy for final score
      const scoreValues = Object.values(lane_scores).filter(s => s !== undefined && s !== null)
      if (scoreValues.length === 0) return { triggered: false }
      const avg = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length

      const integrityScore = lane_scores['integrity']

      if (avg >= min_final_score && integrityScore !== undefined && integrityScore <= max_integrity_score) {
        return {
          triggered: true,
          reason: `High overall score (${avg.toFixed(1)}) with low integrity score (${integrityScore.toFixed(1)}) — anomaly flagged`,
        }
      }
      return { triggered: false }
    }

    case 'prize_override': {
      const min_prize_pool_cents = params.min_prize_pool_cents as number | undefined
      if (!has_prize || min_prize_pool_cents === undefined) return { triggered: false }
      if ((prize_pool_cents ?? 0) >= min_prize_pool_cents) {
        return {
          triggered: true,
          reason: `Prize challenge with pool >= ${min_prize_pool_cents} cents requires audit`,
        }
      }
      return { triggered: false }
    }

    default:
      return { triggered: false }
  }
}
