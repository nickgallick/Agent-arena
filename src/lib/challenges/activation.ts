import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function activateChallenge(
  supabase: SupabaseClient,
  challenge_id: string,
  activated_by: string
): Promise<{ success: boolean; reason?: string }> {
  // Gate 1: challenge exists with valid pipeline_status
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('id, status, pipeline_status, calibration_status, prompt, judging_config, content_hash, content_version, family')
    .eq('id', challenge_id)
    .single()

  if (challengeError || !challenge) {
    return { success: false, reason: 'Challenge not found' }
  }

  const validPipelineStatuses = ['passed', 'passed_reserve', 'queued']
  if (!validPipelineStatuses.includes(challenge.pipeline_status as string)) {
    return { success: false, reason: `Pipeline status must be one of ${validPipelineStatuses.join(', ')} (current: ${challenge.pipeline_status})` }
  }

  // Gate 2: calibration_status='passed'
  if (challenge.calibration_status !== 'passed') {
    return { success: false, reason: `Calibration must be passed (current: ${challenge.calibration_status})` }
  }

  // Gate 3: prompt is non-empty
  if (!challenge.prompt || String(challenge.prompt).trim().length === 0) {
    return { success: false, reason: 'Challenge prompt is empty' }
  }

  // Gate 4: judging_config present and valid JSON
  if (!challenge.judging_config) {
    return { success: false, reason: 'judging_config is missing' }
  }
  try {
    if (typeof challenge.judging_config === 'string') {
      JSON.parse(challenge.judging_config)
    }
    // Already an object (JSONB) — valid
  } catch {
    return { success: false, reason: 'judging_config is not valid JSON' }
  }

  // Gate 5: content_hash matches challenge_activation_snapshots (if snapshot exists)
  if (challenge.content_hash) {
    const { data: snapshot } = await supabase
      .from('challenge_activation_snapshots')
      .select('content_hash')
      .eq('challenge_id', challenge_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (snapshot && snapshot.content_hash !== challenge.content_hash) {
      return { success: false, reason: 'Content hash mismatch — challenge content changed since last snapshot' }
    }
  }

  // Gate 6: at least 1 enabled audit_trigger_rule
  const { data: enabledRules, error: rulesError } = await supabase
    .from('audit_trigger_rules')
    .select('id')
    .eq('enabled', true)
    .limit(1)

  if (rulesError || !enabledRules || enabledRules.length === 0) {
    return { success: false, reason: 'No enabled audit trigger rules found — judging runtime not ready' }
  }

  // Gate 7: family cap — max 2 active per family
  if (challenge.family) {
    const { data: activeFamilyChallenges } = await supabase
      .from('challenges')
      .select('id')
      .eq('family', challenge.family)
      .eq('status', 'active')
      .neq('id', challenge_id)

    if (activeFamilyChallenges && activeFamilyChallenges.length >= 2) {
      return { success: false, reason: `Family cap reached — max 2 active challenges per family (family: ${challenge.family})` }
    }
  }

  // Compute content_hash if missing
  let contentHash = challenge.content_hash as string | null
  if (!contentHash) {
    const hashSource = JSON.stringify({
      prompt: challenge.prompt,
      judging_config: challenge.judging_config,
      content_version: challenge.content_version,
    })
    contentHash = crypto.createHash('sha256').update(hashSource).digest('hex')
  }

  // Atomic activation
  const { error: updateError } = await supabase
    .from('challenges')
    .update({
      status: 'active',
      pipeline_status: 'active',
      content_hash: contentHash,
    })
    .eq('id', challenge_id)

  if (updateError) {
    return { success: false, reason: `Failed to activate challenge: ${updateError.message}` }
  }

  // Log activation action (best-effort)
  await supabase
    .from('challenge_admin_actions')
    .insert({
      challenge_id,
      action: 'activate',
      performed_by: activated_by,
      metadata: { content_hash: contentHash },
    })
    .then() // fire and forget

  return { success: true }
}
