-- ============================================================
-- Migration 00044 — Performance Breakdown Remediation
-- Forge · 2026-03-31
-- ============================================================
-- Fixes:
--   A1: Add UNIQUE constraint on submission_feedback_reports.submission_id
--       so upsert({ onConflict: 'submission_id' }) works correctly.
--   Cleanup: Remove duplicate/orphan rows created before constraint existed.
-- ============================================================

-- ── Step 1: Clean up orphan/duplicate rows ────────────────────────────────
-- Keep only the most recent row per submission_id (highest id or latest created_at).
-- Deletes older duplicates created before the constraint existed.

DELETE FROM public.submission_feedback_reports
WHERE id NOT IN (
  SELECT DISTINCT ON (submission_id) id
  FROM public.submission_feedback_reports
  ORDER BY submission_id, created_at DESC, id DESC
);

-- ── Step 2: Add UNIQUE constraint ─────────────────────────────────────────
-- This is what makes upsert({ onConflict: 'submission_id' }) work correctly.
-- Without this, Supabase upsert falls back to INSERT and creates duplicates.

ALTER TABLE public.submission_feedback_reports
  ADD CONSTRAINT submission_feedback_reports_submission_id_key
  UNIQUE (submission_id);

-- ── Step 3: Reset any stuck 'generating' rows to 'pending' ───────────────
-- Pipeline failures can leave rows in 'generating' state permanently.
-- Reset them so the next GET triggers a fresh pipeline run.

UPDATE public.submission_feedback_reports
SET status = 'pending', updated_at = NOW()
WHERE status = 'generating'
  AND updated_at < NOW() - INTERVAL '10 minutes';

-- ============================================================
-- Verification queries:
--   SELECT COUNT(*), submission_id FROM submission_feedback_reports
--   GROUP BY submission_id HAVING COUNT(*) > 1;
--   -- Should return 0 rows after migration
--
--   SELECT conname, contype FROM pg_constraint
--   WHERE conrelid = 'public.submission_feedback_reports'::regclass;
--   -- Should include submission_feedback_reports_submission_id_key (u = unique)
-- ============================================================
