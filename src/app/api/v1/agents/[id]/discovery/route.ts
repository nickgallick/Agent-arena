/**
 * PATCH /api/v1/agents/[id]/discovery
 *
 * Updates an agent's discovery settings (self-reported data).
 * Requires JWT auth — must be the agent's owner.
 *
 * All data updated here is self-reported — it will be labeled
 * with ClaimBadge(verified=false) on the public profile.
 *
 * Tags are checked against canonical_tags:
 * - Canonical tags are resolved to their canonical form (alias resolution)
 * - Non-canonical tags are queued in tag_moderation_queue for review
 * - All tags are saved regardless (freeform allowed)
 *
 * Response includes tag_status: { canonical: string[], pending_review: string[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveAuth } from '@/lib/auth/token-auth'
import { logEvent } from '@/lib/analytics/log-event'
import { rateLimit } from '@/lib/utils/rate-limit'

const discoverySchema = z.object({
  capability_tags: z.array(z.string().max(50)).max(20).optional(),
  domain_tags: z.array(z.string().max(50)).max(10).optional(),
  availability_status: z.enum(['available', 'unavailable', 'unknown']).optional(),
  contact_opt_in: z.boolean().optional(),
  description: z.string().max(1000).optional(),
  website_url: z.string().url().max(500).nullable().optional(),
  runtime_metadata: z.object({
    model_name: z.string().max(100).optional(),
    framework: z.string().max(100).optional(),
    version: z.string().max(50).optional(),
  }).optional(),
})

function normalizeTags(tags: string[]): string[] {
  return [...new Set(
    tags
      .map(t => t.toLowerCase().trim())
      .filter(t => t.length > 0 && t.length <= 50)
  )]
}

interface CanonicalTag {
  tag: string
  aliases: string[]
  category: string
}

/**
 * Resolve tags against canonical vocabulary.
 * Returns { canonical, pending, resolvedTags }
 * - canonical: tags that exist in canonical_tags
 * - pending: tags queued for review
 * - resolvedTags: final tag list (canonical form or original)
 */
async function resolveTagsAgainstCanonical(
  tags: string[],
  category: 'capability' | 'domain',
  agentId: string
): Promise<{ canonical: string[]; pending: string[]; resolvedTags: string[] }> {
  if (tags.length === 0) return { canonical: [], pending: [], resolvedTags: [] }

  const supabase = createAdminClient()

  // Fetch all active canonical tags for this category
  const { data: canonicalTags } = await supabase
    .from('canonical_tags')
    .select('tag, aliases, category')
    .eq('category', category)
    .eq('status', 'active')

  const canonicalMap = new Map<string, string>() // alias/tag → canonical tag
  for (const ct of (canonicalTags ?? []) as CanonicalTag[]) {
    canonicalMap.set(ct.tag, ct.tag)
    for (const alias of ct.aliases ?? []) {
      canonicalMap.set(alias.toLowerCase().trim(), ct.tag)
    }
  }

  const canonical: string[] = []
  const pending: string[] = []
  const resolvedTags: string[] = []

  for (const tag of tags) {
    const canonicalForm = canonicalMap.get(tag)
    if (canonicalForm) {
      canonical.push(canonicalForm)
      resolvedTags.push(canonicalForm)
    } else {
      pending.push(tag)
      resolvedTags.push(tag)
      // Upsert into moderation queue — increment count if exists
      await supabase
        .from('tag_moderation_queue')
        .upsert(
          {
            tag,
            category,
            submitted_by_agent_id: agentId,
            submitted_count: 1,
            status: 'pending',
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'tag,category',
            // Use SQL to increment submitted_count
            ignoreDuplicates: false,
          }
        )

      // Increment submitted_count via separate update for existing entries
      // Ignore errors — upsert already handles the insert case
      try {
        await supabase.rpc('increment_tag_submitted_count', { p_tag: tag, p_category: category }).maybeSingle()
      } catch {
        // RPC may not exist; upsert already handles insert case
      }
    }
  }

  return { canonical, pending, resolvedTags }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: agentId } = await params

    const auth = await resolveAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = await rateLimit(`discovery-update:${auth.user_id}`, 30, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = (await request.json()) as unknown
    const parsed = discoverySchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
      return NextResponse.json({ error: issues[0], details: issues }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify ownership
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, user_id, contact_opt_in')
      .eq('id', agentId)
      .maybeSingle()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    if (agent.user_id !== auth.user_id && !auth.is_admin) {
      return NextResponse.json({ error: 'Forbidden — not your agent' }, { status: 403 })
    }

    const {
      capability_tags,
      domain_tags,
      availability_status,
      contact_opt_in,
      description,
      website_url,
      runtime_metadata,
    } = parsed.data

    // Build update payload — normalize and resolve tags against canonical
    const updatePayload: Record<string, unknown> = {}

    // Tag status tracking for response
    const tagStatus: { canonical: string[]; pending_review: string[] } = {
      canonical: [],
      pending_review: [],
    }

    if (capability_tags !== undefined) {
      const normalized = normalizeTags(capability_tags)
      const { canonical, pending, resolvedTags } = await resolveTagsAgainstCanonical(normalized, 'capability', agentId)
      updatePayload.capability_tags = resolvedTags
      tagStatus.canonical.push(...canonical)
      tagStatus.pending_review.push(...pending)
    }

    if (domain_tags !== undefined) {
      const normalized = normalizeTags(domain_tags)
      const { canonical, pending, resolvedTags } = await resolveTagsAgainstCanonical(normalized, 'domain', agentId)
      updatePayload.domain_tags = resolvedTags
      tagStatus.canonical.push(...canonical)
      tagStatus.pending_review.push(...pending)
    }

    if (availability_status !== undefined) updatePayload.availability_status = availability_status
    if (contact_opt_in !== undefined) updatePayload.contact_opt_in = contact_opt_in
    if (description !== undefined) updatePayload.bio = description
    if (website_url !== undefined) updatePayload.website_url = website_url
    if (runtime_metadata !== undefined) updatePayload.runtime_metadata = runtime_metadata

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('agents')
      .update(updatePayload)
      .eq('id', agentId)
      .select(
        'id, name, bio, capability_tags, domain_tags, availability_status, ' +
        'contact_opt_in, website_url, runtime_metadata, updated_at'
      )
      .single()

    if (updateError) {
      console.error('[PATCH /api/v1/agents/[id]/discovery] Update error:', updateError.message)
      return NextResponse.json({ error: 'Failed to update discovery settings' }, { status: 500 })
    }

    // Log contact_opt_in toggle to true
    if (contact_opt_in === true && !agent.contact_opt_in) {
      logEvent({
        event_type: 'interest_signal_sent',
        auth,
        request,
        metadata: { agent_id: agentId, action: 'contact_opt_in_enabled' },
      })
    }

    return NextResponse.json({
      agent: updated,
      tag_status: tagStatus,
    })
  } catch (err) {
    console.error('[PATCH /api/v1/agents/[id]/discovery] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
