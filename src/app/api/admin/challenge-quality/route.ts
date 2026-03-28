import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/require-admin'

// GET /api/admin/challenge-quality — list all challenges with quality metrics
export async function GET(_req: NextRequest) {
  try { await requireAdmin() } catch (e) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('challenges')
    .select(`
      id, title, status, calibration_status,
      cdi_score, solve_rate, score_mean, score_stddev,
      dispute_rate, exploit_rate, tier_separation,
      last_calculated_at, quarantine_reason, quarantined_at,
      min_required_samples, created_at
    `)
    .order('cdi_score', { ascending: true, nullsFirst: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ challenges: data })
}

// POST /api/admin/challenge-quality — trigger actions
export async function POST(req: NextRequest) {
  try { await requireAdmin() } catch (e) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const supabase = createAdminClient()
  const body = await req.json()
  const { action, challenge_id, reason, actor = 'admin' } = body

  if (!action || !challenge_id) {
    return NextResponse.json({ error: 'action and challenge_id required' }, { status: 400 })
  }

  // Get current status for audit trail
  const { data: current } = await supabase
    .from('challenges')
    .select('calibration_status, title')
    .eq('id', challenge_id)
    .single()

  const previousStatus = current?.calibration_status

  switch (action) {
    case 'recalculate': {
      const { data, error } = await supabase.rpc('compute_challenge_quality', { p_challenge_id: challenge_id })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      await supabase.from('challenge_admin_actions').insert({
        challenge_id, actor, action: 'recalculate',
        reason: reason ?? 'manual recalculation',
        previous_status: previousStatus, new_status: previousStatus,
        metadata: data as object
      })
      return NextResponse.json({ success: true, metrics: data })
    }

    case 'flag': {
      await supabase.from('challenges').update({ calibration_status: 'flagged' }).eq('id', challenge_id)
      await supabase.from('challenge_admin_actions').insert({
        challenge_id, actor, action: 'flag',
        reason: reason ?? 'manual flag',
        previous_status: previousStatus, new_status: 'flagged'
      })
      return NextResponse.json({ success: true, new_status: 'flagged' })
    }

    case 'unflag': {
      await supabase.from('challenges').update({ calibration_status: 'passed' }).eq('id', challenge_id)
      await supabase.from('challenge_admin_actions').insert({
        challenge_id, actor, action: 'unflag',
        reason: reason ?? 'manual unflag',
        previous_status: previousStatus, new_status: 'passed'
      })
      return NextResponse.json({ success: true, new_status: 'passed' })
    }

    case 'quarantine': {
      await supabase.from('challenges').update({
        calibration_status: 'quarantined',
        quarantine_reason: reason ?? 'manual quarantine',
        quarantined_at: new Date().toISOString()
      }).eq('id', challenge_id)
      await supabase.from('challenge_admin_actions').insert({
        challenge_id, actor, action: 'quarantine',
        reason: reason ?? 'manual quarantine',
        previous_status: previousStatus, new_status: 'quarantined'
      })
      return NextResponse.json({ success: true, new_status: 'quarantined' })
    }

    case 'unquarantine': {
      await supabase.from('challenges').update({
        calibration_status: 'passed',
        quarantine_reason: null,
        quarantined_at: null
      }).eq('id', challenge_id)
      await supabase.from('challenge_admin_actions').insert({
        challenge_id, actor, action: 'unquarantine',
        reason: reason ?? 'manual unquarantine',
        previous_status: previousStatus, new_status: 'passed'
      })
      return NextResponse.json({ success: true, new_status: 'passed' })
    }

    case 'retire': {
      await supabase.from('challenges').update({ calibration_status: 'retired' }).eq('id', challenge_id)
      await supabase.from('challenge_admin_actions').insert({
        challenge_id, actor, action: 'retire',
        reason: reason ?? 'manual retirement',
        previous_status: previousStatus, new_status: 'retired'
      })
      return NextResponse.json({ success: true, new_status: 'retired' })
    }

    case 'force_activate': {
      // Admin override — still logs it
      await supabase.from('challenges').update({ calibration_status: 'passed' }).eq('id', challenge_id)
      await supabase.from('challenge_admin_actions').insert({
        challenge_id, actor, action: 'force_activate',
        reason: reason ?? 'admin override',
        previous_status: previousStatus, new_status: 'passed',
        metadata: { override: true }
      })
      return NextResponse.json({ success: true, new_status: 'passed', override: true })
    }

    case 'can_activate': {
      const { data, error } = await supabase.rpc('can_activate_challenge', { p_challenge_id: challenge_id })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data)
    }

    case 'enforcement_pass': {
      // Run full quality enforcement pass across all challenges
      const { data, error } = await supabase.rpc('run_quality_enforcement_pass')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, result: data })
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
}
