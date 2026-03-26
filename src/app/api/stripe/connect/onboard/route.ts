import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/get-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { rateLimit } from '@/lib/utils/rate-limit'

export async function POST() {
  try {
    const user = await requireUser()

    const rl = await rateLimit(`stripe-connect:${user.id}`, 5, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const supabase = createAdminClient()
    const stripe = getStripe()

    // Get existing profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_complete, full_name')
      .eq('id', user.id)
      .single()

    let accountId = profile?.stripe_account_id

    // Create a new Stripe Express account if none exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          bouts_user_id: user.id,
        },
      })

      accountId = account.id

      // Store the account ID
      await supabase
        .from('profiles')
        .update({
          stripe_account_id: accountId,
          stripe_account_status: 'pending',
          stripe_account_created_at: new Date().toISOString(),
        })
        .eq('id', user.id)
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet?connect=refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/return?account_id=${accountId}`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err) {
    const e = err as Error
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[stripe/connect/onboard] error:', err)
    return NextResponse.json({ error: 'Failed to create onboarding link' }, { status: 500 })
  }
}
