import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia',
})

// W-9 threshold — triggers tax collection before prize release
export const W9_THRESHOLD = 600

// Coin → USD conversion rate
export const COINS_PER_USD = 100 // 100 coins = $1
