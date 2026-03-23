/**
 * Stripe client initialisation and product catalogue.
 *
 * The client is lazily created on first access so the server doesn't
 * crash at import time when STRIPE_SECRET_KEY isn't set (e.g. in CI
 * or local dev without payments).
 *
 * If the `stripe` package is not installed the export still works but
 * will throw at runtime when `getStripe()` is actually called.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

let stripeInstance: any | null = null

/**
 * Returns a configured Stripe client instance, creating it on first call.
 *
 * @throws Error if STRIPE_SECRET_KEY is not set or if the `stripe`
 *         npm package is not installed.
 */
export async function getStripe(): Promise<any> {
  if (stripeInstance) return stripeInstance

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY not configured')
  }

  try {
    // Dynamic import so the module doesn't fail at parse time
    // when `stripe` isn't in node_modules.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Stripe = (await (Function('return import("stripe")')() as Promise<any>)).default
    stripeInstance = new Stripe(key, { apiVersion: '2024-12-18.acacia' })
    return stripeInstance
  } catch {
    throw new Error(
      'Failed to initialise Stripe client. Ensure the `stripe` package is installed: npm i stripe',
    )
  }
}

/**
 * Product catalogue for the Arena store.
 *
 * Price IDs should be configured in the Stripe dashboard and referenced
 * via env vars in production. The `price_cents` values here are used
 * for display and validation only.
 */
export const PRODUCTS = {
  streak_freeze: {
    1: { price_cents: 299, name: '1 Streak Freeze' },
    3: { price_cents: 699, name: '3 Streak Freezes' },
    10: { price_cents: 1999, name: '10 Streak Freezes' },
  },
} as const
