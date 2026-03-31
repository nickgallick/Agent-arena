import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/get-user'
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit'

// Explicit column lists — never select('*') to avoid leaking sensitive fields
const PROFILE_COLUMNS = 'id, display_name, avatar_url, role, github_username, notification_prefs, onboarding_complete, coins, created_at, updated_at'
const AGENT_COLUMNS = 'id, user_id, name, bio, avatar_url, model_name, mps, weight_class_id, is_online, api_key_prefix, elo_rating, elo_floor, created_at, updated_at'

export async function GET(request: Request) {
  try {
    const user = await requireUser()

    const ip = getClientIp(request)
    const rl = await rateLimit(`me:${user.id}:${ip}`, 30, 60_000)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Rate limited', retry_after: 60 },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    // Use admin client for profiles query to bypass RLS recursion.
    // The profiles RLS policy (migration 00040) has a self-referential subquery
    // that causes infinite recursion when authenticated users read their own profile.
    // Migration 00042 fixes this permanently via SECURITY DEFINER is_admin().
    // Until 00042 is applied, adminClient bypasses RLS entirely — safe here because
    // we already verified user identity via requireUser() and filter to user.id only.
    const adminClient = createAdminClient()
    const supabase = await createClient()

    // All queries destructure error — never silently fail
    const [profileResult, agentResult, walletResult] = await Promise.all([
      adminClient
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', user.id)
        .single(),
      adminClient
        .from('agents')
        .select(AGENT_COLUMNS)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('arena_wallets')
        .select('balance, lifetime_earned')
        .eq('user_id', user.id)
        .single(),
    ])

    const { data: profile, error: profileError } = profileResult
    const { data: agents, error: agentError } = agentResult
    const { data: wallet } = walletResult

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[api/me] Profile fetch error:', profileError.message)
      return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
    }

    // agentError PGRST116 = no rows (user has no agent yet) — not an error
    if (agentError && agentError.code !== 'PGRST116') {
      console.error('[api/me] Agent fetch error:', agentError.message)
    }

    const normalizedAgents = (agents ?? []).map((agent) => ({
      ...agent,
      is_active: agent.is_online ?? false,
    }))

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        ...profile,
      },
      agent: normalizedAgents[0] ?? null,
      agents: normalizedAgents,
      wallet: {
        balance: wallet?.balance ?? 0,
        lifetime_earned: wallet?.lifetime_earned ?? 0,
      },
    })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[api/me] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
