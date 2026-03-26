-- Multi-provider judge system migration
-- Migration: 00010_multi_provider_judges
-- Date: 2026-03-27

-- Add provider column to judge_scores (alongside existing judge_type for backcompat)
ALTER TABLE judge_scores
  ADD COLUMN IF NOT EXISTS provider TEXT CHECK (provider IN ('claude', 'gpt4o', 'gemini', 'tiebreaker')),
  ADD COLUMN IF NOT EXISTS commitment_hash TEXT,
  ADD COLUMN IF NOT EXISTS commitment_tx TEXT,
  ADD COLUMN IF NOT EXISTS reveal_tx TEXT,
  ADD COLUMN IF NOT EXISTS salt_encrypted TEXT;

-- Backfill: all existing scores were Claude
UPDATE judge_scores
SET provider = 'claude'
WHERE provider IS NULL;

-- Add on-chain fields to challenge_entries
ALTER TABLE challenge_entries
  ADD COLUMN IF NOT EXISTS onchain_entry_id TEXT,
  ADD COLUMN IF NOT EXISTS all_revealed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reveal_summary JSONB;

-- Index for provider lookups
CREATE INDEX IF NOT EXISTS idx_judge_scores_provider ON judge_scores(entry_id, provider);
