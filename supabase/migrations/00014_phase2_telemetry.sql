-- ============================================================
-- 00014: Phase 2 — Structured Telemetry + Run Metrics
-- Forge · 2026-03-27
-- ============================================================
-- Changes:
-- 1. Extend replay_events with structured telemetry fields
-- 2. New table: run_metrics (derived per-run behavioral scores)
-- 3. New table: run_telemetry_summary (aggregated per-entry)
-- 4. Extend challenge_entries with telemetry-derived columns
-- 5. Functions: compute_run_metrics(), derive_process_signals()
-- ============================================================

-- ============================================================
-- 1. Extend replay_events with structured telemetry
-- ============================================================

-- Add challenge_id for direct lookups (backcompat: nullable)
ALTER TABLE public.replay_events
  ADD COLUMN IF NOT EXISTS challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE,
  -- Structured fields extracted from event_data for fast querying
  ADD COLUMN IF NOT EXISTS tool_name text,           -- e.g. 'bash', 'read_file', 'write_file'
  ADD COLUMN IF NOT EXISTS tool_success boolean,     -- did the tool call succeed?
  ADD COLUMN IF NOT EXISTS is_retry boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_revert boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_pivot boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_checkpoint boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_hypothesis boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hypothesis_text text,     -- extracted hypothesis claim
  ADD COLUMN IF NOT EXISTS confidence_claim real,    -- agent's stated confidence (0-1) if present
  ADD COLUMN IF NOT EXISTS phase text,               -- 'explore'|'plan'|'implement'|'verify'|'recover'
  ADD COLUMN IF NOT EXISTS error_type text,          -- categorized error if event_type='error'
  ADD COLUMN IF NOT EXISTS token_count integer,      -- tokens used in this step (if available)
  ADD COLUMN IF NOT EXISTS duration_ms integer;      -- time taken for this step

-- Indexes for telemetry queries
CREATE INDEX IF NOT EXISTS idx_replay_events_challenge_id ON public.replay_events(challenge_id);
CREATE INDEX IF NOT EXISTS idx_replay_events_tool ON public.replay_events(entry_id, tool_name) WHERE tool_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_replay_events_retries ON public.replay_events(entry_id) WHERE is_retry = true;
CREATE INDEX IF NOT EXISTS idx_replay_events_reverts ON public.replay_events(entry_id) WHERE is_revert = true;
CREATE INDEX IF NOT EXISTS idx_replay_events_pivots ON public.replay_events(entry_id) WHERE is_pivot = true;
CREATE INDEX IF NOT EXISTS idx_replay_events_phase ON public.replay_events(entry_id, phase) WHERE phase IS NOT NULL;

-- ============================================================
-- 2. New table: run_metrics
-- Derived behavioral metrics computed from replay_events
-- One row per entry — computed after submission, before judging
-- ============================================================

CREATE TABLE IF NOT EXISTS public.run_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL UNIQUE REFERENCES public.challenge_entries(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,

  -- === Action counts ===
  total_events integer NOT NULL DEFAULT 0,
  tool_call_count integer NOT NULL DEFAULT 0,
  retry_count integer NOT NULL DEFAULT 0,
  revert_count integer NOT NULL DEFAULT 0,
  pivot_count integer NOT NULL DEFAULT 0,
  checkpoint_count integer NOT NULL DEFAULT 0,
  hypothesis_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  test_run_count integer NOT NULL DEFAULT 0,

  -- === Derived rates (0-1) ===
  thrash_rate real,          -- retries / total tool calls (high = bad)
  revert_ratio real,         -- reverts / total events (high = flailing)
  tool_discipline real,      -- unique tools used effectively / total tool calls
  verification_density real, -- test_runs / (implement events) (low = skipping verification)
  checkpoint_frequency real, -- checkpoints per 10 events

  -- === Timing signals ===
  total_duration_ms integer,
  time_to_first_tool_ms integer,     -- how fast did agent start working?
  time_to_first_error_ms integer,    -- how quickly did it encounter an error?
  time_to_recovery_ms integer,       -- after first error, how long to recover?
  pivot_latency_ms integer,          -- avg ms between contradiction and pivot
  mean_step_duration_ms integer,

  -- === Phase distribution (%) ===
  pct_explore real,
  pct_plan real,
  pct_implement real,
  pct_verify real,
  pct_recover real,

  -- === Quality signals ===
  wasted_action_ratio real,         -- dead-end events / total events
  false_confidence_signals integer, -- times agent claimed success before actual completion
  context_growth_rate real,         -- token growth per event (high = drift)
  recovery_speed_score real,        -- 0-100: how fast + clean was recovery after errors

  -- === Token efficiency ===
  total_tokens integer,
  tokens_per_correct_step real,

  -- === Computed process score (0-100) ===
  -- Used by Process Judge as primary telemetry input
  telemetry_process_score real,
  telemetry_recovery_score real,
  telemetry_efficiency_score real,

  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.run_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Run metrics viewable by everyone"
  ON public.run_metrics FOR SELECT USING (true);

CREATE POLICY "Admins can manage run metrics"
  ON public.run_metrics FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE INDEX idx_run_metrics_entry_id ON public.run_metrics(entry_id);
CREATE INDEX idx_run_metrics_agent_id ON public.run_metrics(agent_id);
CREATE INDEX idx_run_metrics_challenge_id ON public.run_metrics(challenge_id);
CREATE INDEX idx_run_metrics_process_score ON public.run_metrics(telemetry_process_score DESC NULLS LAST);

-- ============================================================
-- 3. Extend challenge_entries with telemetry-derived columns
-- ============================================================

ALTER TABLE public.challenge_entries
  ADD COLUMN IF NOT EXISTS telemetry_process_score real,    -- from run_metrics
  ADD COLUMN IF NOT EXISTS telemetry_recovery_score real,   -- from run_metrics
  ADD COLUMN IF NOT EXISTS telemetry_efficiency_score real, -- from run_metrics
  ADD COLUMN IF NOT EXISTS has_telemetry boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS telemetry_event_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_entries_has_telemetry ON public.challenge_entries(has_telemetry) WHERE has_telemetry = true;

-- ============================================================
-- 4. Function: compute_run_metrics
-- Called after submission — derives all behavioral metrics
-- from replay_events for a given entry
-- ============================================================

CREATE OR REPLACE FUNCTION public.compute_run_metrics(p_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_challenge_id uuid;
  v_agent_id uuid;

  -- Counts
  v_total integer;
  v_tools integer;
  v_retries integer;
  v_reverts integer;
  v_pivots integer;
  v_checkpoints integer;
  v_hypotheses integer;
  v_errors integer;
  v_test_runs integer;

  -- Timing
  v_total_duration integer;
  v_first_tool_ms integer;
  v_first_error_ms integer;

  -- Phase counts
  v_explore integer;
  v_plan integer;
  v_implement integer;
  v_verify integer;
  v_recover integer;

  -- Tokens
  v_total_tokens integer;

  -- Derived
  v_thrash_rate real;
  v_revert_ratio real;
  v_tool_discipline real;
  v_verification_density real;
  v_wasted_ratio real;
  v_process_score real;
  v_recovery_score real;
  v_efficiency_score real;

BEGIN
  -- Get entry context
  SELECT challenge_id, agent_id INTO v_challenge_id, v_agent_id
  FROM public.challenge_entries WHERE id = p_entry_id;

  IF v_challenge_id IS NULL THEN RETURN; END IF;

  -- Count events by type
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE event_type = 'tool_call'),
    COUNT(*) FILTER (WHERE is_retry = true),
    COUNT(*) FILTER (WHERE is_revert = true),
    COUNT(*) FILTER (WHERE is_pivot = true),
    COUNT(*) FILTER (WHERE is_checkpoint = true),
    COUNT(*) FILTER (WHERE is_hypothesis = true),
    COUNT(*) FILTER (WHERE event_type = 'error'),
    COUNT(*) FILTER (WHERE event_type = 'test_run'),
    -- Phase counts
    COUNT(*) FILTER (WHERE phase = 'explore'),
    COUNT(*) FILTER (WHERE phase = 'plan'),
    COUNT(*) FILTER (WHERE phase = 'implement'),
    COUNT(*) FILTER (WHERE phase = 'verify'),
    COUNT(*) FILTER (WHERE phase = 'recover'),
    -- Timing
    MAX(timestamp_ms) - MIN(timestamp_ms),
    MIN(timestamp_ms) FILTER (WHERE event_type = 'tool_call'),
    MIN(timestamp_ms) FILTER (WHERE event_type = 'error'),
    -- Tokens
    COALESCE(SUM(token_count), 0)
  INTO
    v_total, v_tools, v_retries, v_reverts, v_pivots,
    v_checkpoints, v_hypotheses, v_errors, v_test_runs,
    v_explore, v_plan, v_implement, v_verify, v_recover,
    v_total_duration, v_first_tool_ms, v_first_error_ms,
    v_total_tokens
  FROM public.replay_events
  WHERE entry_id = p_entry_id;

  -- Skip if no events
  IF v_total = 0 THEN RETURN; END IF;

  -- Derived rates
  v_thrash_rate         := CASE WHEN v_tools > 0 THEN v_retries::real / v_tools ELSE 0 END;
  v_revert_ratio        := v_reverts::real / v_total;
  v_tool_discipline     := CASE WHEN v_tools > 0 THEN GREATEST(0, 1 - v_thrash_rate) ELSE 0.5 END;
  v_verification_density:= CASE WHEN v_implement > 0 THEN v_test_runs::real / v_implement ELSE 0 END;
  v_wasted_ratio        := (v_retries + v_reverts)::real / GREATEST(v_total, 1);

  -- === Telemetry Process Score (0-100) ===
  -- Rewards: tool discipline, verification, checkpointing, hypothesis formation
  -- Penalizes: thrashing, excessive reverts, no verification
  v_process_score :=
    -- Tool discipline (25 pts)
    (v_tool_discipline * 25) +
    -- Verification density (20 pts — capped at 0.5 ratio = full score)
    (LEAST(v_verification_density / 0.5, 1.0) * 20) +
    -- Checkpoint behavior (15 pts)
    (LEAST(v_checkpoints::real / GREATEST(v_total / 10.0, 1), 1.0) * 15) +
    -- Hypothesis formation (15 pts)
    (LEAST(v_hypotheses::real / 3, 1.0) * 15) +
    -- Low waste (25 pts — penalize thrash)
    (GREATEST(0, 1 - v_wasted_ratio * 2) * 25);

  -- === Telemetry Recovery Score (0-100) ===
  -- Rewards: recovering after errors, pivoting intelligently
  -- Penalizes: error spirals, no recovery
  IF v_errors = 0 THEN
    v_recovery_score := 80; -- no errors = good baseline, not perfect (no recovery to demonstrate)
  ELSE
    v_recovery_score :=
      -- Pivot response (40 pts)
      (LEAST(v_pivots::real / v_errors, 1.0) * 40) +
      -- Recovery phase presence (30 pts)
      (LEAST(v_recover::real / v_errors, 1.0) * 30) +
      -- Not spiraling: errors < 20% of total (30 pts)
      (GREATEST(0, 1 - (v_errors::real / v_total / 0.2)) * 30);
  END IF;

  -- === Telemetry Efficiency Score (0-100) ===
  -- Rewards: direct path, low waste, reasonable token use
  v_efficiency_score :=
    -- Low wasted action ratio (50 pts)
    (GREATEST(0, 1 - v_wasted_ratio * 3) * 50) +
    -- Tool call efficiency (30 pts — penalize excessive calls)
    (GREATEST(0, 1 - (v_tools::real / GREATEST(v_total, 1) - 0.3)) * 30) +
    -- Verification without over-testing (20 pts)
    (CASE
      WHEN v_verification_density BETWEEN 0.1 AND 0.6 THEN 20
      WHEN v_verification_density > 0 THEN 10
      ELSE 0
    END);

  -- Clamp all scores 0-100
  v_process_score    := GREATEST(0, LEAST(100, v_process_score));
  v_recovery_score   := GREATEST(0, LEAST(100, v_recovery_score));
  v_efficiency_score := GREATEST(0, LEAST(100, v_efficiency_score));

  -- Upsert run_metrics
  INSERT INTO public.run_metrics (
    entry_id, challenge_id, agent_id,
    total_events, tool_call_count, retry_count, revert_count,
    pivot_count, checkpoint_count, hypothesis_count, error_count, test_run_count,
    thrash_rate, revert_ratio, tool_discipline, verification_density,
    wasted_action_ratio,
    total_duration_ms, time_to_first_tool_ms, time_to_first_error_ms,
    pct_explore, pct_plan, pct_implement, pct_verify, pct_recover,
    total_tokens,
    telemetry_process_score, telemetry_recovery_score, telemetry_efficiency_score
  ) VALUES (
    p_entry_id, v_challenge_id, v_agent_id,
    v_total, v_tools, v_retries, v_reverts,
    v_pivots, v_checkpoints, v_hypotheses, v_errors, v_test_runs,
    v_thrash_rate, v_revert_ratio, v_tool_discipline, v_verification_density,
    v_wasted_ratio,
    v_total_duration, v_first_tool_ms, v_first_error_ms,
    -- Phase percentages
    CASE WHEN v_total > 0 THEN v_explore::real / v_total ELSE 0 END,
    CASE WHEN v_total > 0 THEN v_plan::real    / v_total ELSE 0 END,
    CASE WHEN v_total > 0 THEN v_implement::real / v_total ELSE 0 END,
    CASE WHEN v_total > 0 THEN v_verify::real  / v_total ELSE 0 END,
    CASE WHEN v_total > 0 THEN v_recover::real / v_total ELSE 0 END,
    v_total_tokens,
    v_process_score, v_recovery_score, v_efficiency_score
  )
  ON CONFLICT (entry_id) DO UPDATE SET
    total_events = EXCLUDED.total_events,
    tool_call_count = EXCLUDED.tool_call_count,
    retry_count = EXCLUDED.retry_count,
    revert_count = EXCLUDED.revert_count,
    pivot_count = EXCLUDED.pivot_count,
    checkpoint_count = EXCLUDED.checkpoint_count,
    hypothesis_count = EXCLUDED.hypothesis_count,
    error_count = EXCLUDED.error_count,
    test_run_count = EXCLUDED.test_run_count,
    thrash_rate = EXCLUDED.thrash_rate,
    revert_ratio = EXCLUDED.revert_ratio,
    tool_discipline = EXCLUDED.tool_discipline,
    verification_density = EXCLUDED.verification_density,
    wasted_action_ratio = EXCLUDED.wasted_action_ratio,
    total_duration_ms = EXCLUDED.total_duration_ms,
    time_to_first_tool_ms = EXCLUDED.time_to_first_tool_ms,
    time_to_first_error_ms = EXCLUDED.time_to_first_error_ms,
    pct_explore = EXCLUDED.pct_explore,
    pct_plan = EXCLUDED.pct_plan,
    pct_implement = EXCLUDED.pct_implement,
    pct_verify = EXCLUDED.pct_verify,
    pct_recover = EXCLUDED.pct_recover,
    total_tokens = EXCLUDED.total_tokens,
    telemetry_process_score = EXCLUDED.telemetry_process_score,
    telemetry_recovery_score = EXCLUDED.telemetry_recovery_score,
    telemetry_efficiency_score = EXCLUDED.telemetry_efficiency_score,
    computed_at = now(),
    updated_at = now();

  -- Update challenge_entries with telemetry scores
  UPDATE public.challenge_entries SET
    telemetry_process_score = v_process_score,
    telemetry_recovery_score = v_recovery_score,
    telemetry_efficiency_score = v_efficiency_score,
    has_telemetry = true,
    telemetry_event_count = v_total
  WHERE id = p_entry_id;

END;
$$;

-- ============================================================
-- 5. Function: enrich_replay_event
-- Called on INSERT to replay_events — extracts structured
-- fields from the raw event_data blob
-- ============================================================

CREATE OR REPLACE FUNCTION public.enrich_replay_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_data jsonb;
BEGIN
  v_data := NEW.event_data;

  -- Extract tool_name
  IF NEW.event_type = 'tool_call' THEN
    NEW.tool_name    := v_data->>'tool';
    NEW.tool_success := COALESCE((v_data->>'success')::boolean, true);
    NEW.is_retry     := COALESCE((v_data->>'is_retry')::boolean, false);
    NEW.token_count  := (v_data->>'tokens')::integer;
    NEW.duration_ms  := (v_data->>'duration_ms')::integer;
  END IF;

  -- Detect reverts
  IF NEW.event_type = 'tool_call' AND (
    v_data->>'tool' IN ('git_revert', 'undo', 'rollback') OR
    (v_data->>'tool' = 'bash' AND v_data->>'command' ILIKE '%git revert%')
  ) THEN
    NEW.is_revert := true;
  END IF;

  -- Detect test runs
  IF NEW.event_type = 'test_run' THEN
    NEW.tool_name    := 'test_runner';
    NEW.tool_success := COALESCE((v_data->>'passed')::boolean, false);
    NEW.duration_ms  := (v_data->>'duration_ms')::integer;
  END IF;

  -- Detect hypotheses from thinking events
  IF NEW.event_type = 'thinking' THEN
    NEW.is_hypothesis  := true;
    NEW.hypothesis_text := LEFT(v_data->>'content', 500);
    NEW.confidence_claim := (v_data->>'confidence')::real;
    NEW.token_count     := (v_data->>'tokens')::integer;
  END IF;

  -- Detect checkpoints
  IF NEW.event_type = 'status_change' AND v_data->>'status' = 'checkpoint' THEN
    NEW.is_checkpoint := true;
  END IF;

  -- Detect pivots
  IF NEW.event_type = 'status_change' AND v_data->>'status' IN ('pivot', 'strategy_change') THEN
    NEW.is_pivot := true;
  END IF;

  -- Categorize errors
  IF NEW.event_type = 'error' THEN
    NEW.error_type := COALESCE(v_data->>'error_type', 'unknown');
  END IF;

  -- Infer phase from event_data if provided, else from event_type
  IF v_data->>'phase' IS NOT NULL THEN
    NEW.phase := v_data->>'phase';
  ELSE
    NEW.phase := CASE NEW.event_type
      WHEN 'thinking'     THEN 'explore'
      WHEN 'tool_call'    THEN 'implement'
      WHEN 'test_run'     THEN 'verify'
      WHEN 'error'        THEN 'recover'
      WHEN 'code_write'   THEN 'implement'
      ELSE NULL
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to replay_events
DROP TRIGGER IF EXISTS enrich_replay_event_trigger ON public.replay_events;
CREATE TRIGGER enrich_replay_event_trigger
  BEFORE INSERT ON public.replay_events
  FOR EACH ROW EXECUTE FUNCTION public.enrich_replay_event();

-- ============================================================
-- 6. Extend connector events API validation
-- Add new event types needed for telemetry
-- ============================================================

-- The event_type check constraint may need updating
-- Add new structured event types alongside existing ones
ALTER TABLE public.replay_events
  DROP CONSTRAINT IF EXISTS replay_events_event_type_check;

-- No constraint — event_type is free-form text, enrichment handles classification
-- (The connector API validates via Zod schema)
