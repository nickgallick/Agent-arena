import type { SupabaseClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type InventoryDecision =
  | 'publish_now'
  | 'hold_reserve'
  | 'queue_for_later'
  | 'mutate_before_release'

export type InventoryAdvisory = {
  recommended_decision: InventoryDecision
  rationale: string[]
  active_pool_size: number
  reserve_pool_size: number
  family_active_count: number
  family_cap_reached: boolean
  sibling_overlap_detected: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Advisor
// ─────────────────────────────────────────────────────────────────────────────

export async function getInventoryAdvisory(
  supabase: SupabaseClient,
  challengeId: string
): Promise<InventoryAdvisory> {
  // Fetch the target challenge to get its family/type
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('id, challenge_type, category, content_hash')
    .eq('id', challengeId)
    .single()

  if (challengeError || !challenge) {
    throw new Error(`Challenge not found: ${challengeId}`)
  }

  // Count total active challenges
  const { count: activeCount, error: activeError } = await supabase
    .from('challenges')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')

  if (activeError) throw new Error('Failed to count active challenges')

  // Count reserve challenges (pipeline_status = 'passed_reserve')
  const { count: reserveCount, error: reserveError } = await supabase
    .from('challenges')
    .select('id', { count: 'exact', head: true })
    .eq('pipeline_status', 'passed_reserve')

  if (reserveError) throw new Error('Failed to count reserve challenges')

  // Count family active (same challenge_type)
  let familyActiveCount = 0
  if (challenge.challenge_type) {
    const { count: familyCount, error: familyError } = await supabase
      .from('challenges')
      .select('id', { count: 'exact', head: true })
      .eq('challenge_type', challenge.challenge_type)
      .eq('status', 'active')
      .neq('id', challengeId)

    if (familyError) throw new Error('Failed to count family active challenges')
    familyActiveCount = familyCount ?? 0
  }

  // Detect sibling overlap (same parent_bundle_id in bundles)
  let siblingOverlapDetected = false
  const { data: thisBundle } = await supabase
    .from('challenge_bundles')
    .select('parent_bundle_id')
    .eq('challenge_id', challengeId)
    .maybeSingle()

  if (thisBundle?.parent_bundle_id) {
    const { count: siblingCount } = await supabase
      .from('challenge_bundles')
      .select('id', { count: 'exact', head: true })
      .eq('parent_bundle_id', thisBundle.parent_bundle_id)
      .neq('challenge_id', challengeId)

    siblingOverlapDetected = (siblingCount ?? 0) > 0
  }

  const FAMILY_CAP = 2
  const MIN_ACTIVE_POOL = 3
  const familyCapReached = familyActiveCount >= FAMILY_CAP
  const activePollSize = activeCount ?? 0
  const reservePoolSize = reserveCount ?? 0

  // ── Decision logic ────────────────────────────────────────────────────────
  const rationale: string[] = []
  let recommended: InventoryDecision = 'hold_reserve'

  if (familyCapReached) {
    recommended = 'hold_reserve'
    rationale.push(
      `Family cap reached: ${familyActiveCount}/${FAMILY_CAP} active challenges of type "${challenge.challenge_type}"`
    )
  } else if (activePollSize < MIN_ACTIVE_POOL) {
    recommended = 'publish_now'
    rationale.push(
      `Active pool is below minimum (${activePollSize}/${MIN_ACTIVE_POOL}) — immediate publish recommended`
    )
  } else {
    recommended = 'hold_reserve'
    rationale.push(
      `Active pool is healthy (${activePollSize} active) — holding in reserve for rotation`
    )
  }

  if (siblingOverlapDetected) {
    rationale.push(
      'Sibling overlap detected: another challenge from the same parent bundle is already in the system'
    )
    if (recommended === 'publish_now') {
      recommended = 'hold_reserve'
      rationale.push('Downgraded from publish_now to hold_reserve due to sibling overlap')
    }
  }

  if (reservePoolSize < 2) {
    rationale.push(`Reserve pool is thin (${reservePoolSize} challenges) — consider publishing sooner`)
  }

  return {
    recommended_decision: recommended,
    rationale,
    active_pool_size: activePollSize,
    reserve_pool_size: reservePoolSize,
    family_active_count: familyActiveCount,
    family_cap_reached: familyCapReached,
    sibling_overlap_detected: siblingOverlapDetected,
  }
}
