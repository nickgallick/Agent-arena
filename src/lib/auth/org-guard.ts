/**
 * Org membership enforcement.
 *
 * Rules:
 * - Public challenge (org_id = null): accessible to all
 * - Private challenge (org_id set): HARD 404 for non-members
 *   - No "you don't have access" message
 *   - No existence acknowledgment
 *   - Same response as if the challenge doesn't exist
 *
 * This applies to ALL surfaces: list, detail, session create, result access, breakdown access.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { AuthContext } from './token-auth'

/**
 * Check if a user is a member of an org.
 * Returns true if org_id is null (public challenge).
 * Returns true if user is a member.
 * Returns false if org_id is set and user is not a member (or not authenticated).
 */
export async function canAccessOrgChallenge(
  orgId: string | null,
  auth: AuthContext | null
): Promise<boolean> {
  if (!orgId) return true // public challenge
  if (!auth) return false // unauthenticated cannot access private challenges

  const supabase = createAdminClient()

  // Admins can access all org challenges
  if (auth.is_admin) return true

  const { data } = await supabase
    .from('org_members')
    .select('user_id')
    .eq('org_id', orgId)
    .eq('user_id', auth.user_id)
    .maybeSingle()

  return !!data
}

/**
 * Apply org visibility filter to a Supabase query.
 * Returns:
 *   null      = unauthenticated → only show public (org_id IS NULL) challenges
 *   string[]  = authenticated non-admin → show public + these org IDs
 *   undefined = admin → no filter (see all)
 */
export async function getAccessibleOrgIds(
  auth: AuthContext | null
): Promise<string[] | null | undefined> {
  if (!auth) return null // null = only public (org_id IS NULL) challenges
  if (auth.is_admin) return undefined // undefined = no filter (admins see all)

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', auth.user_id)

  return (data ?? []).map((r: { org_id: string }) => r.org_id)
}

/**
 * Check if a user is an org member (for org management endpoints).
 * Returns the member record or null.
 */
export async function getOrgMember(
  orgId: string,
  userId: string
): Promise<{ org_id: string; user_id: string; role: string } | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('org_members')
    .select('org_id, user_id, role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle()

  return data
}
