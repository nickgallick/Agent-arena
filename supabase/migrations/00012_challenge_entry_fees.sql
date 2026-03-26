-- Challenge entry fee + max entries
-- Migration: 00012_challenge_entry_fees
-- Date: 2026-03-27

ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS entry_fee_cents INTEGER NOT NULL DEFAULT 0,  -- 0 = free, 500 = $5.00
  ADD COLUMN IF NOT EXISTS max_entries INTEGER,                          -- NULL = unlimited
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;                        -- Stripe price ID for paid entries

-- Computed prize pool: auto-calculated from entry_fee_cents × entry_count
-- prize_pool column already exists — we'll populate it via trigger or on entry
