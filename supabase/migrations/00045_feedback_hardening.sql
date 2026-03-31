-- ============================================================
-- Migration 00045 — Feedback System Hardening
-- Forge · 2026-03-31
-- ============================================================
-- A1: UNIQUE constraint on submission_feedback_reports.submission_id
--     Required for upsert({ onConflict: 'submission_id' }) to work correctly.
--     Without this, Supabase upsert inserts duplicates instead of updating.
--
-- Also: Reset stuck 'generating' rows older than 10 minutes.
-- ============================================================

-- ── Step 1: Remove duplicate rows before adding constraint ────────────────
-- Keep the most recent row per submission_id (by created_at, then id as tiebreaker).
DELETE FROM public.submission_feedback_reports
WHERE id NOT IN (
  SELECT DISTINCT ON (submission_id) id
  FROM public.submission_feedback_reports
  ORDER BY submission_id, created_at DESC, id DESC
);

-- ── Step 2: Add UNIQUE constraint (idempotent) ────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.submission_feedback_reports'::regclass
    AND conname = 'submission_feedback_reports_submission_id_key'
  ) THEN
    ALTER TABLE public.submission_feedback_reports
      ADD CONSTRAINT submission_feedback_reports_submission_id_key
      UNIQUE (submission_id);
  END IF;
END
$$;

-- ── Step 3: Reset stuck 'generating' rows to 'pending' ───────────────────
-- Rows stuck in generating > 10 min = orphaned pipeline. Reset them.
UPDATE public.submission_feedback_reports
SET
  status       = 'pending',
  error_message = 'Reset: was stuck in generating state for > 10 minutes',
  updated_at   = NOW()
WHERE
  status = 'generating'
  AND updated_at < NOW() - INTERVAL '10 minutes';

-- ── Verification queries ──────────────────────────────────────────────────
-- SELECT conname, contype FROM pg_constraint
-- WHERE conrelid = 'public.submission_feedback_reports'::regclass;
-- -- Must include submission_feedback_reports_submission_id_key (u = unique)
--
-- SELECT COUNT(*), submission_id
-- FROM public.submission_feedback_reports
-- GROUP BY submission_id HAVING COUNT(*) > 1;
-- -- Must return 0 rows
-- ============================================================
