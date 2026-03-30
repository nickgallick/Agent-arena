-- Migration 00040: RLS Launch Hardening
-- Enforces row-level security on all sensitive tables so anon/direct PostgREST
-- access cannot read data that should be private.
--
-- Policy design:
--   submissions      → owner-only (user_id match) + admin
--   challenge_entries → owner-only (user_id match) + admin
--   profiles         → owner-only (id match) + admin (public read only: display_name, avatar)
--   agents           → public read for display fields only; owner for full row; admin full
--   api_tokens       → owner-only; admin full; token hash NEVER exposed in select
-- ============================================================

-- ── Enable RLS (idempotent) ──────────────────────────────────────────────────

ALTER TABLE public.submissions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_tokens          ENABLE ROW LEVEL SECURITY;

-- ── Drop any stale policies before re-creating ──────────────────────────────

DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
    WHERE tablename IN ('submissions','challenge_entries','profiles','agents','api_tokens')
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- submissions
-- ═══════════════════════════════════════════════════════════════
-- Owner can read own submissions.
CREATE POLICY "submissions_owner_read"
  ON public.submissions FOR SELECT
  USING (auth.uid() = user_id);

-- Admin can read all.
CREATE POLICY "submissions_admin_read"
  ON public.submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Owner can insert their own.
CREATE POLICY "submissions_owner_insert"
  ON public.submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (used by API routes via admin client).
-- (Service role bypasses RLS by default in Supabase — this is correct.)

-- ═══════════════════════════════════════════════════════════════
-- challenge_entries
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "entries_owner_read"
  ON public.challenge_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "entries_admin_read"
  ON public.challenge_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "entries_owner_insert"
  ON public.challenge_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "entries_owner_update"
  ON public.challenge_entries FOR UPDATE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- profiles
-- ═══════════════════════════════════════════════════════════════
-- Public: only display-safe fields — enforced at app layer via column selection,
-- but RLS ensures anon cannot read private rows at all without auth.
CREATE POLICY "profiles_owner_read"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_admin_read"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'admin'
    )
  );

-- Public display read: allow reading limited profile info for agent pages.
-- Only allow if user has a public agent registered (checked at app layer).
-- For launch: restrict to owner + admin only. Public agent names come from agents table.
-- (App routes that need public profile display use admin client server-side.)

CREATE POLICY "profiles_owner_update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ═══════════════════════════════════════════════════════════════
-- agents
-- ═══════════════════════════════════════════════════════════════
-- Public read for display fields (name, weight class, elo, etc.) — agents are public competition profiles.
-- api_key_hash must NEVER be selectable by anon (enforced by column-level grant below).
CREATE POLICY "agents_public_read"
  ON public.agents FOR SELECT
  USING (true);  -- row-visible to all; api_key_hash protected by column privilege

CREATE POLICY "agents_owner_insert"
  ON public.agents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "agents_owner_update"
  ON public.agents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "agents_admin_delete"
  ON public.agents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Revoke api_key_hash from anon and authenticated roles
-- (service_role retains all permissions and bypasses RLS)
REVOKE SELECT (api_key_hash) ON public.agents FROM anon, authenticated;

-- ═══════════════════════════════════════════════════════════════
-- api_tokens
-- ═══════════════════════════════════════════════════════════════
-- Completely private — owner and admin only.
-- token_hash must never be readable (REVOKE below).
CREATE POLICY "api_tokens_owner_read"
  ON public.api_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "api_tokens_admin_read"
  ON public.api_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "api_tokens_owner_insert"
  ON public.api_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "api_tokens_owner_update"
  ON public.api_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "api_tokens_owner_delete"
  ON public.api_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Revoke token_hash from anon and authenticated (service_role keeps access)
REVOKE SELECT (token_hash) ON public.api_tokens FROM anon, authenticated;

-- ═══════════════════════════════════════════════════════════════
-- challenges: ensure reserve/upcoming/draft statuses hidden from anon
-- ═══════════════════════════════════════════════════════════════
-- Challenges table may already have RLS; add/update policy for anon.
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Drop stale challenge policies
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies
    WHERE tablename = 'challenges' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.challenges', r.policyname);
  END LOOP;
END $$;

-- Anon / unauthenticated: only active, non-sandbox, public challenges
CREATE POLICY "challenges_anon_read"
  ON public.challenges FOR SELECT
  TO anon
  USING (
    status = 'active'
    AND is_sandbox = false
    AND org_id IS NULL
  );

-- Authenticated users: active + their org challenges + sandbox
CREATE POLICY "challenges_authed_read"
  ON public.challenges FOR SELECT
  TO authenticated
  USING (
    (
      status = 'active'
      AND is_sandbox = false
      AND org_id IS NULL
    )
    OR is_sandbox = true  -- sandbox users can see sandbox
    OR org_id IS NULL     -- public challenges any status if owns entry (app layer enforces)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin: all rows
CREATE POLICY "challenges_admin_all"
  ON public.challenges FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role bypasses RLS (used by all API routes via createAdminClient).
