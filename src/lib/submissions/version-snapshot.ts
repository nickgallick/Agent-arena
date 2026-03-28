import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface VersionSnapshot {
  challenge_id: string
  challenge_content_hash: string | null
  challenge_content_version: number
  judging_config_version: string | null
  prompt_version_ids: Record<string, string>
  audit_rules_version: string
  snapshot_taken_at: string
}

export async function captureVersionSnapshot(
  supabase: SupabaseClient,
  challenge_id: string
): Promise<VersionSnapshot> {
  const [challengeResult, rulesResult] = await Promise.all([
    supabase
      .from('challenges')
      .select('id, content_hash, content_version, judging_config')
      .eq('id', challenge_id)
      .single(),
    supabase
      .from('audit_trigger_rules')
      .select('id, rule_name, rule_type, params, priority, updated_at')
      .eq('enabled', true)
      .order('priority', { ascending: true }),
  ])

  const challenge = challengeResult.data
  const rules = rulesResult.data ?? []

  // Hash judging_config if present
  let judging_config_version: string | null = null
  if (challenge?.judging_config) {
    judging_config_version = crypto
      .createHash('sha256')
      .update(JSON.stringify(challenge.judging_config))
      .digest('hex')
  }

  // Extract prompt_version_ids from judging_config
  const prompt_version_ids: Record<string, string> = {}
  if (challenge?.judging_config && typeof challenge.judging_config === 'object') {
    const cfg = challenge.judging_config as Record<string, unknown>
    if (cfg.prompt_version_ids && typeof cfg.prompt_version_ids === 'object') {
      const pvids = cfg.prompt_version_ids as Record<string, unknown>
      for (const [lane, vid] of Object.entries(pvids)) {
        if (typeof vid === 'string') {
          prompt_version_ids[lane] = vid
        }
      }
    }
  }

  // Hash the active audit rules (deterministic)
  const rulesHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(rules))
    .digest('hex')

  return {
    challenge_id,
    challenge_content_hash: challenge?.content_hash ?? null,
    challenge_content_version: challenge?.content_version ?? 1,
    judging_config_version,
    prompt_version_ids,
    audit_rules_version: rulesHash,
    snapshot_taken_at: new Date().toISOString(),
  }
}
