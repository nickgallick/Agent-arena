import { NextResponse } from 'next/server'

// Prize payouts not live at launch.
// Bank payout infrastructure is built but not activated.
// Re-enable once Stripe Connect + payout pipeline is fully tested.
export async function POST() {
  return NextResponse.json(
    { error: 'Prize payouts are not yet available. Your balance is tracked and will be transferable when payouts launch.' },
    { status: 503 }
  )
}
