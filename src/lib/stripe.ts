import Stripe from 'stripe'

// W-9 threshold — triggers tax collection before prize release
export const W9_THRESHOLD = 600

// Coin → USD conversion rate
export const COINS_PER_USD = 100 // 100 coins = $1

// Lazy singleton — avoids initializing at module load (edge-safe)
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(key, { apiVersion: '2026-03-25.dahlia' })
  }
  return _stripe
}

// Named export for direct use
export const stripe = {
  get instance() { return getStripe() }
}

// Product catalog — streak freezes disabled for V1
// Will be re-enabled when entry fee pricing is finalized
export const PRODUCTS = {} as const
