-- ============================================================
-- 00019: Phase 2 — BoutsAgentSBT + BoutsScoreAggregator Integration
-- Forge · 2026-03-27
--
-- Contracts on Base mainnet:
--   BoutsAgentSBT:        0x26932E19544fBdD79b16dc1a628CdBA1a1531223
--   BoutsScoreAggregator: 0x2d9fcfc59CD6cb0297CcE78E1D9cA399c209e97e
--
-- Changes:
--   1. agents: add onchain_wallet_address, sbt_token_id, sbt_mint_tx
--   2. agent_ratings: add wins, losses, played, last_elo_tx, last_elo_commitment_hash
--   3. challenge_entries: add onchain_aggregated, onchain_aggregate_tx, result, final_score
-- ============================================================

-- ============================================================
-- 1. agents — SBT tracking
-- ============================================================

ALTER TABLE public.agents
  -- Agent's wallet address for SBT ownership (optional — oracle holds if not set)
  ADD COLUMN IF NOT EXISTS onchain_wallet_address text,
  -- SBT token ID (uint256 → bigint covers up to ~9.2e18)
  ADD COLUMN IF NOT EXISTS sbt_token_id bigint,
  -- When SBT was minted
  ADD COLUMN IF NOT EXISTS sbt_minted_at timestamptz,
  -- Mint transaction hash
  ADD COLUMN IF NOT EXISTS sbt_mint_tx text;

-- Index for fast SBT state lookup
CREATE INDEX IF NOT EXISTS idx_agents_sbt_token_id
  ON public.agents(sbt_token_id)
  WHERE sbt_token_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agents_sbt_minted
  ON public.agents(sbt_minted_at)
  WHERE sbt_minted_at IS NOT NULL;

-- ============================================================
-- 2. agent_ratings — cumulative stats + ELO commitment chain
-- ============================================================

ALTER TABLE public.agent_ratings
  -- Cumulative match stats (mirrors on-chain SBT data)
  ADD COLUMN IF NOT EXISTS wins   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS losses integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS played integer NOT NULL DEFAULT 0,
  -- On-chain token reference (redundant with agents.sbt_token_id for join-free access)
  ADD COLUMN IF NOT EXISTS onchain_token_id bigint,
  -- Last updateRating() transaction hash
  ADD COLUMN IF NOT EXISTS last_elo_tx text,
  -- Last ELO commitment hash (keccak256(agentId, newElo, challengeId, timestamp))
  ADD COLUMN IF NOT EXISTS last_elo_commitment_hash text;

CREATE INDEX IF NOT EXISTS idx_agent_ratings_token_id
  ON public.agent_ratings(onchain_token_id)
  WHERE onchain_token_id IS NOT NULL;

-- ============================================================
-- 3. challenge_entries — on-chain aggregation state
-- ============================================================

ALTER TABLE public.challenge_entries
  -- Whether aggregateScores() has been called on-chain for this entry
  ADD COLUMN IF NOT EXISTS onchain_aggregated       boolean  NOT NULL DEFAULT false,
  -- aggregateScores() transaction hash
  ADD COLUMN IF NOT EXISTS onchain_aggregate_tx     text,
  -- AggregationResult enum: 0=Consensus, 1=OutlierDiscarded, 2=Disputed
  ADD COLUMN IF NOT EXISTS onchain_aggregate_result smallint,
  -- Final score returned by aggregator (0–100, uint8 scaled)
  ADD COLUMN IF NOT EXISTS onchain_final_score      smallint;

CREATE INDEX IF NOT EXISTS idx_entries_onchain_aggregated
  ON public.challenge_entries(onchain_aggregated)
  WHERE onchain_aggregated = false AND status = 'judged';

-- ============================================================
-- 4. View: agent_chain_status — quick SBT + rating overview
-- ============================================================

CREATE OR REPLACE VIEW public.agent_chain_status AS
SELECT
  a.id            AS agent_id,
  a.name          AS agent_name,
  a.sbt_token_id,
  a.sbt_minted_at,
  a.onchain_wallet_address,
  ar.wins,
  ar.losses,
  ar.played,
  ar.rating       AS current_elo,
  ar.last_elo_tx,
  ar.last_elo_commitment_hash,
  CASE
    WHEN a.sbt_token_id IS NOT NULL THEN 'minted'
    ELSE 'not_minted'
  END             AS sbt_status
FROM public.agents a
LEFT JOIN public.agent_ratings ar
  ON ar.agent_id = a.id
  AND ar.weight_class_id = COALESCE(a.weight_class_id, 'frontier');

-- ============================================================
-- 5. Comment: Supabase Edge Function secrets required
-- (set via management API — not stored in DB)
--   BOUTS_SBT_ADDRESS        = 0x26932E19544fBdD79b16dc1a628CdBA1a1531223
--   BOUTS_AGGREGATOR_ADDRESS = 0x2d9fcfc59CD6cb0297CcE78E1D9cA399c209e97e
--   JUDGE_ORACLE_PRIVATE_KEY = <oracle wallet private key>
--   BASE_RPC_URL             = <Alchemy Base mainnet RPC>
--   CHAIN_ENV                = mainnet (or sepolia for testnet)
-- ============================================================

COMMENT ON COLUMN public.agents.sbt_token_id IS
  'BoutsAgentSBT token ID on Base mainnet (uint256). Null = not yet minted. Minted on first challenge entry.';

COMMENT ON COLUMN public.agents.onchain_wallet_address IS
  'Agent owner wallet for SBT ownership. If null, oracle holds as custodian until agent claims.';

COMMENT ON COLUMN public.challenge_entries.onchain_aggregate_result IS
  '0 = Consensus (median), 1 = OutlierDiscarded (avg of 2), 2 = Disputed (prize blocked)';
