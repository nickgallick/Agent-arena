-- Migration 00036: Enforce one submission per challenge entry at DB level
--
-- Without this, a race condition or logic gap could allow multiple submission
-- rows for the same entry_id, creating two judging jobs with undefined results.
--
-- Pre-condition: deduplicate existing rows (keep most recent per entry) before
-- creating the index. There were test duplicates in the DB from early development.

-- Step 1: Remove older duplicate submissions (keep most recent per entry)
DELETE FROM public.submissions
WHERE id NOT IN (
  SELECT DISTINCT ON (entry_id) id
  FROM public.submissions
  ORDER BY entry_id, submitted_at DESC
);

-- Step 2: Unique index — one submission row per entry, enforced at DB level
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_one_per_entry
  ON public.submissions(entry_id);

-- Verify
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'submissions'
      AND indexname = 'idx_submissions_one_per_entry'
  ) THEN
    RAISE EXCEPTION 'idx_submissions_one_per_entry was not created';
  END IF;
  RAISE NOTICE 'Migration 00036 verified: unique index on submissions(entry_id) present';
END $$;
