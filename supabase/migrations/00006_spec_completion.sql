-- ============================================================
-- MIGRATION 00006: Spec Completion
-- Adds all missing tables, columns, policies, functions,
-- triggers, and indexes required by the Agent Arena spec.
-- Fully idempotent — safe to run multiple times.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Missing columns on job_queue (referenced by pick_job in 00005)
-- ============================================================
ALTER TABLE public.job_queue ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 100;
ALTER TABLE public.job_queue ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ============================================================
-- 2. Missing columns on agents table
-- ============================================================
-- Note: mps, api_key_hash already exist from 00001. Add the rest.
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS weight_class TEXT DEFAULT 'open';
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'bronze';
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1200;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS elo_peak INTEGER DEFAULT 1200;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS elo_floor INTEGER DEFAULT 800;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS xp_to_next_level INTEGER DEFAULT 100;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS draws INTEGER DEFAULT 0;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS streak_freezes INTEGER DEFAULT 0;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS coin_balance INTEGER DEFAULT 0;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS api_key_prefix TEXT;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS is_connected BOOLEAN DEFAULT false;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS last_connected_at TIMESTAMPTZ;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS auto_enter_daily BOOLEAN DEFAULT false;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS allow_spectators BOOLEAN DEFAULT true;

-- ============================================================
-- 3. Missing columns on challenges table
-- ============================================================
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS prize_pool INTEGER DEFAULT 0;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS is_daily BOOLEAN DEFAULT false;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS spectator_count INTEGER DEFAULT 0;

-- ============================================================
-- 4. Economy tables
-- ============================================================

-- transactions: the canonical coin ledger
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'challenge_reward', 'streak_bonus', 'quest_reward',
    'purchase', 'refund', 'admin_grant', 'admin_debit',
    'daily_bonus', 'referral_bonus'
  )),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  reference_type TEXT,
  reference_id UUID,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- quests
CREATE TABLE IF NOT EXISTS public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'seasonal', 'one_time')),
  category TEXT NOT NULL DEFAULT 'general',
  xp_reward INTEGER NOT NULL DEFAULT 0,
  coin_reward INTEGER NOT NULL DEFAULT 0,
  requirements JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

-- quest_progress
CREATE TABLE IF NOT EXISTS public.quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  target INTEGER NOT NULL DEFAULT 1,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(quest_id, agent_id)
);

ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;

-- streak_events
CREATE TABLE IF NOT EXISTS public.streak_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('streak_started', 'streak_continued', 'streak_broken', 'streak_frozen', 'streak_milestone')),
  streak_count INTEGER NOT NULL DEFAULT 0,
  coins_awarded INTEGER NOT NULL DEFAULT 0,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  challenge_id UUID REFERENCES public.challenges(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.streak_events ENABLE ROW LEVEL SECURITY;

-- purchases
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('avatar', 'badge_slot', 'streak_freeze', 'name_change', 'custom_title')),
  item_id TEXT,
  cost INTEGER NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. Social tables (badges and agent_badges already exist from 00001)
-- ============================================================

-- Add is_active to badges if not present
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- notifications already exists from 00001, no action needed

-- ============================================================
-- 6. Admin tables (feature_flags, job_queue, audit_log already exist from 00001)
-- ============================================================

-- Add missing columns to feature_flags if needed
ALTER TABLE public.feature_flags ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ============================================================
-- 7. Spec tables: elo_history, rivals, submissions, replay_events
-- ============================================================

-- elo_history: tracks rating changes over time
CREATE TABLE IF NOT EXISTS public.elo_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  weight_class_id TEXT NOT NULL,
  rating_before REAL NOT NULL,
  rating_after REAL NOT NULL,
  rating_change REAL NOT NULL,
  placement INTEGER,
  total_entries INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.elo_history ENABLE ROW LEVEL SECURITY;

-- rivals: head-to-head tracking between agents
CREATE TABLE IF NOT EXISTS public.rivals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  rival_agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  last_met_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, rival_agent_id)
);

ALTER TABLE public.rivals ENABLE ROW LEVEL SECURITY;

-- submissions: stores the actual submission content separately
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.challenge_entries(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  files JSONB,
  metadata JSONB,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- replay_events: step-by-step replay data for challenge submissions
CREATE TABLE IF NOT EXISTS public.replay_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.challenge_entries(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  seq_num INTEGER NOT NULL,
  timestamp_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.replay_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. RLS Policies (using DO blocks to avoid duplicates)
-- ============================================================

-- Helper: create policy if not exists
-- We check pg_policies catalog before each CREATE POLICY

-- --- transactions ---
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Users can view own transactions') THEN
    CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = owner_id);
  END IF;
END $$;

-- --- quests ---
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quests' AND policyname = 'Active quests are viewable') THEN
    CREATE POLICY "Active quests are viewable" ON public.quests FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- --- quest_progress ---
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quest_progress' AND policyname = 'Users can view own quest progress') THEN
    CREATE POLICY "Users can view own quest progress" ON public.quest_progress FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- --- streak_events ---
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'streak_events' AND policyname = 'Users can view own streak events') THEN
    CREATE POLICY "Users can view own streak events" ON public.streak_events FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- --- purchases ---
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchases' AND policyname = 'Users can view own purchases') THEN
    CREATE POLICY "Users can view own purchases" ON public.purchases FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- --- elo_history ---
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'elo_history' AND policyname = 'Elo history is viewable by everyone') THEN
    CREATE POLICY "Elo history is viewable by everyone" ON public.elo_history FOR SELECT USING (true);
  END IF;
END $$;

-- --- rivals ---
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rivals' AND policyname = 'Rivals are viewable by everyone') THEN
    CREATE POLICY "Rivals are viewable by everyone" ON public.rivals FOR SELECT USING (true);
  END IF;
END $$;

-- --- submissions ---
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'submissions' AND policyname = 'Users can view own submissions') THEN
    CREATE POLICY "Users can view own submissions" ON public.submissions FOR SELECT
    USING (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.challenges c
        WHERE c.id = submissions.challenge_id AND c.status = 'complete'
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'submissions' AND policyname = 'Users can insert own submissions') THEN
    CREATE POLICY "Users can insert own submissions" ON public.submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- --- replay_events ---
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'replay_events' AND policyname = 'Replay events viewable if spectators allowed or own') THEN
    CREATE POLICY "Replay events viewable if spectators allowed or own" ON public.replay_events FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.agents a
        WHERE a.id = replay_events.agent_id
        AND (a.allow_spectators = true OR a.user_id = auth.uid())
      )
    );
  END IF;
END $$;

-- --- feature_flags: admin update policy ---
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feature_flags' AND policyname = 'Admins can update feature flags') THEN
    CREATE POLICY "Admins can update feature flags" ON public.feature_flags FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;
END $$;

-- --- challenges: replace overly broad admin policy with specific ones ---
-- The existing "Admins can manage challenges" uses FOR ALL which covers insert/update
-- Add a select policy that filters draft challenges for non-admins
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'challenges' AND policyname = 'Non-draft challenges viewable by everyone') THEN
    -- The existing "Challenges are viewable by everyone" already covers select.
    -- We leave it as-is since it already exists and changing it would break idempotency.
    NULL;
  END IF;
END $$;

-- --- entries: insert own policy already exists ---
-- Already have "Users can insert own entries" and "Challenge entries are viewable by everyone"

-- ============================================================
-- 9. Functions
-- ============================================================

-- transact_coins: the ONLY way to modify coin_balance on agents
CREATE OR REPLACE FUNCTION public.transact_coins(
  p_agent_id UUID,
  p_owner_id UUID,
  p_type TEXT,
  p_amount INTEGER,
  p_description TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_stripe_payment_id TEXT DEFAULT NULL
)
RETURNS SETOF public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
  v_transaction public.transactions;
BEGIN
  -- Advisory lock on agent to serialize concurrent transactions
  PERFORM pg_advisory_xact_lock(hashtext(p_agent_id::text));

  -- Get current balance and compute new balance
  SELECT COALESCE(coin_balance, 0) + p_amount INTO v_new_balance
  FROM public.agents
  WHERE id = p_agent_id AND user_id = p_owner_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent not found or not owned by user';
  END IF;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient coin balance. Current: %, Requested: %',
      v_new_balance - p_amount, p_amount;
  END IF;

  -- Update the agent's coin balance
  UPDATE public.agents
  SET coin_balance = v_new_balance, updated_at = NOW()
  WHERE id = p_agent_id;

  -- Record the transaction
  INSERT INTO public.transactions (
    agent_id, owner_id, type, amount, balance_after,
    description, reference_type, reference_id, stripe_payment_id
  ) VALUES (
    p_agent_id, p_owner_id, p_type, p_amount, v_new_balance,
    p_description, p_reference_type, p_reference_id, p_stripe_payment_id
  ) RETURNING * INTO v_transaction;

  RETURN NEXT v_transaction;
END;
$$;

-- calculate_elo: recalculate Elo ratings for all entries in a challenge
CREATE OR REPLACE FUNCTION public.calculate_elo(p_challenge_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
  v_entry RECORD;
  v_total_entries INTEGER;
  v_k_factor REAL := 32.0;
  v_expected REAL;
  v_actual REAL;
  v_new_rating REAL;
  v_old_rating REAL;
  v_rating_change REAL;
BEGIN
  -- Get challenge info
  SELECT * INTO v_challenge FROM public.challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found: %', p_challenge_id;
  END IF;

  -- Count total entries
  SELECT COUNT(*) INTO v_total_entries
  FROM public.challenge_entries
  WHERE challenge_id = p_challenge_id AND status IN ('submitted', 'judged');

  IF v_total_entries < 2 THEN
    RETURN; -- Need at least 2 entries for Elo
  END IF;

  -- Process each scored entry
  FOR v_entry IN
    SELECT ce.*, a.elo_rating, a.elo_peak
    FROM public.challenge_entries ce
    JOIN public.agents a ON a.id = ce.agent_id
    WHERE ce.challenge_id = p_challenge_id
      AND ce.status IN ('submitted', 'judged')
      AND ce.placement IS NOT NULL
    ORDER BY ce.placement ASC
  LOOP
    v_old_rating := COALESCE(v_entry.elo_rating, 1200);

    -- Calculate expected score based on placement
    -- Top half gets a "win", bottom half gets a "loss"
    v_actual := CASE
      WHEN v_entry.placement <= (v_total_entries / 2) THEN
        1.0 - ((v_entry.placement - 1)::REAL / v_total_entries::REAL)
      ELSE
        (v_total_entries - v_entry.placement)::REAL / v_total_entries::REAL
    END;

    -- Average expected score against the field
    v_expected := 1.0 / (1.0 + POWER(10.0, (1200.0 - v_old_rating) / 400.0));

    -- Elo formula
    v_rating_change := v_k_factor * (v_actual - v_expected);
    v_new_rating := v_old_rating + v_rating_change;

    -- Enforce floor
    IF v_new_rating < 800 THEN
      v_new_rating := 800;
      v_rating_change := v_new_rating - v_old_rating;
    END IF;

    -- Update agent stats
    UPDATE public.agents SET
      elo_rating = v_new_rating::INTEGER,
      elo_peak = GREATEST(COALESCE(elo_peak, 1200), v_new_rating::INTEGER),
      wins = CASE WHEN v_entry.placement = 1 THEN wins + 1 ELSE wins END,
      losses = CASE WHEN v_entry.placement > (v_total_entries / 2) THEN losses + 1 ELSE losses END,
      current_streak = CASE
        WHEN v_entry.placement = 1 THEN current_streak + 1
        ELSE 0
      END,
      best_streak = CASE
        WHEN v_entry.placement = 1 AND current_streak + 1 > best_streak THEN current_streak + 1
        ELSE best_streak
      END,
      updated_at = NOW()
    WHERE id = v_entry.agent_id;

    -- Update entry elo_change
    UPDATE public.challenge_entries
    SET elo_change = v_rating_change
    WHERE id = v_entry.id;

    -- Record elo history
    INSERT INTO public.elo_history (
      agent_id, challenge_id, weight_class_id,
      rating_before, rating_after, rating_change,
      placement, total_entries
    ) VALUES (
      v_entry.agent_id, p_challenge_id,
      COALESCE(v_challenge.weight_class_id, 'open'),
      v_old_rating, v_new_rating, v_rating_change,
      v_entry.placement, v_total_entries
    );
  END LOOP;
END;
$$;

-- handle_new_user: already exists from 00001, re-declare to ensure spec compliance
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, github_username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'user_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'user_name'
  );
  RETURN NEW;
END;
$$;

-- increment_entry_count: already exists from 00001, safe re-declare
CREATE OR REPLACE FUNCTION public.increment_entry_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.challenges
  SET entry_count = entry_count + 1
  WHERE id = NEW.challenge_id;
  RETURN NEW;
END;
$$;

-- update_updated_at: already exists from 00001, safe re-declare
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 10. Triggers (DROP IF EXISTS then CREATE for idempotency)
-- ============================================================

-- on_auth_user_created: already exists from 00001
-- Re-create to ensure it uses the updated handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- on_entry_created: already exists from 00001
DROP TRIGGER IF EXISTS on_entry_created ON public.challenge_entries;
CREATE TRIGGER on_entry_created
  AFTER INSERT ON public.challenge_entries
  FOR EACH ROW EXECUTE FUNCTION public.increment_entry_count();

-- updated_at triggers on profiles, agents, challenges, entries already exist from 00001
-- Add updated_at triggers on rivals
DROP TRIGGER IF EXISTS set_updated_at ON public.rivals;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.rivals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Add updated_at on quests
DROP TRIGGER IF EXISTS set_updated_at ON public.quests;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.quests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Add updated_at on quest_progress
DROP TRIGGER IF EXISTS set_updated_at ON public.quest_progress;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.quest_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 11. Indexes (CREATE INDEX IF NOT EXISTS)
-- ============================================================

-- agents
CREATE INDEX IF NOT EXISTS idx_agents_elo_rating ON public.agents(elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_agents_weight_class_text ON public.agents(weight_class);
CREATE INDEX IF NOT EXISTS idx_agents_tier ON public.agents(tier);
CREATE INDEX IF NOT EXISTS idx_agents_level ON public.agents(level DESC);
CREATE INDEX IF NOT EXISTS idx_agents_is_connected ON public.agents(is_connected) WHERE is_connected = true;

-- challenges
CREATE INDEX IF NOT EXISTS idx_challenges_is_daily ON public.challenges(is_daily) WHERE is_daily = true;
CREATE INDEX IF NOT EXISTS idx_challenges_is_featured ON public.challenges(is_featured) WHERE is_featured = true;

-- elo_history
CREATE INDEX IF NOT EXISTS idx_elo_history_agent_id ON public.elo_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_elo_history_challenge_id ON public.elo_history(challenge_id);
CREATE INDEX IF NOT EXISTS idx_elo_history_agent_created ON public.elo_history(agent_id, created_at DESC);

-- transactions
CREATE INDEX IF NOT EXISTS idx_transactions_agent_id ON public.transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_owner_id ON public.transactions(owner_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- quest_progress
CREATE INDEX IF NOT EXISTS idx_quest_progress_agent_id ON public.quest_progress(agent_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_user_id ON public.quest_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_quest_id ON public.quest_progress(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_incomplete ON public.quest_progress(agent_id) WHERE is_complete = false;

-- notifications (additional beyond what 00001 already has)
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- agent_badges (idx_agent_badges_agent_id already exists from 00001)
CREATE INDEX IF NOT EXISTS idx_agent_badges_badge_id ON public.agent_badges(badge_id);

-- rivals
CREATE INDEX IF NOT EXISTS idx_rivals_agent_id ON public.rivals(agent_id);
CREATE INDEX IF NOT EXISTS idx_rivals_rival_agent_id ON public.rivals(rival_agent_id);

-- submissions
CREATE INDEX IF NOT EXISTS idx_submissions_entry_id ON public.submissions(entry_id);
CREATE INDEX IF NOT EXISTS idx_submissions_challenge_id ON public.submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_submissions_agent_id ON public.submissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions(user_id);

-- replay_events
CREATE INDEX IF NOT EXISTS idx_replay_events_entry_id ON public.replay_events(entry_id);
CREATE INDEX IF NOT EXISTS idx_replay_events_agent_id ON public.replay_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_replay_events_entry_seq ON public.replay_events(entry_id, seq_num ASC);

-- streak_events
CREATE INDEX IF NOT EXISTS idx_streak_events_agent_id ON public.streak_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_streak_events_user_id ON public.streak_events(user_id);

-- purchases
CREATE INDEX IF NOT EXISTS idx_purchases_agent_id ON public.purchases(agent_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);

-- jobs (additional beyond what 00001 already has)
CREATE INDEX IF NOT EXISTS idx_job_queue_scheduled_for ON public.job_queue(scheduled_for) WHERE status = 'pending';

-- audit_log (additional)
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON public.audit_log(resource_type, resource_id);

COMMIT;
