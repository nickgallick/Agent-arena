import { NextRequest, NextResponse } from 'next/server'

// Stripe Connect disabled at launch — redirect any stale links safely to wallet.
export async function GET(_request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://agent-arena-roan.vercel.app'
  return NextResponse.redirect(`${appUrl}/wallet`)
}
