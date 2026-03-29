import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { updateAgentSchema } from '@/lib/validators/agent'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'

// Public agent fields — NEVER include api_key_hash, api_key_prefix, soul_config raw
const PUBLIC_AGENT_COLUMNS = 'id, user_id, name, bio, avatar_url, model_name, mps, weight_class_id, is_online, elo_rating, level, xp, wins, losses, draws, current_streak, created_at, updated_at, capability_tags, domain_tags, availability_status, contact_opt_in, website_url, runtime_metadata'

const idSchema = z.string().uuid('Invalid agent ID')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params

    const ip = getClientIp(request)
    const rl = await rateLimit(`agent-get:${ip}`, 60, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429, headers: { 'Retry-After': '60' } })
    }

    const supabase = await createClient()

    // Support both UUID and name/slug lookup
    const isUuid = idSchema.safeParse(rawId).success
    const agentQuery = isUuid
      ? supabase.from('agents').select(PUBLIC_AGENT_COLUMNS).eq('id', rawId).single()
      : supabase.from('agents').select(PUBLIC_AGENT_COLUMNS).eq('name', rawId).single()

    const { data: agent, error: agentError } = await agentQuery

    if (agentError) {
      if (agentError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
      }
      console.error('[api/agents/[id] GET] DB error:', agentError.message)
      return NextResponse.json({ error: 'Failed to load agent' }, { status: 500 })
    }

    const agentId = agent.id

    const { data: ratings, error: ratingsError } = await supabase
      .from('agent_ratings')
      .select('weight_class_id, rating, rating_deviation, wins, losses, challenges_entered, best_placement, current_streak')
      .eq('agent_id', agentId)

    if (ratingsError) {
      console.error('[api/agents/[id] GET] Ratings error:', ratingsError.message)
    }

    const { data: badges, error: badgesError } = await supabase
      .from('agent_badges')
      .select('id, badge_id, awarded_at, badge:badges(name, icon, rarity)')
      .eq('agent_id', agentId)

    if (badgesError) {
      console.error('[api/agents/[id] GET] Badges error:', badgesError.message)
    }

    const { data: recentEntries, error: entriesError } = await supabase
      .from('challenge_entries')
      .select('challenge_id, placement, final_score, elo_change, composite_score, process_score, strategy_score, integrity_adjustment, efficiency_score, status, created_at, challenge:challenges(id, title, category, status, format)')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (entriesError) {
      console.error('[api/agents/[id] GET] Entries error:', entriesError.message)
    }

    // Phase 3: capability profile
    const { data: capabilityProfile } = await supabase
      .from('agent_capability_profiles')
      .select('avg_composite_score, avg_process_score, avg_strategy_score, avg_integrity_score, avg_efficiency_score, reasoning_depth, tool_discipline, ambiguity_handling, recovery_quality, verification_discipline, strategic_planning, execution_precision, integrity_reliability, adaptation_speed, avg_thrash_rate, avg_verification_density, challenges_scored, best_composite_score, failure_premature_convergence, failure_visible_test_overfitting, failure_tool_misuse, failure_shallow_decomposition, failure_false_confidence, updated_at')
      .eq('agent_id', agentId)
      .maybeSingle()

    return NextResponse.json({
      agent: {
        ...agent,
        ratings: ratings ?? [],
        badges: (badges ?? []).map((ab) => {
          const badge = ab.badge as unknown as { name: string; icon: string; rarity: string } | null
          return {
            id: ab.id,
            badge_id: ab.badge_id,
            name: badge?.name ?? null,
            icon: badge?.icon ?? null,
            rarity: badge?.rarity ?? null,
            awarded_at: ab.awarded_at,
          }
        }),
        recent_entries: (recentEntries ?? []).map((e) => {
          const challenge = e.challenge as unknown as { title: string; category: string; format: string } | null
          return {
            challenge_id: e.challenge_id,
            title: challenge?.title ?? null,
            category: challenge?.category ?? null,
            format: challenge?.format ?? null,
            placement: e.placement,
            final_score: e.final_score,
            composite_score: e.composite_score,
            process_score: e.process_score,
            strategy_score: e.strategy_score,
            integrity_adjustment: e.integrity_adjustment,
            efficiency_score: e.efficiency_score,
            elo_change: e.elo_change,
            status: e.status,
            created_at: e.created_at,
          }
        }),
        // Phase 3: capability profile
        capability_profile: capabilityProfile ?? null,
      },
    })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[api/agents/[id] GET] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()

    const { id: rawId } = await params
    const idParsed = idSchema.safeParse(rawId)
    if (!idParsed.success) {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 })
    }
    const id = idParsed.data

    const ip = getClientIp(request)
    const rl = await rateLimit(`agent-patch:${user.id}`, 10, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429, headers: { 'Retry-After': '60' } })
    }

    const supabase = await createClient()

    const { data: agent, error: ownerError } = await supabase
      .from('agents')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (ownerError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    if (agent.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as unknown
    const parsed = updateAgentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('agents')
      .update(parsed.data)
      .eq('id', id)
      .select(PUBLIC_AGENT_COLUMNS)
      .single()

    if (updateError) {
      console.error('[api/agents/[id] PATCH] Update error:', updateError.message)
      return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 })
    }

    return NextResponse.json({ agent: updated })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (e.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[api/agents/[id] PATCH] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
