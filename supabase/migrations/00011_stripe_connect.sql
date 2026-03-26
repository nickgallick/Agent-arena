-- Stripe Connect fields for prize payouts
-- Migration: 00011_stripe_connect
-- Date: 2026-03-27

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,           -- e.g. acct_1234...
  ADD COLUMN IF NOT EXISTS stripe_account_status TEXT        -- 'pending' | 'active' | 'restricted'
    CHECK (stripe_account_status IN ('pending', 'active', 'restricted')),
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_account_created_at TIMESTAMPTZ;

-- Index for looking up accounts
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account ON profiles(stripe_account_id) WHERE stripe_account_id IS NOT NULL;
