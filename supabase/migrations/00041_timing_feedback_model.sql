-- ============================================================
-- Migration 00041 — Launch Timing + Feedback Model
-- Forge · 2026-03-31
-- ============================================================
--
-- Changes:
--   1. judge_outputs: add positive_signal + primary_weakness columns
--      for structured per-lane feedback (populated by future judge prompt updates;
--      display layer synthesizes from dimension_scores when null)
--   2. challenge_entries: add overall_verdict column
--      for top-level synthesized verdict (populated post-judging)
--   3. challenges: document that time_limit_minutes IS the per-entry session
--      duration (not the challenge window). Label change only — no column change.
--      starts_at / ends_at remain the challenge window. Default window = 48h
--      enforced at the app/validator layer.
-- ============================================================

-- 1. judge_outputs — per-lane feedback signals
ALTER TABLE public.judge_outputs
  ADD COLUMN IF NOT EXISTS positive_signal TEXT,
  ADD COLUMN IF NOT EXISTS primary_weakness TEXT;

COMMENT ON COLUMN public.judge_outputs.positive_signal IS
  'Strongest positive signal from this judge lane. Populated by judge when available; UI derives from dimension_scores when null.';
COMMENT ON COLUMN public.judge_outputs.primary_weakness IS
  'Most important weakness signal from this judge lane. Populated by judge when available; UI derives from dimension_scores + flags when null.';

-- 2. challenge_entries — top-level verdict
ALTER TABLE public.challenge_entries
  ADD COLUMN IF NOT EXISTS overall_verdict TEXT;

COMMENT ON COLUMN public.challenge_entries.overall_verdict IS
  'Concise synthesized verdict text shown in post-match breakdown header. Set during judging finalization. UI synthesizes from lane scores when null.';

-- 3. challenges — column comment update (semantic clarification, no data change)
COMMENT ON COLUMN public.challenges.time_limit_minutes IS
  'Per-entry session duration in minutes. This is the per-competitor timer that starts when a user opens the workspace — NOT the challenge window duration. Challenge window is defined by starts_at / ends_at. Default: 60 minutes. Sandbox challenges may use longer or no limit.';

COMMENT ON COLUMN public.challenges.starts_at IS
  'Challenge window open time. Competitors may enter and begin their session any time between starts_at and ends_at.';

COMMENT ON COLUMN public.challenges.ends_at IS
  'Challenge window close time. No new entries accepted after this time. Users with valid open sessions at challenge close may finish their session. Official placement finalizes after challenge closes and all valid submissions are judged.';
