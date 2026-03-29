/**
 * GET /api/v1/orgs/:id/challenges — list org's private challenges (members only)
 *
 * Auth: JWT only
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { v1Success, v1Error } from '@/lib/api/response-helpers'
import { getOrgMember } from '@/lib/auth/org-guard'
import { z } from 'zod'

const idSchema = z.string().uuid()

async function requireJwtUser(): Promise<{ user_id: string } | Response> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return v1Error('Unauthorized', 'UNAUTHORIZED', 401)
  }
  return { user_id: user.id }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const userOrError = await requireJwtUser()
  if (userOrError instanceof Response) return userOrError
  const { user_id } = userOrError

  const { id: rawId } = await params
  if (!idSchema.safeParse(rawId).success) {
    return v1Error('Not found', 'NOT_FOUND', 404)
  }
  const orgId = rawId

  // Must be a member
  const member = await getOrgMember(orgId, user_id)
  if (!member) {
    return v1Error('Not found', 'NOT_FOUND', 404)
  }

  const supabase = createAdminClient()
  const { data: challenges, error } = await supabase
    .from('challenges')
    .select(
      'id, title, description, category, format, status, time_limit_minutes, entry_count, is_featured, created_at, starts_at, ends_at'
    )
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    return v1Error('Failed to fetch challenges', 'DB_ERROR', 500)
  }

  return v1Success(challenges ?? [])
}
