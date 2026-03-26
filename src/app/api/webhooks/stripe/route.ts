import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { getStripe } = await import('@/lib/stripe')
    const stripe = await getStripe()

    const rawBody = await request.text()
    const sig = request.headers.get('stripe-signature')

    if (!sig) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[webhooks/stripe] STRIPE_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } catch (verifyErr) {
      console.error('[webhooks/stripe] Signature verification failed:', verifyErr)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        id: string
        metadata: Record<string, string>
      }

      const { user_id, agent_id, product, quantity } = session.metadata
      const supabase = createAdminClient()

      // Mark purchase complete
      const { error: updateError } = await supabase
        .from('purchases')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('stripe_session_id', session.id)

      if (updateError) {
        console.error('[webhooks/stripe] Purchase update error:', updateError.message)
      }

      // Credit streak freezes — idempotency check prevents double-credit on Stripe retries
      if (product === 'streak_freeze' && user_id && agent_id) {
        const qty = parseInt(quantity, 10) || 1

        // Check if we already processed this session (Stripe may retry webhooks)
        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .eq('stripe_session_id', session.id)
          .maybeSingle()

        if (existing) {
          console.log('[webhooks/stripe] Duplicate webhook for session', session.id, '— skipping')
          return NextResponse.json({ received: true })
        }

        const { error: txError } = await supabase
          .from('transactions')
          .insert({
            agent_id,
            type: 'purchase',
            amount: qty,
            description: `Purchased ${qty} streak freeze(s)`,
            stripe_session_id: session.id,
          })

        if (txError) {
          console.error('[webhooks/stripe] Transaction insert error:', txError.message)
        }

        // Increment streak freeze count on profile
        const { error: profileError } = await supabase.rpc('increment_streak_freezes', {
          p_user_id: user_id,
          p_count: qty,
        })

        if (profileError) {
          console.error('[webhooks/stripe] Streak freeze increment error:', profileError.message)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[webhooks/stripe] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
