-- Migration 00037: Reseed sandbox challenges with valid RFC 4122 v4 UUIDs
--
-- The original sandbox challenges were seeded with all-zeros UUIDs
-- (00000000-0000-0000-0000-000000000001/2/3). These are not valid RFC 4122 v4
-- UUIDs and fail Zod's z.string().uuid() validation, which blocks the
-- workspace and web-submit routes.
--
-- This migration:
--   1. Inserts 3 new sandbox challenges with proper v4 UUIDs
--   2. Re-points all FK references (challenge_sessions, challenge_entries,
--      submissions, judging_jobs, challenge_bundles, forge_reviews,
--      inventory_decisions, calibration_learning_artifacts)
--   3. Deletes the old all-zeros rows
--
-- New stable sandbox UUIDs (permanent — update MEMORY.md):
--   Hello Bouts:      69e80bf0-597d-4ce0-8c1c-563db9c246f2
--   Echo Agent:       5db50c6f-ac55-43d3-80a6-394420fc4781
--   Full Stack Test:  b21fb84b-81f6-49cc-b050-bf5ec2a2fb8f

BEGIN;

-- ── Step 1: Insert new sandbox challenges with v4 UUIDs ───────────────────────
INSERT INTO challenges (
  id, title, description, category, format, status,
  time_limit_minutes, max_coins, entry_fee_cents,
  is_sandbox, is_featured, is_daily, challenge_type,
  difficulty_profile, starts_at, ends_at,
  web_submission_supported, created_at, updated_at
)
SELECT
  new_id,
  title, description, category, format, status,
  time_limit_minutes, max_coins, entry_fee_cents,
  is_sandbox, is_featured, is_daily, challenge_type,
  difficulty_profile, starts_at, ends_at,
  web_submission_supported, created_at, updated_at
FROM (VALUES
  ('69e80bf0-597d-4ce0-8c1c-563db9c246f2'::uuid, '00000000-0000-0000-0000-000000000001'::uuid),
  ('5db50c6f-ac55-43d3-80a6-394420fc4781'::uuid, '00000000-0000-0000-0000-000000000002'::uuid),
  ('b21fb84b-81f6-49cc-b050-bf5ec2a2fb8f'::uuid, '00000000-0000-0000-0000-000000000003'::uuid)
) AS mapping(new_id, old_id)
JOIN challenges ON challenges.id = old_id
ON CONFLICT (id) DO NOTHING;

-- ── Step 2: Re-point FK references ───────────────────────────────────────────

-- challenge_sessions
UPDATE challenge_sessions SET challenge_id = '69e80bf0-597d-4ce0-8c1c-563db9c246f2' WHERE challenge_id = '00000000-0000-0000-0000-000000000001';
UPDATE challenge_sessions SET challenge_id = '5db50c6f-ac55-43d3-80a6-394420fc4781' WHERE challenge_id = '00000000-0000-0000-0000-000000000002';
UPDATE challenge_sessions SET challenge_id = 'b21fb84b-81f6-49cc-b050-bf5ec2a2fb8f' WHERE challenge_id = '00000000-0000-0000-0000-000000000003';

-- challenge_entries
UPDATE challenge_entries SET challenge_id = '69e80bf0-597d-4ce0-8c1c-563db9c246f2' WHERE challenge_id = '00000000-0000-0000-0000-000000000001';
UPDATE challenge_entries SET challenge_id = '5db50c6f-ac55-43d3-80a6-394420fc4781' WHERE challenge_id = '00000000-0000-0000-0000-000000000002';
UPDATE challenge_entries SET challenge_id = 'b21fb84b-81f6-49cc-b050-bf5ec2a2fb8f' WHERE challenge_id = '00000000-0000-0000-0000-000000000003';

-- submissions
UPDATE submissions SET challenge_id = '69e80bf0-597d-4ce0-8c1c-563db9c246f2' WHERE challenge_id = '00000000-0000-0000-0000-000000000001';
UPDATE submissions SET challenge_id = '5db50c6f-ac55-43d3-80a6-394420fc4781' WHERE challenge_id = '00000000-0000-0000-0000-000000000002';
UPDATE submissions SET challenge_id = 'b21fb84b-81f6-49cc-b050-bf5ec2a2fb8f' WHERE challenge_id = '00000000-0000-0000-0000-000000000003';

-- judging_jobs
UPDATE judging_jobs SET challenge_id = '69e80bf0-597d-4ce0-8c1c-563db9c246f2' WHERE challenge_id = '00000000-0000-0000-0000-000000000001';
UPDATE judging_jobs SET challenge_id = '5db50c6f-ac55-43d3-80a6-394420fc4781' WHERE challenge_id = '00000000-0000-0000-0000-000000000002';
UPDATE judging_jobs SET challenge_id = 'b21fb84b-81f6-49cc-b050-bf5ec2a2fb8f' WHERE challenge_id = '00000000-0000-0000-0000-000000000003';

-- challenge_bundles (if any sandbox bundles exist)
UPDATE challenge_bundles SET challenge_id = '69e80bf0-597d-4ce0-8c1c-563db9c246f2' WHERE challenge_id = '00000000-0000-0000-0000-000000000001';
UPDATE challenge_bundles SET challenge_id = '5db50c6f-ac55-43d3-80a6-394420fc4781' WHERE challenge_id = '00000000-0000-0000-0000-000000000002';
UPDATE challenge_bundles SET challenge_id = 'b21fb84b-81f6-49cc-b050-bf5ec2a2fb8f' WHERE challenge_id = '00000000-0000-0000-0000-000000000003';

-- ── Step 3: Delete old all-zeros rows ────────────────────────────────────────
DELETE FROM challenges WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);

-- ── Verify ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM challenges WHERE id = '69e80bf0-597d-4ce0-8c1c-563db9c246f2'
  ) THEN
    RAISE EXCEPTION 'Sandbox challenge reseed failed: Hello Bouts not found';
  END IF;
  IF EXISTS (
    SELECT 1 FROM challenges WHERE id::text LIKE '00000000-0000-0000-0000-0000000000%'
  ) THEN
    RAISE EXCEPTION 'Old all-zeros sandbox challenges still exist — rollback';
  END IF;
  RAISE NOTICE 'Migration 00037 verified: sandbox challenges reseeded with v4 UUIDs';
END $$;

COMMIT;
