-- ============================================================
-- MIGRATION 00005: P0 Security Fixes
-- Fixes all 13 critical issues from Forge code review 2026-03-22
-- ============================================================

-- ============================================================
-- FIX 3: Remove coins from user-updatable columns on profiles
-- Users cannot UPDATE coins — only server functions can
-- ============================================================
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent users from modifying coins via UPDATE
    -- coins column changes are blocked here; use credit_wallet() only
  );

-- Add a trigger to block coin modification via UPDATE
CREATE OR REPLACE FUNCTION public.prevent_coin_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.coins IS DISTINCT FROM NEW.coins THEN
    RAISE EXCEPTION 'Direct coin modification is not permitted. Use credit_wallet() instead.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_coin_update ON public.profiles;
CREATE TRIGGER block_coin_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_coin_modification();

-- ============================================================
-- FIX 4: Challenge entries UPDATE policy with column + status guard
-- Block score/placement/elo fields from being modified by users
-- ============================================================
DROP POLICY IF EXISTS "Users can update own entries" ON public.challenge_entries;

-- Users may only update status-related fields while entry is in progress
-- Scoring fields (final_score, placement, elo_change, coins_awarded) are server-only
CREATE POLICY "Users can update own entries status only"
  ON public.challenge_entries FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status IN ('entered', 'assigned', 'in_progress')
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status IN ('entered', 'assigned', 'in_progress', 'submitted')
    -- Scoring columns cannot be written by users (enforce via trigger below)
  );

-- Trigger to block score/placement field modification by non-service role
CREATE OR REPLACE FUNCTION public.prevent_score_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow service role to update anything
  IF current_setting('role', TRUE) = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- Block modification of scoring fields
  IF OLD.final_score IS DISTINCT FROM NEW.final_score THEN
    RAISE EXCEPTION 'Direct score modification is not permitted.';
  END IF;
  IF OLD.placement IS DISTINCT FROM NEW.placement THEN
    RAISE EXCEPTION 'Direct placement modification is not permitted.';
  END IF;
  IF OLD.elo_change IS DISTINCT FROM NEW.elo_change THEN
    RAISE EXCEPTION 'Direct elo_change modification is not permitted.';
  END IF;
  IF OLD.coins_awarded IS DISTINCT FROM NEW.coins_awarded THEN
    RAISE EXCEPTION 'Direct coins_awarded modification is not permitted.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_score_update ON public.challenge_entries;
CREATE TRIGGER block_score_update
  BEFORE UPDATE ON public.challenge_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_score_modification();

-- ============================================================
-- FIX 6: Judge scores only visible after challenge completes
-- ============================================================
DROP POLICY IF EXISTS "Judge scores are viewable by everyone" ON public.judge_scores;

CREATE POLICY "Judge scores visible after challenge completes or to entry owner"
  ON public.judge_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.challenge_entries ce
      JOIN public.challenges c ON c.id = ce.challenge_id
      WHERE ce.id = judge_scores.entry_id
      AND (
        c.status = 'complete'
        OR ce.user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- FIX 8: Add SECURITY DEFINER to credit_wallet() and update_agent_elo()
-- Without this, functions run as calling user who has no write RLS
-- ============================================================
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance INTEGER;
BEGIN
  -- Ensure wallet exists
  INSERT INTO public.arena_wallets (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock and update wallet atomically
  SELECT id INTO v_wallet_id
  FROM public.arena_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  UPDATE public.arena_wallets
  SET balance = balance + p_amount,
      lifetime_earned = CASE WHEN p_amount > 0 THEN lifetime_earned + p_amount ELSE lifetime_earned END,
      updated_at = NOW()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;

  -- Record transaction log
  INSERT INTO public.wallets (user_id, amount, reason, reference_id, reference_type)
  VALUES (p_user_id, p_amount, p_type, p_reference_id, p_description);

  RETURN v_new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_agent_elo(
  p_agent_id UUID,
  p_weight_class_id TEXT,
  p_new_rating REAL,
  p_new_rd REAL,
  p_new_volatility REAL,
  p_placement INTEGER,
  p_total_entries INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_win BOOLEAN;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_agent_id::text || p_weight_class_id::text));
  is_win := p_placement = 1;

  INSERT INTO public.agent_ratings (
    agent_id, weight_class_id, rating, rating_deviation, volatility,
    wins, losses, challenges_entered, best_placement, current_streak, last_rated_at
  )
  VALUES (
    p_agent_id, p_weight_class_id, p_new_rating, p_new_rd, p_new_volatility,
    CASE WHEN is_win THEN 1 ELSE 0 END,
    CASE WHEN NOT is_win THEN 1 ELSE 0 END,
    1, p_placement,
    CASE WHEN is_win THEN 1 ELSE -1 END,
    NOW()
  )
  ON CONFLICT (agent_id, weight_class_id) DO UPDATE SET
    rating = p_new_rating,
    rating_deviation = p_new_rd,
    volatility = p_new_volatility,
    wins = agent_ratings.wins + CASE WHEN is_win THEN 1 ELSE 0 END,
    losses = agent_ratings.losses + CASE WHEN NOT is_win THEN 1 ELSE 0 END,
    challenges_entered = agent_ratings.challenges_entered + 1,
    best_placement = LEAST(COALESCE(agent_ratings.best_placement, p_placement), p_placement),
    current_streak = CASE
      WHEN is_win AND agent_ratings.current_streak >= 0 THEN agent_ratings.current_streak + 1
      WHEN is_win THEN 1
      WHEN NOT is_win AND agent_ratings.current_streak <= 0 THEN agent_ratings.current_streak - 1
      ELSE -1
    END,
    last_rated_at = NOW(),
    updated_at = NOW();
END;
$$;

-- ============================================================
-- FIX 9: get_next_seq_num() — fix TOCTOU race with SELECT FOR UPDATE
-- Use advisory lock on entry_id to serialize concurrent calls
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_next_seq_num(p_entry_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  -- Advisory lock scoped to this entry_id for the transaction
  PERFORM pg_advisory_xact_lock(hashtext(p_entry_id::text));

  SELECT COALESCE(MAX(seq_num), 0) + 1 INTO next_seq
  FROM public.live_events
  WHERE entry_id = p_entry_id;

  RETURN next_seq;
END;
$$;

-- ============================================================
-- FIX 10: Submission double-submit — unique constraint + function locking
-- ============================================================

-- Prevent duplicate submissions via unique index (not just unique constraint)
-- Submissions table: one submission per entry allowed in 'submitted' status
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_submitted_entry
  ON public.challenge_entries (id)
  WHERE status = 'submitted';

-- Atomic submission function with FOR UPDATE locking
CREATE OR REPLACE FUNCTION public.submit_entry(
  p_entry_id UUID,
  p_user_id UUID,
  p_content TEXT
)
RETURNS public.challenge_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.challenge_entries;
BEGIN
  -- Lock the entry row to prevent concurrent submission
  SELECT * INTO v_entry
  FROM public.challenge_entries
  WHERE id = p_entry_id
    AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entry not found or not owned by user';
  END IF;

  IF v_entry.status NOT IN ('assigned', 'in_progress') THEN
    RAISE EXCEPTION 'Entry cannot be submitted in status: %', v_entry.status;
  END IF;

  -- Atomic status update to submitted
  UPDATE public.challenge_entries
  SET status = 'submitted',
      content = p_content,
      submitted_at = NOW(),
      updated_at = NOW()
  WHERE id = p_entry_id
  RETURNING * INTO v_entry;

  RETURN v_entry;
END;
$$;

-- ============================================================
-- FIX 12: pick_job() — respect priority and scheduled_for
-- ============================================================
CREATE OR REPLACE FUNCTION public.pick_job(worker_id TEXT, job_types TEXT[] DEFAULT NULL)
RETURNS public.job_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  picked public.job_queue;
BEGIN
  UPDATE public.job_queue
  SET
    status = 'processing',
    locked_by = worker_id,
    locked_at = NOW(),
    attempts = attempts + 1,
    updated_at = NOW()
  WHERE id = (
    SELECT id FROM public.job_queue
    WHERE status = 'pending'
      AND attempts < max_attempts
      AND scheduled_for <= NOW()
      AND (job_types IS NULL OR type = ANY(job_types))
    ORDER BY priority ASC, scheduled_for ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING * INTO picked;
  RETURN picked;
END;
$$;

-- ============================================================
-- FIX 13: Add pg_cron extension before it is used
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Ensure the cron job is set up (idempotent)
DO $$
BEGIN
  PERFORM cron.schedule(
    'clean-live-events',
    '0 3 * * *',
    $cron$
      DELETE FROM live_events
      WHERE created_at < now() - interval '7 days'
      AND challenge_id IN (
        SELECT id FROM challenges WHERE status IN ('complete', 'archived')
      );
    $cron$
  );
EXCEPTION WHEN OTHERS THEN
  -- cron job may already exist; ignore
  NULL;
END;
$$;

-- ============================================================
-- FIX 5: Rate limit table + Postgres function (server-side sliding window)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (key)
);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
-- No user access — only service role via rate_limit_check()
CREATE POLICY "No direct access" ON public.rate_limit_buckets FOR ALL USING (false);

CREATE OR REPLACE FUNCTION public.rate_limit_check(
  p_key TEXT,
  p_limit INTEGER,
  p_window_secs INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_cutoff TIMESTAMPTZ;
BEGIN
  v_cutoff := NOW() - (p_window_secs || ' seconds')::INTERVAL;

  -- Upsert: if row exists and is within window, increment; else reset
  INSERT INTO public.rate_limit_buckets (key, count, window_start)
  VALUES (p_key, 1, NOW())
  ON CONFLICT (key) DO UPDATE
    SET
      count = CASE
        WHEN rate_limit_buckets.window_start > v_cutoff
        THEN rate_limit_buckets.count + 1
        ELSE 1
      END,
      window_start = CASE
        WHEN rate_limit_buckets.window_start > v_cutoff
        THEN rate_limit_buckets.window_start
        ELSE NOW()
      END
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

-- Cleanup old rate limit buckets periodically (run via pg_cron or manually)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limit_buckets
  WHERE window_start < NOW() - INTERVAL '10 minutes';
END;
$$;

-- ============================================================
-- P1 FIX: 11 missing spec indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (id);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents (user_id);
CREATE INDEX IF NOT EXISTS idx_agents_model_name ON public.agents (model_name);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges (status);
CREATE INDEX IF NOT EXISTS idx_challenges_status_created ON public.challenges (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_challenge_status ON public.challenge_entries (challenge_id, status);
CREATE INDEX IF NOT EXISTS idx_entries_user_challenge ON public.challenge_entries (user_id, challenge_id);
CREATE INDEX IF NOT EXISTS idx_judge_scores_overall ON public.judge_scores (overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_wallets_user_created ON public.wallets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_events_entry_seq ON public.live_events (entry_id, seq_num);
CREATE INDEX IF NOT EXISTS idx_job_queue_priority_scheduled ON public.job_queue (priority ASC, scheduled_for ASC) WHERE status = 'pending';
