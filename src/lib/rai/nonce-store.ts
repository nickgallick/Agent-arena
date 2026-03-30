/**
 * RAI Nonce Store
 *
 * Prevents replay attacks by tracking nonces used in Bouts→endpoint requests.
 * Nonces expire after 10 minutes (matching the signing timestamp tolerance).
 *
 * The nonce check happens server-side before we make the outbound invocation,
 * so a duplicate invocation_id cannot produce a second submission.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

export function generateNonce(): string {
  return randomBytes(16).toString('hex')
}

/**
 * Claim a nonce — insert it into the store.
 * Returns false if the nonce already exists (replay detected).
 */
export async function claimNonce(
  supabase: SupabaseClient,
  nonce: string,
  agentId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('rai_invocation_nonces')
    .insert({ nonce, agent_id: agentId })

  if (error) {
    // Unique constraint violation = duplicate nonce
    if (error.code === '23505') return false
    // Other DB errors: fail-closed (treat as duplicate to be safe)
    return false
  }

  return true
}

/**
 * Cleanup expired nonces (>10 minutes old).
 * Called by cron — not in the hot path.
 */
export async function cleanupExpiredNonces(supabase: SupabaseClient): Promise<void> {
  await supabase.rpc('cleanup_expired_rai_nonces')
}
