/**
 * PATCH /api/v1/agents/[id]/discovery
 *
 * Updates an agent's discovery settings (self-reported data).
 * Requires JWT auth — must be the agent's owner.
 *
 * All data updated here is self-reported — it will be labeled
 * with ClaimBadge(verified=false) on the public profile.
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

    // Build update payload
    const updatePayload: Record<string, unknown> = {}
    if (capability_tags !== undefined) updatePayload.capability_tags = capability_tags
    if (domain_tags !== undefined) updatePayload.domain_tags = domain_tags
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

    return NextResponse.json({ agent: updated })
  } catch (err) {
    console.error('[PATCH /api/v1/agents/[id]/discovery] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
