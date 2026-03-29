/**
 * DELETE /api/v1/orgs/:id/members/:uid — remove member (owner/admin only, cannot remove owner)
 * PATCH  /api/v1/orgs/:id/members/:uid — change role (owner only)
 *
 * Auth: JWT only
 */

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { v1Success, v1Error } from '@/lib/api/response-helpers'
import { getOrgMember } from '@/lib/auth/org-guard'

const idSchema = z.string().uuid()

const patchMemberSchema = z.object({
  role: z.enum(['admin', 'member']),
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; uid: string }> }
): Promise<Response> {
  const userOrError = await requireJwtUser()
  if (userOrError instanceof Response) return userOrError
  const { user_id } = userOrError

  const { id: rawOrgId, uid: rawUid } = await params
  if (!idSchema.safeParse(rawOrgId).success || !idSchema.safeParse(rawUid).success) {
    return v1Error('Not found', 'NOT_FOUND', 404)
  }
  const orgId = rawOrgId
  const targetUserId = rawUid

  // Must be owner or admin
  const actor = await getOrgMember(orgId, user_id)
  if (!actor || !['owner', 'admin'].includes(actor.role)) {
    return v1Error('Not found', 'NOT_FOUND', 404)
  }

  // Cannot remove owner
  const target = await getOrgMember(orgId, targetUserId)
  if (!target) {
    return v1Error('Member not found', 'NOT_FOUND', 404)
  }

  if (target.role === 'owner') {
    return v1Error('Cannot remove the organization owner', 'CANNOT_REMOVE_OWNER', 403)
  }

  // Admin can only remove members, not other admins (only owner can remove admins)
  if (actor.role === 'admin' && target.role === 'admin') {
    return v1Error('Admins cannot remove other admins', 'FORBIDDEN', 403)
  }

  const supabase = createAdminClient()

  // Fetch org name/slug for audit log
  const { data: orgInfo } = await supabase
    .from('organizations')
    .select('name, slug')
    .eq('id', orgId)
    .single()

  const { error } = await supabase
    .from('org_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', targetUserId)

  if (error) {
    return v1Error('Failed to remove member', 'DB_ERROR', 500)
  }

  // Audit log: record member removal (org_audit_log preserved even if org later deleted)
  void Promise.resolve(
    supabase.from('org_audit_log').insert({
      org_id: orgId,
      org_name: orgInfo?.name ?? '',
      org_slug: orgInfo?.slug ?? '',
      action: 'member_removed',
      actor_id: user_id,
      metadata: { removed_user_id: targetUserId, removed_role: target.role },
    })
  ).catch(() => {})

  // Note: if this membership was established via an invitation token, that token is
  // now consumed (accepted_at is set). Future invites to the same email address will
  // require generating a new invitation token — the old one cannot be reused.

  return v1Success({ removed: true })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; uid: string }> }
): Promise<Response> {
  const userOrError = await requireJwtUser()
  if (userOrError instanceof Response) return userOrError
  const { user_id } = userOrError

  const { id: rawOrgId, uid: rawUid } = await params
  if (!idSchema.safeParse(rawOrgId).success || !idSchema.safeParse(rawUid).success) {
    return v1Error('Not found', 'NOT_FOUND', 404)
  }
  const orgId = rawOrgId
  const targetUserId = rawUid

  // Must be owner (only owner can change roles)
  const actor = await getOrgMember(orgId, user_id)
  if (!actor || actor.role !== 'owner') {
    return v1Error('Not found', 'NOT_FOUND', 404)
  }

  // Cannot change owner's own role
  if (targetUserId === user_id) {
    return v1Error('Cannot change owner role', 'CANNOT_CHANGE_OWNER', 403)
  }

  const target = await getOrgMember(orgId, targetUserId)
  if (!target) {
    return v1Error('Member not found', 'NOT_FOUND', 404)
  }

  if (target.role === 'owner') {
    return v1Error('Cannot change the owner role', 'CANNOT_CHANGE_OWNER', 403)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return v1Error('Invalid JSON body', 'INVALID_JSON', 400)
  }

  const parsed = patchMemberSchema.safeParse(body)
  if (!parsed.success) {
    return v1Error(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
  }

  const supabase = createAdminClient()

  // Fetch org name/slug for audit log
  const { data: patchOrgInfo } = await supabase
    .from('organizations')
    .select('name, slug')
    .eq('id', orgId)
    .single()

  const { data: updated, error } = await supabase
    .from('org_members')
    .update({ role: parsed.data.role })
    .eq('org_id', orgId)
    .eq('user_id', targetUserId)
    .select('org_id, user_id, role, joined_at')
    .single()

  if (error || !updated) {
    return v1Error('Failed to update member role', 'DB_ERROR', 500)
  }

  // Audit log: record role change (org_audit_log preserved even if org later deleted)
  void Promise.resolve(
    supabase.from('org_audit_log').insert({
      org_id: orgId,
      org_name: patchOrgInfo?.name ?? '',
      org_slug: patchOrgInfo?.slug ?? '',
      action: 'role_changed',
      actor_id: user_id,
      metadata: { target_user_id: targetUserId, old_role: target.role, new_role: parsed.data.role },
    })
  ).catch(() => {})

  return v1Success(updated)
}
