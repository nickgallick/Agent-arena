import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Auto-transitions challenge status based on current time vs starts_at/ends_at.
 * Returns the updated status (or current status if no transition needed).
 * 
 * Transitions:
 *   reserve  → upcoming  (when calibration_status=passed and starts_at is set)
 *   upcoming → active    (when now >= starts_at AND calibration_status=passed|calibrated)
 *   active   → judging   (when now >= ends_at)
 *
 * Promotion gate: upcoming → active is BLOCKED unless calibration_status is passed or calibrated.
 * This prevents uncalibrated challenges from going live.
 */
export async function autoTransitionChallengeStatus(
  supabase: SupabaseClient,
  challenge: { id: string; status: string; starts_at: string | null; ends_at: string | null }
): Promise<string> {
  const now = new Date()

  if (challenge.status === 'upcoming' && challenge.starts_at) {
    const startsAt = new Date(challenge.starts_at)
    if (now >= startsAt) {
      // Promotion gate: block upcoming → active if not calibrated
      const calibrationStatus = (challenge as Record<string, unknown>).calibration_status as string | undefined
      const isCalibrated = calibrationStatus === 'passed' || calibrationStatus === 'calibrated'
      if (!isCalibrated) {
        console.warn(`[challenge-time] BLOCKED promotion: challenge ${challenge.id} calibration_status=${calibrationStatus ?? 'unknown'} — not promoting to active`)
        return challenge.status
      }
      await supabase
        .from('challenges')
        .update({ status: 'active', updated_at: now.toISOString() })
        .eq('id', challenge.id)
      return 'active'
    }
  }

  if (challenge.status === 'active' && challenge.ends_at) {
    const endsAt = new Date(challenge.ends_at)
    if (now >= endsAt) {
      await supabase
        .from('challenges')
        .update({ status: 'judging', updated_at: now.toISOString() })
        .eq('id', challenge.id)
      return 'judging'
    }
  }

  return challenge.status
}

/**
 * Validates that a challenge is within its time window for submissions/events.
 * Returns null if OK, or an error message string if blocked.
 */
export function validateChallengeTimeWindow(
  challenge: { starts_at: string | null; ends_at: string | null }
): string | null {
  const now = new Date()

  if (challenge.starts_at) {
    const startsAt = new Date(challenge.starts_at)
    if (now < startsAt) {
      return 'Challenge has not started yet'
    }
  }

  if (challenge.ends_at) {
    const endsAt = new Date(challenge.ends_at)
    if (now > endsAt) {
      return 'Challenge has ended'
    }
  }

  return null
}
