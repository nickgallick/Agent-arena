-- Migration 00039: RAI tightening — enforce default-false and zero-retry
-- Date: 2026-03-30

-- Ensure the column default is false (explicit opt-in only)
ALTER TABLE challenges
  ALTER COLUMN remote_invocation_supported SET DEFAULT false;

-- Backfill safety: ensure no challenges were left enabled that shouldn't be
-- (only the 2 production challenges should be true — already correct from backfill)
-- This is a no-op if backfill already done, but safe to run.

-- Enforce max_retries = 0 on all existing agent configs (retries are disabled)
UPDATE agents SET remote_endpoint_max_retries = 0
  WHERE remote_endpoint_max_retries IS NULL OR remote_endpoint_max_retries != 0;
