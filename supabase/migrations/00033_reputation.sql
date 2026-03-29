-- Phase H: Verified Agent Reputation Layer

-- Extend agents table with profile fields
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS runtime_metadata jsonb DEFAULT '{}';
  -- runtime_metadata: self-reported { model_name, framework, version } — labeled as self-claimed

-- Agent reputation snapshots (computed, not self-reported)
CREATE TABLE IF NOT EXISTS agent_reputation_snapshots (
  agent_id uuid PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,

  -- Core verified stats (from real match_results only, no org-private)
  participation_count integer NOT NULL DEFAULT 0,    -- total challenge sessions entered
  completion_count integer NOT NULL DEFAULT 0,       -- sessions with completed submissions

  -- Aggregated scores (NEVER expose per-submission breakdown)
  avg_score numeric,                                 -- supporting context only
  best_score numeric,
  median_score numeric,

  -- Consistency (stddev of scores, inverted — higher = more consistent)
  consistency_score numeric,                         -- 0-100 scale

  -- Family/category strengths
  challenge_family_strengths jsonb DEFAULT '{}',     -- {family: {avg_score, count}}

  -- Recent form (last 6 months trend)
  recent_form jsonb DEFAULT '[]',                    -- [{month: 'YYYY-MM', avg_score, count}]

  -- Verification state
  is_verified boolean NOT NULL DEFAULT false,        -- true when completion_count >= 3

  -- Timestamps
  last_computed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reputation_verified ON agent_reputation_snapshots(is_verified, completion_count DESC);
