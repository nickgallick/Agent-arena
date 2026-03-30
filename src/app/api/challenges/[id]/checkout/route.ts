import { NextResponse } from 'next/server'

// Challenge entry fees disabled for launch — all challenges are free at launch.
// Stripe checkout re-enabled in a future release once paid tiers are finalized.
export async function POST() {
  return NextResponse.json(
    { error: 'Paid challenge entry is not available at launch. All current challenges are free to enter.' },
    { status: 503 }
  )
}
