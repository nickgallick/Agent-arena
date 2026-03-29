import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/require-admin'
import { rateLimit } from '@/lib/utils/rate-limit'

const difficultyProfileSchema = z.object({
  reasoning_depth:       z.number().int().min(1).max(10).optional(),
  tool_dependence:       z.number().int().min(1).max(10).optional(),
  ambiguity:             z.number().int().min(1).max(10).optional(),
  deception:             z.number().int().min(1).max(10).optional(),
  time_pressure:         z.number().int().min(1).max(10).optional(),
  error_recovery_burden: z.number().int().min(1).max(10).optional(),
  non_local_dependency:  z.number().int().min(1).max(10).optional(),
  evaluation_strictness: z.number().int().min(1).max(10).optional(),
}).optional()

const judgeWeightsSchema = z.object({
  objective:  z.number().min(0).max(1).optional(),
  process:    z.number().min(0).max(1).optional(),
  strategy:   z.number().min(0).max(1).optional(),
  integrity:  z.number().min(0).max(1).optional(),
  efficiency: z.number().min(0).max(1).optional(),
}).optional()

const updateSchema = z.object({
  difficulty_profile: difficultyProfileSchema,
  judge_weights: judgeWeightsSchema,
  family_id: z.string().nullable().optional(),
  retire_after_solves: z.number().int().min(5).max(500).optional(),
  calibration_status: z.enum(['draft', 'calibrating', 'passed', 'active', 'flagged', 'quarantined', 'retired', 'archived', 'uncalibrated', 'calibrated']).optional(),
  quarantine_reason: z.string().min(1).max(500).optional(),
  web_submission_supported: z.boolean().optional(),
}).partial()

// GET /api/admin/challenges/[id] — full challenge detail including CDI, gates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { success } = await rateLimit(`admin:${admin.id}:challenge-detail`, 30, 60_000)
    if (!success) return NextResponse.json({ error: 'Rate limited' }, { status: 429 })

    const { id } = await params
    const supabase = createAdminClient()

    // Fetch challenge with all intelligence fields
    const { data: challenge, error } = await supabase
      .from('challenges')
      .select('*, family:challenge_families(id, name, prestige)')
      .eq('id', id)
      .single()

    if (error || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Run publication gates check
    const { data: gates } = await supabase
      .rpc('check_publication_gates', { p_challenge_id: id })

    // Entry stats
    const { data: entryStats } = await supabase
      .from('challenge_entries')
      .select('status, composite_score, dispute_flagged')
      .eq('challenge_id', id)

    const stats = {
      total: entryStats?.length ?? 0,
      judged: entryStats?.filter(e => e.status === 'judged' || e.status === 'scored').length ?? 0,
      disputed: entryStats?.filter(e => e.dispute_flagged).length ?? 0,
      avg_composite: entryStats?.filter(e => e.composite_score != null).length
        ? (entryStats!.reduce((s, e) => s + (e.composite_score ?? 0), 0) / entryStats!.filter(e => e.composite_score != null).length).toFixed(1)
        : null,
    }

    // Defensibility reports
    const { data: reports } = await supabase
      .from('challenge_defensibility_reports')
      .select('cdi_score, cdi_grade, contamination_risk, generated_at')
      .eq('challenge_id', id)
      .order('generated_at', { ascending: false })
      .limit(5)

    return NextResponse.json({ challenge, gates, stats, reports: reports ?? [] })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/challenges/[id] — update difficulty profile, weights, calibration
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { success } = await rateLimit(`admin:${admin.id}:challenge-update`, 20, 60_000)
    if (!success) return NextResponse.json({ error: 'Rate limited' }, { status: 429 })

    const { id } = await params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const supabase = createAdminClient()

    const updatePayload: Record<string, unknown> = {}
    if (parsed.data.difficulty_profile !== undefined) updatePayload.difficulty_profile = parsed.data.difficulty_profile
    if (parsed.data.judge_weights !== undefined) updatePayload.judge_weights = parsed.data.judge_weights
    if (parsed.data.family_id !== undefined) updatePayload.family_id = parsed.data.family_id
    if (parsed.data.retire_after_solves !== undefined) updatePayload.retire_after_solves = parsed.data.retire_after_solves
    if (parsed.data.calibration_status !== undefined) updatePayload.calibration_status = parsed.data.calibration_status
    if (parsed.data.quarantine_reason !== undefined) updatePayload.quarantine_reason = parsed.data.quarantine_reason
    if (parsed.data.web_submission_supported !== undefined) updatePayload.web_submission_supported = parsed.data.web_submission_supported

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('challenges')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[admin/challenges/[id] PATCH] error:', error.message)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({ challenge: updated })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/challenges/[id]/quarantine — quarantine a challenge
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const reason = (body as { reason?: string }).reason ?? 'Manually quarantined by admin'

    const supabase = createAdminClient()
    await supabase.rpc('quarantine_challenge', {
      p_challenge_id: id,
      p_reason: reason,
      p_admin_id: admin.id,
    })

    return NextResponse.json({ quarantined: true })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
