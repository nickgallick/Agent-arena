import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { rateLimit } from '@/lib/utils/rate-limit'

const querySchema = z.object({
  agent_id: z.string().uuid().optional(),
  type: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export async function GET(request: Request) {
  try {
    const user = await requireUser()

    const rl = await rateLimit(`wallet:${user.id}`, 30, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const url = new URL(request.url)
    const parsed = querySchema.safeParse({
      agent_id: url.searchParams.get('agent_id') ?? undefined,
      type: url.searchParams.get('type') ?? undefined,
      page: url.searchParams.get('page') ?? 1,
      limit: url.searchParams.get('limit') ?? 20,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    const { agent_id, type, page, limit } = parsed.data
    const supabase = await createClient()

    // Get user's agents
    let agentQuery = supabase
      .from('agents')
      .select('id, coin_balance')
      .eq('user_id', user.id)

    if (agent_id) {
      agentQuery = agentQuery.eq('id', agent_id)
    }

    const { data: agents, error: agentsError } = await agentQuery

    if (agentsError) {
      console.error('[api/wallet GET] Agents error:', agentsError.message)
      return NextResponse.json({ error: 'Failed to load agents' }, { status: 500 })
    }

    const agentIds = (agents ?? []).map((a) => a.id)
    // Primary balance source: arena_wallets (user-level) → fallback to sum of agents.coin_balance
    const { data: arenaWallet } = await supabase
      .from('arena_wallets')
      .select('balance, lifetime_earned')
      .eq('user_id', user.id)
      .maybeSingle()

    const balance = arenaWallet?.balance ?? (agents ?? []).reduce((sum, a) => sum + (a.coin_balance ?? 0), 0)

    // Query transactions
    const offset = (page - 1) * limit

    let txQuery = supabase
      .from('transactions')
      .select('id, agent_id, type, amount, description, created_at', { count: 'exact' })
      .in('agent_id', agentIds.length > 0 ? agentIds : ['00000000-0000-0000-0000-000000000000'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (type) {
      txQuery = txQuery.eq('type', type)
    }

    const { data: transactions, count: total, error: txError } = await txQuery

    if (txError) {
      console.error('[api/wallet GET] Transactions error:', txError.message)
      return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 })
    }

    // Calculate lifetime earned/spent
    const { data: lifetimeData, error: lifetimeError } = await supabase
      .from('transactions')
      .select('type, amount')
      .in('agent_id', agentIds.length > 0 ? agentIds : ['00000000-0000-0000-0000-000000000000'])

    let lifetimeEarned = 0
    let lifetimeSpent = 0
    if (!lifetimeError && lifetimeData) {
      for (const tx of lifetimeData) {
        if (tx.amount > 0) lifetimeEarned += tx.amount
        else lifetimeSpent += Math.abs(tx.amount)
      }
    }

    // Get streak freezes from agent data
    const streakFreezes = 0 // Streak freezes disabled for V1

    // Use arena_wallets lifetime_earned if available, else compute from transactions
    const finalLifetimeEarned = arenaWallet?.lifetime_earned ?? lifetimeEarned

    return NextResponse.json({
      balance,
      lifetime_earned: finalLifetimeEarned,
      lifetime_spent: lifetimeSpent,
      streak_freezes: streakFreezes ?? 0,
      transactions: transactions ?? [],
      total: total ?? 0,
    })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[api/wallet GET] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
