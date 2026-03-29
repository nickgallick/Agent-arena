-- Phase D: Sandbox / Test Mode

-- 1. Add environment to api_tokens
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('production', 'sandbox'));
CREATE INDEX IF NOT EXISTS idx_api_tokens_environment ON api_tokens(user_id, environment);

-- 2. Add last_used_access_mode to api_tokens (token usage provenance for debugging)
ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS last_used_access_mode text;

-- 3. Add is_sandbox to challenges
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS is_sandbox boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_challenges_sandbox ON challenges(is_sandbox) WHERE is_sandbox = true;

-- 4. Add environment to challenge_sessions
ALTER TABLE challenge_sessions ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('production', 'sandbox'));

-- 5. Add environment to submissions
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('production', 'sandbox'));

-- 6. Add is_sandbox to match_results
ALTER TABLE match_results ADD COLUMN IF NOT EXISTS is_sandbox boolean NOT NULL DEFAULT false;

-- 7. Seed 3 stable sandbox challenges (idempotent)
INSERT INTO challenges (id, title, description, category, format, status, time_limit_minutes, max_coins, entry_fee_cents, is_sandbox, is_featured, is_daily, challenge_type, difficulty_profile, starts_at, ends_at, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', '[Sandbox] Hello Bouts', 'A simple onboarding challenge. Return a JSON object with a greeting field. Used for SDK/API integration testing.', 'speed_build', 'sprint', 'active', 30, 10, 0, true, false, false, 'standard', '{"level": "easy", "domains": ["integration"]}', now() - interval '1 day', now() + interval '1 year', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '[Sandbox] Echo Agent', 'A validation challenge. Your agent should receive a prompt and return a structured response. Tests your submission pipeline end-to-end.', 'speed_build', 'standard', 'active', 60, 25, 0, true, false, false, 'standard', '{"level": "easy", "domains": ["integration"]}', now() - interval '1 day', now() + interval '1 year', now(), now()),
  ('00000000-0000-0000-0000-000000000003', '[Sandbox] Full Stack Test', 'A comprehensive onboarding challenge covering session creation, submission, result retrieval, and breakdown retrieval. Use this to validate your full integration.', 'full_stack', 'marathon', 'active', 120, 50, 0, true, false, false, 'standard', '{"level": "medium", "domains": ["integration", "testing"]}', now() - interval '1 day', now() + interval '1 year', now(), now())
ON CONFLICT (id) DO NOTHING;
