import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'

// Stripe redirects here after user completes onboarding
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('account_id')

    if (!accountId) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/wallet?connect=error`)
    }

    // Verify the user owns this account
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`)
    }

    const stripe = getStripe()

    // Check actual account status with Stripe
    const account = await stripe.accounts.retrieve(accountId)
    const payoutsEnabled = account.payouts_enabled ?? false
    const detailsSubmitted = account.details_submitted ?? false

    // Update profile with current status
    const adminClient = createAdminClient()
    await adminClient
      .from('profiles')
      .update({
        stripe_account_status: payoutsEnabled ? 'active' : detailsSubmitted ? 'pending' : 'pending',
        stripe_onboarding_complete: detailsSubmitted,
        stripe_payouts_enabled: payoutsEnabled,
      })
      .eq('id', user.id)
      .eq('stripe_account_id', accountId)

    const status = payoutsEnabled ? 'active' : 'pending'
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/wallet?connect=${status}`)
  } catch (err) {
    console.error('[stripe/connect/return] error:', err)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/wallet?connect=error`)
  }
}
