/**
 * POST /api/v1/agents/[id]/interest
 * GET  /api/v1/agents/[id]/interest
 *
 * POST — Express interest in an agent (requires JWT auth).
 * Anti-spam: contact_opt_in check, rate limit, cooldown, message length, one active per pair.
 *
 * GET — Returns interest signals for an agent (owner only).
 * Returns: id, status, message, created_at, requester_user_id (no PII).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveAuth } from '@/lib/auth/token-auth'
import { logEvent } from '@/lib/analytics/log-event'
import { rateLimit } from '@/lib/utils/rate-limit'

const interestSchema = z.object({
  message: z.string().max(500, 'Message must be 500 characters or fewer').optional(),
})

// ─── POST — Send interest signal ──────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: agentId } = await params

    const auth = await resolveAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized — sign in to express interest' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // ── Anti-spam: Rate limit — 5 interest signals per user per hour ──────────
    const rl = await rateLimit(`interest-signal:${auth.user_id}`, 5, 3_600_000)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Rate limited — you can send at most 5 interest signals per hour' },
        { status: 429 }
      )
    }

    // ── Fetch agent — verify it exists and check contact_opt_in ───────────────
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, user_id, contact_opt_in, is_public')
      .eq('id', agentId)
      .maybeSingle()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // ── Anti-spam: Hard block if contact_opt_in = false ───────────────────────
    if (!agent.contact_opt_in) {
      return NextResponse.json(
        { error: 'This agent is not accepting contact' },
        { status: 403 }
      )
    }

    // ── Cannot signal your own agent ──────────────────────────────────────────
    if (agent.user_id === auth.user_id) {
      return NextResponse.json(
        { error: 'You cannot express interest in your own agent' },
        { status: 400 }
      )
    }

    // ── Validate message body ─────────────────────────────────────────────────
    const body = (await request.json().catch(() => ({}))) as unknown
    const parsed = interestSchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
      return NextResponse.json({ error: issues[0], details: issues }, { status: 400 })
    }
    const { message } = parsed.data

    // ── Anti-spam: Check cooldown — 24h before same requester can re-signal ───
    const { data: existingSignal } = await supabase
      .from('agent_interest_signals')
      .select('id, status, cooldown_until, created_at')
      .eq('agent_id', agentId)
      .eq('requester_user_id', auth.user_id)
      .maybeSingle()

    if (existingSignal) {
      // If there's a cooldown, enforce it
      if (existingSignal.cooldown_until && new Date(existingSignal.cooldown_until) > new Date()) {
        const resetsAt = new Date(existingSignal.cooldown_until).toISOString()
        return NextResponse.json(
          {
            error: 'Cooldown active — you must wait 24 hours before signaling this agent again',
            cooldown_until: resetsAt,
          },
          { status: 429 }
        )
      }
      // If existing signal is not pending, block re-signal (only UPSERT if pending)
      if (existingSignal.status !== 'pending') {
        return NextResponse.json(
          { error: 'You have already contacted this agent. Wait for a response.' },
          { status: 409 }
        )
      }
    }

    // ── Upsert interest signal ────────────────────────────────────────────────
    const cooldownUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { data: signal, error: upsertError } = await supabase
      .from('agent_interest_signals')
      .upsert(
        {
          agent_id: agentId,
          requester_user_id: auth.user_id,
          message: message ?? null,
          status: 'pending',
          cooldown_until: cooldownUntil,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'agent_id,requester_user_id',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single()

    if (upsertError) {
      console.error('[POST /api/v1/agents/[id]/interest] Upsert error:', upsertError.message)
      return NextResponse.json({ error: 'Failed to send interest signal' }, { status: 500 })
    }

    // ── Create in-app notification for agent owner ────────────────────────────
    const notifBody = `A platform user expressed interest in ${agent.name}.${message ? ' They left a message.' : ''}`
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: agent.user_id,
        type: 'interest_signal',
        title: 'Someone is interested in your agent',
        body: notifBody,
        data: { agent_id: agentId, signal_id: signal.id },
      })

    if (notifError) {
      // Non-critical — log but don't fail the request
      console.error('[POST /api/v1/agents/[id]/interest] Notification error:', notifError.message)
    }

    // ── Log analytics event ───────────────────────────────────────────────────
    logEvent({
      event_type: 'interest_signal_sent',
      auth,
      request,
      metadata: { agent_id: agentId },
    })

    return NextResponse.json({
      status: 'sent',
      message: 'Interest signal sent. The agent owner has been notified.',
      signal_id: signal.id,
    })
  } catch (err) {
    console.error('[POST /api/v1/agents/[id]/interest] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── GET — Fetch interest signals (owner only) ────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: agentId } = await params

    const auth = await resolveAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Verify agent exists and requester is owner
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, user_id')
      .eq('id', agentId)
      .maybeSingle()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    if (agent.user_id !== auth.user_id && !auth.is_admin) {
      return NextResponse.json({ error: 'Forbidden — not your agent' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100)
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10))
    const statusFilter = searchParams.get('status')

    let query = supabase
      .from('agent_interest_signals')
      .select('id, requester_user_id, message, status, created_at, updated_at', { count: 'exact' })
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const validStatuses = ['pending', 'acknowledged', 'declined']
    if (statusFilter && validStatuses.includes(statusFilter)) {
      query = query.eq('status', statusFilter)
    }

    const { data: signals, count, error } = await query

    if (error) {
      console.error('[GET /api/v1/agents/[id]/interest] DB error:', error.message)
      return NextResponse.json({ error: 'Failed to load interest signals' }, { status: 500 })
    }

    return NextResponse.json({ signals: signals ?? [], total: count ?? 0, limit, offset })
  } catch (err) {
    console.error('[GET /api/v1/agents/[id]/interest] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
