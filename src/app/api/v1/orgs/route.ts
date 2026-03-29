/**
 * GET  /api/v1/orgs — list orgs the authenticated user belongs to
 * POST /api/v1/orgs — create a new organization
 *
 * Auth: JWT only (org management is user-facing)
 */

import { randomBytes } from 'crypto'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { v1Success, v1Error } from '@/lib/api/response-helpers'
import { logEvent } from '@/lib/analytics/log-event'

const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(500).optional(),
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

export async function GET(): Promise<Response> {
  const userOrError = await requireJwtUser()
  if (userOrError instanceof Response) return userOrError
  const { user_id } = userOrError

  const supabase = createAdminClient()

  // Get all orgs the user is a member of
  const { data: memberships, error } = await supabase
    .from('org_members')
    .select(
      `
      role,
      joined_at,
      organizations (
        id,
        name,
        slug,
        plan,
        description,
        owner_id,
        created_at
      )
    `
    )
    .eq('user_id', user_id)

  if (error) {
    return v1Error('Failed to fetch organizations', 'DB_ERROR', 500)
  }

  type OrgRecord = {
    id: string
    name: string
    slug: string
    plan: string
    description: string | null
    owner_id: string
    created_at: string
  }

  // Get member counts per org
  const orgIds = (memberships ?? [])
    .map((m) => (m.organizations as unknown as OrgRecord | null)?.id)
    .filter(Boolean) as string[]

  let memberCounts: Record<string, number> = {}
  if (orgIds.length > 0) {
    const { data: counts } = await supabase
      .from('org_members')
      .select('org_id')
      .in('org_id', orgIds)

    if (counts) {
      for (const c of counts) {
        memberCounts[c.org_id] = (memberCounts[c.org_id] ?? 0) + 1
      }
    }
  }

  const orgs = (memberships ?? []).map((m) => {
    const org = m.organizations as unknown as OrgRecord | null
    return {
      ...org,
      role: m.role,
      joined_at: m.joined_at,
      member_count: org ? (memberCounts[org.id] ?? 0) : 0,
    }
  })

  return v1Success(orgs)
}

export async function POST(request: Request): Promise<Response> {
  const userOrError = await requireJwtUser()
  if (userOrError instanceof Response) return userOrError
  const { user_id } = userOrError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return v1Error('Invalid JSON body', 'INVALID_JSON', 400)
  }

  const parsed = createOrgSchema.safeParse(body)
  if (!parsed.success) {
    return v1Error(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400)
  }

  const { name, slug, description } = parsed.data
  const supabase = createAdminClient()

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    return v1Error('Slug already taken', 'SLUG_TAKEN', 409)
  }

  // Insert organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name,
      slug,
      description: description ?? null,
      owner_id: user_id,
      plan: 'free',
    })
    .select('id, name, slug, plan, description, owner_id, created_at')
    .single()

  if (orgError || !org) {
    return v1Error('Failed to create organization', 'DB_ERROR', 500)
  }

  // Insert owner as member
  const { error: memberError } = await supabase.from('org_members').insert({
    org_id: org.id,
    user_id,
    role: 'owner',
  })

  if (memberError) {
    // Cleanup org if member insert fails
    await supabase.from('organizations').delete().eq('id', org.id)
    return v1Error('Failed to create organization membership', 'DB_ERROR', 500)
  }

  // Log event
  logEvent({
    event_type: 'org_created',
    request,
    metadata: { org_id: org.id, slug: org.slug },
  })

  return v1Success({ ...org, role: 'owner', member_count: 1 }, { status: 201 })
}
