/**
 * GET    /api/v1/orgs/:id — org detail (members only)
 * PATCH  /api/v1/orgs/:id — update org (owner/admin only)
 * DELETE /api/v1/orgs/:id — delete org (owner only)
 *
 * Auth: JWT only
 */

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { v1Success, v1Error } from '@/lib/api/response-helpers'
import { getOrgMember } from '@/lib/auth/org-guard'

const idSchema = z.string().uuid('Invalid org ID')

const patchOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
})

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
  const idParsed = idSchema.safeParse(rawId)
  if (!idParsed.success) {
    return v1Error('Not found', 'NOT_FOUND', 404)
  }
  const orgId = idParsed.data

  // Must be a member
  const member = await getOrgMember(orgId, user_id)
  if (!member) {
    return v1Error('Not found', 'NOT_FOUND', 404)
  }

  const supabase = createAdminClient()
  const { data: org, error } = await supabase
    .from('organizations')
    .select('id, name, slug, plan, description, owner_id, created_at, updated_at')
    .eq('id', orgId)
    .single()

  if (error || !org) {
    return v1Error('Not found', 'NOT_FOUND', 404)
  }

  // Get member count
  const { count: memberCount } = await supabase
    .from('org_members')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)

  return v1Success({ ...org, role: member.role, member_count: memberCount ?? 0 })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const userOrError = await requireJwtUser()
  if (userOrError instanceof Response) return userOrError
  const { user_id } = userOrError

  const { id: rawId } = await params
  const idParsed = idSchema.safeParse(rawId)
  if (!idParsed.success) {
    return v1Error('Not found', 'NOT_FOUND', 404)
  }
  const orgId = idParsed.data

  // Must be owner or admin
  const member = await getOrgMember(orgId, user_id)
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return v1Error('Not found', 'NOT_FOUND', 404)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return v1Error('Invalid JSON body', 'INVALID_JSON', 400)
  }

  const parsed = patchOrgSchema.safeParse(body)
  if (!parsed.success) {
    return v1Error(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.description !== undefined) updates.description = parsed.data.description

  const supabase = createAdminClient()
  const { data: org, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', orgId)
    .select('id, name, slug, plan, description, owner_id, created_at, updated_at')
    .single()

  if (error || !org) {
    return v1Error('Failed to update organization', 'DB_ERROR', 500)
  }

  return v1Success(org)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const userOrError = await requireJwtUser()
  if (userOrError instanceof Response) return userOrError
  const { user_id } = userOrError

  const { id: rawId } = await params
  const idParsed = idSchema.safeParse(rawId)
  if (!idParsed.success) {
    return v1Error('Not found', 'NOT_FOUND', 404)
  }
  const orgId = idParsed.data

  // Must be owner
  const member = await getOrgMember(orgId, user_id)
  if (!member || member.role !== 'owner') {
    return v1Error('Not found', 'NOT_FOUND', 404)
  }

  const supabase = createAdminClient()

  // Fetch org details for audit log (before deletion)
  const { data: orgToDelete } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('id', orgId)
    .single()

  if (!orgToDelete) {
    return v1Error('Organization not found', 'NOT_FOUND', 404)
  }

  // Check if org has ANY challenges assigned — cannot delete org with active challenges.
  // Reassign or remove all challenges first.
  const { count: challengeCount } = await supabase
    .from('challenges')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)

  if ((challengeCount ?? 0) > 0) {
    return v1Error(
      'Cannot delete organization with assigned challenges. Reassign or remove all challenges first.',
      'HAS_CHALLENGES',
      400
    )
  }

  // Get member count for audit metadata
  const { count: memberCount } = await supabase
    .from('org_members')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)

  // Insert audit log record BEFORE deletion (org_audit_log has no FK on org_id — preserved after deletion)
  await supabase.from('org_audit_log').insert({
    org_id: orgId,
    org_name: orgToDelete.name,
    org_slug: orgToDelete.slug,
    action: 'deleted',
    actor_id: user_id,
    metadata: {
      member_count: memberCount ?? 0,
      challenge_count: 0, // confirmed 0 by check above
    },
  })

  // Hard delete — cascade handles members and invitations
  const { error } = await supabase.from('organizations').delete().eq('id', orgId)

  if (error) {
    return v1Error('Failed to delete organization', 'DB_ERROR', 500)
  }

  return v1Success({ deleted: true })
}
