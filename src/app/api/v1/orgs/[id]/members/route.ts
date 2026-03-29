/**
 * GET  /api/v1/orgs/:id/members — list members (members only)
 * POST /api/v1/orgs/:id/members — invite member by email (owner/admin only)
 *
 * Auth: JWT only
 */

import { randomBytes } from 'crypto'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { v1Success, v1Error } from '@/lib/api/response-helpers'
import { getOrgMember } from '@/lib/auth/org-guard'

const idSchema = z.string().uuid('Invalid org ID')

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member']).default('member'),
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
  const { data: members, error } = await supabase
    .from('org_members')
    .select(
      `
      role,
      joined_at,
      profiles (
        id,
        username,
        display_name,
        avatar_url
      )
    `
    )
    .eq('org_id', orgId)
    .order('joined_at', { ascending: true })

  if (error) {
    return v1Error('Failed to fetch members', 'DB_ERROR', 500)
  }

  return v1Success(members ?? [])
}

export async function POST(
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

  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) {
    return v1Error(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
  }

  const { email, role } = parsed.data

  // Generate secure invitation token
  const token = randomBytes(32).toString('hex')
  const supabase = createAdminClient()

  // Check if already invited (unexpired)
  const { data: existingInvite } = await supabase
    .from('org_invitations')
    .select('id')
    .eq('org_id', orgId)
    .eq('email', email.toLowerCase())
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (existingInvite) {
    return v1Error('This email already has a pending invitation', 'ALREADY_INVITED', 409)
  }

  const { data: invitation, error: inviteError } = await supabase
    .from('org_invitations')
    .insert({
      org_id: orgId,
      email: email.toLowerCase(),
      role,
      invited_by: user_id,
      token,
    })
    .select('id, email, role, token, expires_at, created_at')
    .single()

  if (inviteError || !invitation) {
    return v1Error('Failed to create invitation', 'DB_ERROR', 500)
  }

  return v1Success(
    {
      ...invitation,
      invite_url: `/join/${invitation.token}`,
    },
    { status: 201 }
  )
}
