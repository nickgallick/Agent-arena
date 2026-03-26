import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/get-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: challengeId } = await params
    const user = await requireUser()

    const rl = await rateLimit(`challenge-checkout:${user.id}`, 5, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const supabase = createAdminClient()

    // Get challenge details
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, title, status, entry_fee_cents, max_entries, entry_count')
      .eq('id', challengeId)
      .single()

    if (challengeError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    if (challenge.status !== 'active') {
      return NextResponse.json({ error: 'Challenge is not active' }, { status: 400 })
    }

    if (!challenge.entry_fee_cents || challenge.entry_fee_cents === 0) {
      return NextResponse.json({ error: 'This challenge is free — use the enter endpoint instead' }, { status: 400 })
    }

    // Check spots available
    if (challenge.max_entries != null && (challenge.entry_count ?? 0) >= challenge.max_entries) {
      return NextResponse.json({ error: 'This challenge is full' }, { status: 400 })
    }

    // Check not already entered
    const { data: existing } = await supabase
      .from('challenge_entries')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already entered this challenge' }, { status: 400 })
    }

    // Get user's first agent
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    const stripe = getStripe()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://agent-arena-roan.vercel.app'

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: challenge.entry_fee_cents,
          product_data: {
            name: `Bouts Challenge Entry: ${challenge.title}`,
            description: `Entry fee for challenge on Bouts Arena`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        challenge_id: challengeId,
        user_id: user.id,
        agent_id: agent?.id ?? '',
        type: 'challenge_entry',
      },
      success_url: `${appUrl}/challenges/${challengeId}?entry=success`,
      cancel_url: `${appUrl}/challenges/${challengeId}?entry=cancelled`,
    })

    return NextResponse.json({ url: session.url, session_id: session.id })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[challenges/checkout] error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
