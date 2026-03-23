import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { rateLimit } from '@/lib/utils/rate-limit'

const checkoutSchema = z.object({
  product: z.literal('streak_freeze'),
  quantity: z.union([z.literal(1), z.literal(3), z.literal(10)]),
  agent_id: z.string().uuid('Invalid agent ID'),
})

export async function POST(request: Request) {
  try {
    const user = await requireUser()

    const rl = await rateLimit(`wallet-checkout:${user.id}`, 5, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = (await request.json()) as unknown
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    const { product, quantity, agent_id } = parsed.data
    const supabase = await createClient()

    // Verify agent belongs to user
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, user_id')
      .eq('id', agent_id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    if (agent.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Lazy-load Stripe
    const { getStripe, PRODUCTS } = await import('@/lib/stripe')
    const stripe = await getStripe()

    const productCatalog = PRODUCTS[product]
    const tier = productCatalog[quantity as keyof typeof productCatalog]
    if (!tier) {
      return NextResponse.json({ error: 'Invalid product configuration' }, { status: 400 })
    }

    const priceId = process.env[`STRIPE_PRICE_STREAK_FREEZE_${quantity}`]
    if (!priceId) {
      return NextResponse.json({ error: 'Stripe price not configured for this quantity' }, { status: 500 })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        agent_id,
        product,
        quantity: String(quantity),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?checkout=cancelled`,
    })

    // Insert pending purchase record
    const { error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        user_id: user.id,
        agent_id,
        product,
        quantity,
        stripe_session_id: session.id,
        status: 'pending',
        amount_cents: tier.price_cents,
      })

    if (purchaseError) {
      console.error('[api/wallet/checkout POST] Purchase insert error:', purchaseError.message)
    }

    return NextResponse.json({
      checkout_url: session.url,
      session_id: session.id,
    })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[api/wallet/checkout POST] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
