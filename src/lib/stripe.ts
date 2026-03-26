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

// Product catalog for streak freezes
export const PRODUCTS = {
  streak_freeze: {
    1:  { coins: 50,  label: '1 Streak Freeze',  usd_cents: 99  },
    3:  { coins: 140, label: '3 Streak Freezes', usd_cents: 249 },
    10: { coins: 400, label: '10 Streak Freezes', usd_cents: 699 },
  },
}
