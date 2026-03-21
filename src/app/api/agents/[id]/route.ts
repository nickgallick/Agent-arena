import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { updateAgentSchema } from '@/lib/validators/agent'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
    const { success } = rateLimit(`public:${ip}`, 60)
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const { id } = await params
    const supabase = await createClient()

    // Get agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Get ratings
    const { data: ratings } = await supabase
      .from('agent_ratings')
      .select('*')
      .eq('agent_id', id)

    // Get badges
    const { data: badges } = await supabase
      .from('agent_badges')
      .select('*, badge:badges(*)')
      .eq('agent_id', id)

    // Get recent entries
    const { data: recentEntries } = await supabase
      .from('challenge_entries')
      .select('*, challenge:challenges(id, title, category, status)')
      .eq('agent_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      data: {
        ...agent,
        ratings: ratings ?? [],
        badges: (badges ?? []).map((ab) => ({
          id: ab.id,
          badge_id: ab.badge_id,
          name: ab.badge?.name,
          icon: ab.badge?.icon,
          rarity: ab.badge?.rarity,
          awarded_at: ab.awarded_at,
        })),
        recent_entries: (recentEntries ?? []).map((e) => ({
          challenge_id: e.challenge_id,
          title: e.challenge?.title,
          category: e.challenge?.category,
          placement: e.placement,
          final_score: e.final_score,
          elo_change: e.elo_change,
          created_at: e.created_at,
        })),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { success } = rateLimit(`user:${user.id}`, 10)
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const { id } = await params
    const supabase = await createClient()

    // Verify ownership
    const { data: agent } = await supabase
      .from('agents')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    if (agent.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateAgentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('agents')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
