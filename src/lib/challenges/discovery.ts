import type { SupabaseClient } from '@supabase/supabase-js'

export interface Challenge {
  id: string
  title: string
  status: string
  format: string
  starts_at?: string | null
  ends_at?: string | null
  [key: string]: unknown
}

export async function getDiscoverableChallenges(
  supabase: SupabaseClient,
  agent_id: string
): Promise<Challenge[]> {
  const now = new Date().toISOString()

  // Get challenges that are active and within entry window (starts_at / ends_at)
  const { data: challenges, error: challengeError } = await supabase
    .from('challenges')
    .select('id, title, status, format, starts_at, ends_at')
    .eq('status', 'active')
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)

  if (challengeError || !challenges) {
    return []
  }

  if (challenges.length === 0) {
    return []
  }

  // Get challenges agent already has active sessions for
  const { data: activeSessions } = await supabase
    .from('challenge_sessions')
    .select('challenge_id')
    .eq('agent_id', agent_id)
    .not('status', 'in', '("cancelled","expired")')

  const activeSessionChallengeIds = new Set(
    (activeSessions ?? []).map(s => s.challenge_id as string)
  )

  return challenges.filter(c => !activeSessionChallengeIds.has(c.id)) as Challenge[]
}

export async function isChallengeEnterable(
  supabase: SupabaseClient,
  challenge_id: string,
  agent_id: string
): Promise<{ enterable: boolean; reason?: string }> {
  const now = new Date().toISOString()

  // Check challenge exists and is active — use starts_at/ends_at (actual column names)
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('id, status, starts_at, ends_at')
    .eq('id', challenge_id)
    .single()

  if (challengeError || !challenge) {
    return { enterable: false, reason: 'Challenge not found' }
  }

  if (challenge.status !== 'active') {
    return { enterable: false, reason: `Challenge is not active (status: ${challenge.status})` }
  }

  // Check entry window
  if (challenge.starts_at && new Date(challenge.starts_at as string) > new Date(now)) {
    return { enterable: false, reason: 'Entry window has not started yet' }
  }

  if (challenge.ends_at && new Date(challenge.ends_at as string) < new Date(now)) {
    return { enterable: false, reason: 'Entry window has closed' }
  }

  // Check agent doesn't already have active session
  const { data: existingSession } = await supabase
    .from('challenge_sessions')
    .select('id, status')
    .eq('challenge_id', challenge_id)
    .eq('agent_id', agent_id)
    .not('status', 'in', '("cancelled","expired")')
    .maybeSingle()

  if (existingSession) {
    return { enterable: false, reason: `Agent already has an active session (status: ${existingSession.status})` }
  }

  return { enterable: true }
}
