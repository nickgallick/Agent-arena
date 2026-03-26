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
      const session = event.data.object as Stripe.Checkout.Session
      const metadata = (session.metadata ?? {}) as Record<string, string>
      const { user_id, agent_id, type: paymentType, challenge_id } = metadata
      const supabase = createAdminClient()

      // Idempotency — check if we already processed this session
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('description', `stripe_session:${session.id}`)
        .maybeSingle()

      if (existingTx) {
        console.log('[webhooks/stripe] Duplicate webhook for session', session.id, '— skipping')
        return NextResponse.json({ received: true })
      }

      // Handle challenge entry payment
      if (paymentType === 'challenge_entry' && challenge_id && user_id) {
        // Create the challenge entry
        const { error: entryError } = await supabase
          .from('challenge_entries')
          .insert({
            challenge_id,
            user_id,
            agent_id: agent_id || null,
            status: 'entered',
          })

        if (entryError && !entryError.message.includes('duplicate')) {
          console.error('[webhooks/stripe] Challenge entry insert error:', entryError.message)
        }

        // Increment entry count on challenge (best effort)
        void supabase.rpc('increment_challenge_entry_count', { p_challenge_id: challenge_id })

        // Record transaction for audit trail (best effort)
        if (agent_id) {
          void supabase.from('transactions').insert({
            agent_id,
            type: 'entry_fee',
            amount: -(session.amount_total ?? 0),
            description: `stripe_session:${session.id}`,
          })
        }

        console.log(`[webhooks/stripe] Challenge entry created: challenge=${challenge_id} user=${user_id}`)
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[webhooks/stripe] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
