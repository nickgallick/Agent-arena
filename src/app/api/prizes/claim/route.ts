import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth/get-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/utils/rate-limit'
import { W9_THRESHOLD } from '@/lib/stripe'

const claimSchema = z.object({
  agent_id: z.string().uuid('Invalid agent ID'),
  amount_coins: z.number().int().positive('Amount must be positive'),
})

export async function POST(request: Request) {
  try {
    const user = await requireUser()

    const rl = await rateLimit(`prize-claim:${user.id}`, 3, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = claimSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { agent_id, amount_coins } = parsed.data
    const amountUsd = amount_coins / 100 // 100 coins = $1

    const supabase = createAdminClient()

    // Verify agent belongs to user
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, coin_balance, user_id')
      .eq('id', agent_id)
      .eq('user_id', user.id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    if (agent.coin_balance < amount_coins) {
      return NextResponse.json({ error: 'Insufficient coin balance' }, { status: 400 })
    }

    // Get user's compliance profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('annual_prize_total, w9_collected, full_name, state_of_residence')
      .eq('id', user.id)
      .single()

    const currentAnnualTotal = profile?.annual_prize_total ?? 0
    const newAnnualTotal = currentAnnualTotal + amountUsd

    // W-9 gate: if new total >= $600 and W-9 not collected, block and request W-9
    if (newAnnualTotal >= W9_THRESHOLD && !profile?.w9_collected) {
      return NextResponse.json({
        error: 'w9_required',
        message: `You've earned $${currentAnnualTotal.toFixed(2)} in prizes this year. Federal tax law requires us to collect your Tax ID before releasing prizes that bring your total to $${newAnnualTotal.toFixed(2)}.`,
        current_annual_total: currentAnnualTotal,
        new_annual_total: newAnnualTotal,
        threshold: W9_THRESHOLD,
      }, { status: 402 })
    }

    // Check restricted states
    const restrictedStates = ['WA', 'AZ', 'LA', 'MT', 'ID']
    if (profile?.state_of_residence && restrictedStates.includes(profile.state_of_residence)) {
      return NextResponse.json({ error: 'Prize payouts are not available in your state.' }, { status: 403 })
    }

    // All clear — process payout via Stripe
    // For now: create a Stripe payment intent / transfer record
    // In production this would be a Stripe Connect transfer to user's bank
    // For test mode: we record the claim and simulate payout

    // Deduct coins from agent
    const { error: deductError } = await supabase
      .from('agents')
      .update({ coin_balance: agent.coin_balance - amount_coins })
      .eq('id', agent_id)

    if (deductError) {
      return NextResponse.json({ error: 'Failed to deduct coins' }, { status: 500 })
    }

    // Record transaction
    await supabase.from('transactions').insert({
      agent_id,
      type: 'prize_payout',
      amount: -amount_coins,
      description: `Prize payout: $${amountUsd.toFixed(2)} USD`,
    })

    // Update annual prize total
    await supabase
      .from('profiles')
      .update({ annual_prize_total: newAnnualTotal })
      .eq('id', user.id)

    return NextResponse.json({
      success: true,
      amount_coins,
      amount_usd: amountUsd,
      annual_total: newAnnualTotal,
      message: `Payout of $${amountUsd.toFixed(2)} initiated. Allow 3-5 business days for bank transfer.`,
    })

  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[api/prizes/claim] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
