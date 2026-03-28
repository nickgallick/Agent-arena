import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withAdmin } from '@/lib/auth/require-admin'
import { getInventoryAdvisory } from '@/lib/intake/inventory-advisor'
import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Request schema
// ─────────────────────────────────────────────────────────────────────────────

const InventoryDecisionSchema = z.object({
  challenge_id: z.string().uuid(),
  decision: z.enum([
    'publish_now',
    'hold_reserve',
    'queue_for_later',
    'mutate_before_release',
    'quarantine',
    'reject',
  ]),
  reason: z.string().optional(),
  scheduled_publish_at: z.string().datetime().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Decision → status mapping
// ─────────────────────────────────────────────────────────────────────────────

type DecisionMapping = {
  pipeline_status: string
  status?: string
}

const DECISION_MAP: Record<string, DecisionMapping> = {
  publish_now: { pipeline_status: 'active', status: 'active' },
  hold_reserve: { pipeline_status: 'passed_reserve', status: 'reserve' },
  queue_for_later: { pipeline_status: 'queued' },
  mutate_before_release: { pipeline_status: 'needs_revision' },
  quarantine: { pipeline_status: 'quarantined', status: 'upcoming' },
  reject: { pipeline_status: 'archived' },
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/inventory
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest): Promise<Response> {
  return withAdmin(async () => {
    const supabase = createAdminClient()

    const { data: challenges, error: listError } = await supabase
      .from('challenges')
      .select(`
        id,
        title,
        pipeline_status,
        calibration_status,
        calibration_verdict,
        calibration_reason,
        calibration_completed_at,
        challenge_type,
        category,
        status,
        created_at
      `)
      .in('pipeline_status', ['passed', 'flagged'])
      .order('calibration_completed_at', { ascending: true })

    if (listError) {
      return NextResponse.json({ error: 'Failed to fetch inventory queue' }, { status: 500 })
    }

    // Enrich each with advisory (parallel, best-effort)
    const enriched = await Promise.all(
      (challenges ?? []).map(async (challenge) => {
        let advisory = null
        try {
          advisory = await getInventoryAdvisory(supabase, challenge.id)
        } catch {
          // Advisory is advisory-only, don't fail the whole list
          advisory = null
        }
        return { ...challenge, advisory }
      })
    )

    return NextResponse.json({
      inventory_queue: enriched,
      total: enriched.length,
    })
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/inventory
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
  return withAdmin(async (admin) => {
    const supabase = createAdminClient()

    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parseResult = InventoryDecisionSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parseResult.error.issues },
        { status: 422 }
      )
    }

    const body = parseResult.data

    // Fetch current challenge
    const { data: challenge, error: fetchError } = await supabase
      .from('challenges')
      .select('id, pipeline_status, status, challenge_type')
      .eq('id', body.challenge_id)
      .single()

    if (fetchError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    if (!['passed', 'flagged'].includes(challenge.pipeline_status)) {
      return NextResponse.json(
        {
          error: `Challenge must be in passed or flagged pipeline status (current: ${challenge.pipeline_status})`,
        },
        { status: 409 }
      )
    }

    const mapping = DECISION_MAP[body.decision]
    const beforeStatus = challenge.pipeline_status

    // For publish_now: check can_activate_challenge first
    if (body.decision === 'publish_now') {
      const { data: canActivate, error: capError } = await supabase
        .rpc('can_activate_challenge', { p_challenge_id: body.challenge_id })

      if (capError) {
        return NextResponse.json({ error: 'Failed to check activation eligibility' }, { status: 500 })
      }

      if (canActivate && !(canActivate as { can_activate: boolean }).can_activate) {
        return NextResponse.json(
          {
            error: 'Cannot activate: family cap or other constraint',
            details: canActivate,
          },
          { status: 409 }
        )
      }
    }

    // Get advisory for logging
    let advisory = null
    try {
      advisory = await getInventoryAdvisory(supabase, body.challenge_id)
    } catch {
      // Non-fatal
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      pipeline_status: mapping.pipeline_status,
      updated_at: new Date().toISOString(),
    }
    if (mapping.status) {
      updatePayload.status = mapping.status
    }

    // Update challenge
    const { data: updatedChallenge, error: updateError } = await supabase
      .from('challenges')
      .update(updatePayload)
      .eq('id', body.challenge_id)
      .select()
      .single()

    if (updateError || !updatedChallenge) {
      return NextResponse.json({ error: 'Failed to update challenge' }, { status: 500 })
    }

    // Log inventory decision
    const { error: decisionLogError } = await supabase
      .from('challenge_inventory_decisions')
      .insert({
        challenge_id: body.challenge_id,
        decision: body.decision,
        decided_by: admin.id,
        reason: body.reason ?? null,
        active_pool_size: advisory?.active_pool_size ?? null,
        reserve_pool_size: advisory?.reserve_pool_size ?? null,
        family_active_count: advisory?.family_active_count ?? null,
        scheduled_publish_at: body.scheduled_publish_at ?? null,
      })

    if (decisionLogError) {
      // Non-fatal
      void decisionLogError
    }

    // Log to challenge_admin_actions
    const { error: adminActionError } = await supabase
      .from('challenge_admin_actions')
      .insert({
        challenge_id: body.challenge_id,
        action: 'inventory_decision',
        actor: admin.id,
        previous_status: beforeStatus,
        new_status: mapping.pipeline_status,
        reason: body.decision + (body.reason ? `: ${body.reason}` : ''),
        metadata: {
          decision: body.decision,
          advisory: advisory ?? null,
          scheduled_publish_at: body.scheduled_publish_at ?? null,
        },
      })

    if (adminActionError) {
      void adminActionError
    }

    return NextResponse.json({
      challenge: updatedChallenge,
      decision: body.decision,
      advisory,
    })
  })
}
