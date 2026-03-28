import type { SupabaseClient } from '@supabase/supabase-js'
import { hashContent } from './artifact-store'

export interface ValidationResult {
  valid: boolean
  rejection_reason?: string
  session_id?: string
}

const MAX_CONTENT_BYTES = 100_000

export async function validateSubmission(
  supabase: SupabaseClient,
  opts: {
    challenge_id: string
    agent_id: string
    content: string
    session_id?: string
  }
): Promise<ValidationResult> {
  const { challenge_id, agent_id, content, session_id } = opts

  // 1. Challenge exists and status='active'
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('id, status')
    .eq('id', challenge_id)
    .single()

  if (challengeError || !challenge) {
    return { valid: false, rejection_reason: 'Challenge not found' }
  }
  if (challenge.status !== 'active') {
    return { valid: false, rejection_reason: `Challenge is not active (status: ${challenge.status})` }
  }

  // 2. Content length > 0 and < 100KB
  if (!content || content.length === 0) {
    return { valid: false, rejection_reason: 'Submission content is empty' }
  }
  const byteLength = Buffer.byteLength(content, 'utf8')
  if (byteLength > MAX_CONTENT_BYTES) {
    return { valid: false, rejection_reason: `Submission exceeds 100KB limit (${byteLength} bytes)` }
  }

  // 3. Session validation (if session_id provided)
  let resolved_session_id = session_id
  if (session_id) {
    const { data: session, error: sessionError } = await supabase
      .from('challenge_sessions')
      .select('id, status, expires_at')
      .eq('id', session_id)
      .eq('agent_id', agent_id)
      .eq('challenge_id', challenge_id)
      .single()

    if (sessionError || !session) {
      return { valid: false, rejection_reason: 'Session not found or does not belong to this agent' }
    }
    if (session.status !== 'open') {
      return { valid: false, rejection_reason: `Session is not open (status: ${session.status})` }
    }

    // 4. Session not expired
    if (session.expires_at && new Date(session.expires_at) < new Date()) {
      return { valid: false, rejection_reason: 'Session has expired' }
    }

    resolved_session_id = session.id
  }

  // 5. Duplicate check: same content SHA-256 for this agent + challenge
  const contentHash = hashContent(content)
  const { data: existing } = await supabase
    .from('submission_artifacts')
    .select('id, submission_id')
    .eq('content_hash', contentHash)
    .limit(1)

  if (existing && existing.length > 0) {
    // Check if any of these belong to this agent + challenge combo
    const { data: dupSubmission } = await supabase
      .from('submissions')
      .select('id')
      .eq('id', existing[0].submission_id)
      .eq('agent_id', agent_id)
      .eq('challenge_id', challenge_id)
      .limit(1)

    if (dupSubmission && dupSubmission.length > 0) {
      return { valid: false, rejection_reason: 'Duplicate submission: identical content already submitted for this challenge' }
    }
  }

  return { valid: true, session_id: resolved_session_id }
}
