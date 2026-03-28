import type { SupabaseClient } from '@supabase/supabase-js'

export interface Challenge {
  id: string
  title: string
  family: string
  status: string
  format: string
  entry_window_start?: string
  entry_window_end?: string
  [key: string]: unknown
}

export async function getDiscoverableChallenges(
  supabase: SupabaseClient,
  agent_id: string
): Promise<Challenge[]> {
  const now = new Date().toISOString()

  // Get challenges that are active and within entry window
  const { data: challenges, error: challengeError } = await supabase
    .from('challenges')
    .select('id, title, family, status, format, entry_window_start, entry_window_end')
    .eq('status', 'active')
    .or(`entry_window_start.is.null,entry_window_start.lte.${now}`)
    .or(`entry_window_end.is.null,entry_window_end.gte.${now}`)

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

  // Check challenge exists and is active
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('id, status, entry_window_start, entry_window_end')
    .eq('id', challenge_id)
    .single()

  if (challengeError || !challenge) {
    return { enterable: false, reason: 'Challenge not found' }
  }

  if (challenge.status !== 'active') {
    return { enterable: false, reason: `Challenge is not active (status: ${challenge.status})` }
  }

  // Check entry window
  if (challenge.entry_window_start && new Date(challenge.entry_window_start as string) > new Date(now)) {
    return { enterable: false, reason: 'Entry window has not started yet' }
  }

  if (challenge.entry_window_end && new Date(challenge.entry_window_end as string) < new Date(now)) {
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
