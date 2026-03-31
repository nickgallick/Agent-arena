-- ============================================================
-- Migration 00042 — Fix RLS Recursion + Verify Feedback Columns
-- Forge · 2026-03-31
-- ============================================================
--
-- CRITICAL: The profiles_admin_read policy introduced in migration 00040
-- queries public.profiles FROM WITHIN a profiles policy, creating infinite
-- recursion when any code attempts to read profiles via the authenticated role.
--
-- Root cause:
--   CREATE POLICY "profiles_admin_read" ON public.profiles FOR SELECT
--   USING ( EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'admin') );
--   ^^^^^^^^^^^^^^^^^ SELF-REFERENTIAL — profiles querying profiles = infinite recursion
--
-- Fix: Replace self-referential profile query with JWT claims check.
-- Supabase stores the user's role in the JWT under app_metadata.role.
-- Reading JWT claims is recursion-safe because it does NOT query the DB.
--
-- Same fix applied to all other policies that query profiles to check role=admin:
-- submissions_admin_read, entries_admin_read, api_tokens_admin_read,
-- challenges_authed_read, challenges_admin_all, agents_admin_delete.
--
-- SAFETY NOTE: The JWT role claim is set by a trigger on profiles.role update
-- (or via service-role admin client). The app's requireAdmin() server-side function
-- should continue to use the admin client against the profiles table directly
-- (bypasses RLS, not affected by this change). This fix only affects the RLS
-- policies themselves — it does NOT change how API routes check admin status.
-- ============================================================

-- ── Part 1: Verify feedback columns exist (idempotent from migration 00041) ──
-- These should already exist if 00041 was applied; adding IF NOT EXISTS is safe.

ALTER TABLE public.judge_outputs
  ADD COLUMN IF NOT EXISTS positive_signal  TEXT,
  ADD COLUMN IF NOT EXISTS primary_weakness TEXT;

ALTER TABLE public.challenge_entries
  ADD COLUMN IF NOT EXISTS overall_verdict TEXT;

-- ── Part 2: Drop and recreate all affected policies ──────────────────────────
-- Drops are safe — we recreate all of them immediately below.

DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
    WHERE tablename IN ('submissions','challenge_entries','profiles','agents','api_tokens','challenges')
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ── Helper: is the current JWT from an admin? ─────────────────────────────────
-- Uses auth.jwt() → app_metadata → role. This is the CORRECT recursion-safe
-- pattern for Supabase RLS policies that need to check admin status.
-- app_metadata.role must be kept in sync by the profile role-change trigger
-- (see trigger: sync_jwt_admin_claim or equivalent in your auth hooks).
--
-- IMPORTANT: If your project does NOT yet have a JWT role sync trigger/hook,
-- use the SECURITY DEFINER function pattern below as a safe interim fallback.
-- ─────────────────────────────────────────────────────────────────────────────

-- Create a SECURITY DEFINER helper that checks admin role without RLS.
-- This is the recursion-safe approach when JWT claims aren't guaranteed in sync.
-- The function runs as the definer (postgres/service) and thus bypasses RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Recursion-safe: this function runs with SECURITY DEFINER and bypasses RLS,
  -- so it can safely query profiles without triggering the profiles RLS policy.
  -- Never call this function from inside the profiles RLS policy itself.
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ── submissions ──────────────────────────────────────────────────────────────

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submissions_owner_read"
  ON public.submissions FOR SELECT
  USING (auth.uid() = user_id);

-- FIXED: was EXISTS(SELECT 1 FROM public.profiles WHERE ...) — now uses is_admin()
-- Recursion-safe because is_admin() runs as SECURITY DEFINER and bypasses RLS.
CREATE POLICY "submissions_admin_read"
  ON public.submissions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "submissions_owner_insert"
  ON public.submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── challenge_entries ────────────────────────────────────────────────────────

ALTER TABLE public.challenge_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entries_owner_read"
  ON public.challenge_entries FOR SELECT
  USING (auth.uid() = user_id);

-- FIXED: was self-referential profiles query
CREATE POLICY "entries_admin_read"
  ON public.challenge_entries FOR SELECT
  USING (public.is_admin());

CREATE POLICY "entries_owner_insert"
  ON public.challenge_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "entries_owner_update"
  ON public.challenge_entries FOR UPDATE
  USING (auth.uid() = user_id);

-- ── profiles ─────────────────────────────────────────────────────────────────
-- THIS WAS THE SOURCE OF THE RECURSION.
-- Original policy queried profiles FROM WITHIN a profiles policy.
-- New policy uses is_admin() which is SECURITY DEFINER and bypasses RLS.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_owner_read"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- FIXED: was EXISTS(SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() ...)
-- That's profiles querying profiles = infinite recursion.
-- is_admin() is SECURITY DEFINER so it bypasses RLS when it queries profiles.
-- No recursion: the function's inner query runs outside of RLS context.
CREATE POLICY "profiles_admin_read"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "profiles_owner_update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── agents ───────────────────────────────────────────────────────────────────

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_public_read"
  ON public.agents FOR SELECT
  USING (true);

CREATE POLICY "agents_owner_insert"
  ON public.agents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "agents_owner_update"
  ON public.agents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- FIXED: was self-referential profiles query
CREATE POLICY "agents_admin_delete"
  ON public.agents FOR DELETE
  USING (public.is_admin());

-- Preserve column-level access restrictions
REVOKE SELECT (api_key_hash) ON public.agents FROM anon, authenticated;

-- ── api_tokens ───────────────────────────────────────────────────────────────

ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_tokens_owner_read"
  ON public.api_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- FIXED: was self-referential profiles query
CREATE POLICY "api_tokens_admin_read"
  ON public.api_tokens FOR SELECT
  USING (public.is_admin());

CREATE POLICY "api_tokens_owner_insert"
  ON public.api_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "api_tokens_owner_update"
  ON public.api_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "api_tokens_owner_delete"
  ON public.api_tokens FOR DELETE
  USING (auth.uid() = user_id);

REVOKE SELECT (token_hash) ON public.api_tokens FROM anon, authenticated;

-- ── challenges ───────────────────────────────────────────────────────────────

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Anon: active, non-sandbox, public challenges only
CREATE POLICY "challenges_anon_read"
  ON public.challenges FOR SELECT
  TO anon
  USING (
    status = 'active'
    AND is_sandbox = false
    AND org_id IS NULL
  );

-- Authenticated: active public + sandbox + their entries + admin sees all
-- FIXED: removed inline profiles subquery, now uses is_admin()
CREATE POLICY "challenges_authed_read"
  ON public.challenges FOR SELECT
  TO authenticated
  USING (
    (status = 'active' AND is_sandbox = false AND org_id IS NULL)
    OR is_sandbox = true
    OR public.is_admin()
  );

-- Admin: full access (insert, update, delete)
-- FIXED: was inline profiles subquery
CREATE POLICY "challenges_admin_all"
  ON public.challenges FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- End of migration 00042
-- Apply this in the Supabase SQL editor.
-- After applying: verify with the following queries:
--   SELECT * FROM public.profiles LIMIT 1;          -- should return data for admin
--   SELECT * FROM public.challenge_entries LIMIT 1; -- should work for owner
--   SELECT public.is_admin();                        -- should return true/false
-- ============================================================
