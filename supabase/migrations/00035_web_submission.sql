-- Migration 00035: Web Submission System (Phase W0)
-- Adds:
--   1. challenges.web_submission_supported — admin flag, gates who can use web workspace
--   2. challenge_entries.session_id — links an entry to its active workspace session
--   3. submissions.submission_source — 'web' | 'connector' | 'api' | 'sdk' | 'github_action' | 'mcp'
--   4. Sandbox challenges (all 3 fixed UUIDs) flagged as web_submission_supported = true
--   5. challenge_entries.status extended to include 'workspace_open' for explicit state model

-- ============================================================
-- 1. challenges.web_submission_supported
-- ============================================================
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS web_submission_supported boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.challenges.web_submission_supported IS
  'When true, this challenge supports manual browser submission via the web workspace. '
  'Only sprint/standard text-artifact challenges should be flagged. '
  'Set by admin — gating mechanism for web path.';

CREATE INDEX IF NOT EXISTS idx_challenges_web_submission
  ON public.challenges(web_submission_supported)
  WHERE web_submission_supported = true;

-- ============================================================
-- 2. challenge_entries.session_id
-- ============================================================
ALTER TABLE public.challenge_entries
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES challenge_sessions(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.challenge_entries.session_id IS
  'FK to the active challenge_session for this entry. '
  'Populated idempotently when the user opens the web workspace. '
  'Null = no workspace session started yet.';

CREATE INDEX IF NOT EXISTS idx_entries_session
  ON public.challenge_entries(session_id)
  WHERE session_id IS NOT NULL;

-- ============================================================
-- 3. submissions.submission_source
-- ============================================================
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS submission_source text NOT NULL DEFAULT 'connector'
    CHECK (submission_source IN ('web', 'connector', 'api', 'sdk', 'github_action', 'mcp', 'internal'));

COMMENT ON COLUMN public.submissions.submission_source IS
  'Which path was used to submit. '
  'web = manual browser submission via workspace. '
  'connector = arena-connect CLI. '
  'api = direct v1 API call. '
  'sdk = TypeScript or Python SDK. '
  'github_action = CI/CD action. '
  'mcp = MCP tool. '
  'internal = test/admin submission.';

-- Backfill existing submissions that came via connector route
UPDATE public.submissions
  SET submission_source = 'connector'
  WHERE submission_source = 'connector'; -- no-op, just ensuring constraint passes

-- ============================================================
-- 4. challenge_entries.status — add 'workspace_open' state
-- ============================================================
-- Extend the existing CHECK constraint to include 'workspace_open'
ALTER TABLE public.challenge_entries
  DROP CONSTRAINT IF EXISTS challenge_entries_status_check;

ALTER TABLE public.challenge_entries
  ADD CONSTRAINT challenge_entries_status_check
    CHECK (status IN (
      'entered',         -- user entered, no workspace session opened
      'workspace_open',  -- workspace opened, session active, timer running (web path)
      'assigned',        -- assigned to a connector/agent
      'in_progress',     -- submission in progress (connector active)
      'submitted',       -- submission received, awaiting judging
      'judged',          -- result finalized
      'failed',          -- judging failed or session expired without submission
      'expired'          -- session expired with no submission (web path)
    ));

COMMENT ON COLUMN public.challenge_entries.status IS
  'Explicit participation state. '
  'entered: user has entered but has not started a workspace session or connected a runtime. '
  'workspace_open: web workspace is open, session created, timer running. '
  'assigned: entry is associated with an active connector/agent session. '
  'in_progress: connector is actively running. '
  'submitted: artifact received by platform, awaiting judging queue. '
  'judged: orchestrator finalized a result. '
  'failed: judging pipeline failed. '
  'expired: session timer ran out with no submission.';

-- ============================================================
-- 5. Flag sandbox challenges as web_submission_supported = true
-- ============================================================
-- The 3 seeded sandbox challenges (fixed UUIDs from 00029_sandbox.sql)
-- are sprint/standard format, text-artifact — valid for web submission V1.
UPDATE public.challenges
  SET web_submission_supported = true
  WHERE id IN (
    '00000000-0000-0000-0000-000000000001', -- [Sandbox] Hello Bouts (sprint)
    '00000000-0000-0000-0000-000000000002', -- [Sandbox] Echo Agent (standard)
    '00000000-0000-0000-0000-000000000003'  -- [Sandbox] Full Stack Test (marathon — V1 constrained, admin can decide)
  );

-- Note: 00000000-0000-0000-0000-000000000003 is marathon format.
-- Flagged here so the workspace renders (it's sandbox, lower stakes).
-- Admin can flip it back off if marathon session UX is not ready.
-- Production marathon challenges should NOT be flagged until V2.

-- ============================================================
-- 6. platform_events — add 'web' to known access_mode values (no constraint)
-- ============================================================
-- platform_events.access_mode is a free text field, no enum constraint.
-- 'web' is a valid value and will be logged by the web-submit route.
-- No schema change needed — documented here for clarity.

-- ============================================================
-- Verification
-- ============================================================
DO $$
BEGIN
  -- Verify columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challenges' AND column_name = 'web_submission_supported'
  ) THEN
    RAISE EXCEPTION 'challenges.web_submission_supported not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challenge_entries' AND column_name = 'session_id'
  ) THEN
    RAISE EXCEPTION 'challenge_entries.session_id not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'submission_source'
  ) THEN
    RAISE EXCEPTION 'submissions.submission_source not created';
  END IF;

  RAISE NOTICE 'Migration 00035 verified: all columns present';
END $$;
