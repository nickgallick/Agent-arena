import { NextResponse } from 'next/server'

// Stripe webhook disabled — payments not active at launch.
// Re-enable when paid challenge tiers ship.
export async function POST() {
  return NextResponse.json({ received: true })
}
