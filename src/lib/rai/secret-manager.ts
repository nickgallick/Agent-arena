/**
 * RAI Secret Manager
 *
 * Manages per-agent endpoint secrets for Remote Agent Invocation.
 * - Plaintext stored in agent_rai_secrets (service-role only, RLS blocks JWT access)
 * - SHA-256 hash stored in agents.remote_endpoint_secret_hash (for display confirmation)
 * - Plaintext shown once on creation/rotation — never again
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { generateSecret, hashSecret } from './sign-request'

export interface SecretCreateResult {
  plaintextSecret: string
  secretHash: string
}

/**
 * Create or replace secrets for an agent's endpoint.
 * Returns plaintext — caller must show it once and discard.
 */
export async function createEndpointSecret(
  supabase: SupabaseClient,
  agentId: string,
  environment: 'production' | 'sandbox'
): Promise<SecretCreateResult> {
  const plaintext = generateSecret()
  const hash = hashSecret(plaintext)

  // Upsert into secret vault
  const updateField = environment === 'production' ? 'production_secret' : 'sandbox_secret'
  const { error } = await supabase
    .from('agent_rai_secrets')
    .upsert(
      {
        agent_id: agentId,
        [updateField]: plaintext,
        rotated_at: new Date().toISOString(),
      },
      { onConflict: 'agent_id' }
    )

  if (error) {
    throw new Error(`Failed to store endpoint secret: ${error.message}`)
  }

  // Update hash on agents table for display confirmation
  const hashColumn =
    environment === 'production'
      ? 'remote_endpoint_secret_hash'
      : 'sandbox_endpoint_secret_hash'

  const { error: agentError } = await supabase
    .from('agents')
    .update({
      [hashColumn]: hash,
      ...(environment === 'production' ? { remote_endpoint_configured_at: new Date().toISOString() } : {}),
    })
    .eq('id', agentId)

  if (agentError) {
    throw new Error(`Failed to update agent secret hash: ${agentError.message}`)
  }

  return { plaintextSecret: plaintext, secretHash: hash }
}

/**
 * Retrieve plaintext secret for signing an outbound request.
 * ONLY called server-side with service role client.
 */
export async function getEndpointSecret(
  supabase: SupabaseClient,
  agentId: string,
  environment: 'production' | 'sandbox'
): Promise<string | null> {
  const { data, error } = await supabase
    .from('agent_rai_secrets')
    .select('production_secret, sandbox_secret')
    .eq('agent_id', agentId)
    .single()

  if (error || !data) return null

  return environment === 'production' ? data.production_secret : (data.sandbox_secret ?? null)
}

/**
 * Rotate a secret — invalidates old one immediately.
 * Returns new plaintext for one-time display.
 */
export async function rotateEndpointSecret(
  supabase: SupabaseClient,
  agentId: string,
  environment: 'production' | 'sandbox'
): Promise<SecretCreateResult> {
  return createEndpointSecret(supabase, agentId, environment)
}

/**
 * Delete secrets for an agent (on endpoint removal).
 */
export async function deleteEndpointSecrets(
  supabase: SupabaseClient,
  agentId: string,
  environment: 'production' | 'sandbox'
): Promise<void> {
  const updateField = environment === 'production' ? 'production_secret' : 'sandbox_secret'
  const hashColumn =
    environment === 'production'
      ? 'remote_endpoint_secret_hash'
      : 'sandbox_endpoint_secret_hash'

  await supabase
    .from('agent_rai_secrets')
    .update({ [updateField]: null })
    .eq('agent_id', agentId)

  await supabase
    .from('agents')
    .update({ [hashColumn]: null })
    .eq('id', agentId)
}
