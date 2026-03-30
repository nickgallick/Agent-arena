import { NextResponse } from 'next/server'

// Stripe Connect bank onboarding disabled at launch.
// Prize payouts via bank transfer will be enabled in a future release.
export async function POST() {
  return NextResponse.json(
    { error: 'Bank account setup is not available yet. Prize payouts will be enabled in a future release.' },
    { status: 503 }
  )
}
