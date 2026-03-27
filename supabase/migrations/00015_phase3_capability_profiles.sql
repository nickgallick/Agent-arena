-- ============================================================
-- 00015: Phase 3 — Agent Capability Profiles + Leaderboard Sub-ratings
-- Forge · 2026-03-27
-- ============================================================
-- Changes:
-- 1. New table: agent_capability_profiles (per-dimension rating accumulation)
-- 2. New table: agent_sub_ratings (rolling leaderboard sub-ratings)
-- 3. Function: update_capability_profile() — called after each judged entry
-- 4. Function: get_leaderboard_with_profiles() — enriched leaderboard query
-- ============================================================

-- ============================================================
-- 1. agent_capability_profiles
-- Persistent multidimensional profile per agent
-- Updated after every scored challenge
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agent_capability_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL UNIQUE REFERENCES public.agents(id) ON DELETE CASCADE,

  -- === Core capability dimensions (0-100 rolling average) ===
  reasoning_depth real NOT NULL DEFAULT 50,
  tool_discipline real NOT NULL DEFAULT 50,
  ambiguity_handling real NOT NULL DEFAULT 50,
  recovery_quality real NOT NULL DEFAULT 50,
  deception_resistance real NOT NULL DEFAULT 50,
  verification_discipline real NOT NULL DEFAULT 50,
  strategic_planning real NOT NULL DEFAULT 50,
  execution_precision real NOT NULL DEFAULT 50,
  integrity_reliability real NOT NULL DEFAULT 50,
  adaptation_speed real NOT NULL DEFAULT 50,

  -- === Aggregated lane scores (rolling weighted avg) ===
  avg_process_score real NOT NULL DEFAULT 50,
  avg_strategy_score real NOT NULL DEFAULT 50,
  avg_integrity_score real NOT NULL DEFAULT 50,
  avg_efficiency_score real NOT NULL DEFAULT 50,
  avg_composite_score real NOT NULL DEFAULT 50,

  -- === Telemetry-derived behavioral averages ===
  avg_thrash_rate real,
  avg_revert_ratio real,
  avg_verification_density real,
  avg_wasted_action_ratio real,
  avg_pivot_count real,

  -- === Failure signature tracking ===
  -- Counts of each failure archetype observed
  failure_premature_convergence integer NOT NULL DEFAULT 0,
  failure_visible_test_overfitting integer NOT NULL DEFAULT 0,
  failure_tool_misuse integer NOT NULL DEFAULT 0,
  failure_shallow_decomposition integer NOT NULL DEFAULT 0,
  failure_context_drift integer NOT NULL DEFAULT 0,
  failure_recovery_collapse integer NOT NULL DEFAULT 0,
  failure_false_confidence integer NOT NULL DEFAULT 0,
  failure_integrity_drift integer NOT NULL DEFAULT 0,

  -- === Participation stats ===
  challenges_scored integer NOT NULL DEFAULT 0,
  challenges_disputed integer NOT NULL DEFAULT 0,
  challenges_disqualified integer NOT NULL DEFAULT 0,
  best_composite_score real,
  worst_composite_score real,

  -- === Metadata ===
  last_challenge_at timestamptz,
  profile_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_capability_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Capability profiles viewable by everyone"
  ON public.agent_capability_profiles FOR SELECT USING (true);

CREATE POLICY "Admins can manage capability profiles"
  ON public.agent_capability_profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE INDEX idx_capability_profiles_agent ON public.agent_capability_profiles(agent_id);
CREATE INDEX idx_capability_profiles_composite ON public.agent_capability_profiles(avg_composite_score DESC);
CREATE INDEX idx_capability_profiles_process ON public.agent_capability_profiles(avg_process_score DESC);
CREATE INDEX idx_capability_profiles_strategy ON public.agent_capability_profiles(avg_strategy_score DESC);
CREATE INDEX idx_capability_profiles_integrity ON public.agent_capability_profiles(avg_integrity_score DESC);

-- ============================================================
-- 2. Function: update_capability_profile
-- Called after each entry is fully judged
-- Uses exponential moving average (alpha=0.3) so recent
-- performance has more weight than historical
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_capability_profile(p_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_agent_id uuid;
  v_process real;
  v_strategy real;
  v_integrity_adj real;
  v_composite real;
  v_efficiency real;
  v_thrash real;
  v_revert real;
  v_verify_density real;
  v_wasted real;
  v_pivots integer;
  v_integrity_outcome text;
  v_disputed boolean;
  v_disqualified boolean;

  -- EMA alpha — higher = more weight on recent performance
  v_alpha constant real := 0.3;
  v_exists boolean;
BEGIN
  -- Fetch entry scores
  SELECT
    ce.agent_id,
    COALESCE(ce.process_score, 50),
    COALESCE(ce.strategy_score, 50),
    COALESCE(ce.integrity_adjustment, 0),
    COALESCE(ce.composite_score, 50),
    COALESCE(ce.efficiency_score, 50),
    ce.dispute_flagged,
    ce.status = 'disqualified'
  INTO
    v_agent_id, v_process, v_strategy, v_integrity_adj,
    v_composite, v_efficiency, v_disputed, v_disqualified
  FROM public.challenge_entries ce
  WHERE ce.id = p_entry_id;

  IF v_agent_id IS NULL THEN RETURN; END IF;

  -- Fetch telemetry metrics
  SELECT
    COALESCE(rm.thrash_rate, 0.2),
    COALESCE(rm.revert_ratio, 0.1),
    COALESCE(rm.verification_density, 0.2),
    COALESCE(rm.wasted_action_ratio, 0.2),
    COALESCE(rm.pivot_count, 0)
  INTO v_thrash, v_revert, v_verify_density, v_wasted, v_pivots
  FROM public.run_metrics rm
  WHERE rm.entry_id = p_entry_id;

  -- Fetch integrity outcome from judge_outputs
  SELECT integrity_outcome INTO v_integrity_outcome
  FROM public.judge_outputs
  WHERE entry_id = p_entry_id AND lane = 'integrity'
  LIMIT 1;

  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.agent_capability_profiles WHERE agent_id = v_agent_id)
  INTO v_exists;

  IF NOT v_exists THEN
    -- Create initial profile from this run
    INSERT INTO public.agent_capability_profiles (
      agent_id,
      reasoning_depth, tool_discipline, ambiguity_handling,
      recovery_quality, verification_discipline, strategic_planning,
      execution_precision, integrity_reliability, adaptation_speed,
      avg_process_score, avg_strategy_score, avg_integrity_score,
      avg_efficiency_score, avg_composite_score,
      avg_thrash_rate, avg_revert_ratio, avg_verification_density,
      avg_wasted_action_ratio, avg_pivot_count,
      challenges_scored,
      challenges_disputed,
      challenges_disqualified,
      best_composite_score, worst_composite_score,
      last_challenge_at
    ) VALUES (
      v_agent_id,
      -- Map lane scores to capability dimensions
      v_strategy,           -- reasoning_depth ← strategy score
      -- tool_discipline from telemetry (high thrash = low discipline)
      GREATEST(0, 100 - v_thrash * 200),
      v_strategy * 0.7 + v_process * 0.3,  -- ambiguity_handling
      v_process,            -- recovery_quality ← process (blended)
      -- verification_discipline from telemetry density
      LEAST(100, v_verify_density * 200),
      v_strategy,           -- strategic_planning
      v_process,            -- execution_precision
      -- integrity_reliability: 100 for clean/commendable, lower for issues
      CASE v_integrity_outcome
        WHEN 'commendable' THEN 95
        WHEN 'clean'       THEN 80
        WHEN 'suspicious'  THEN 50
        WHEN 'exploitative' THEN 10
        ELSE 70
      END,
      v_efficiency,         -- adaptation_speed
      v_process, v_strategy,
      -- integrity score: normalize adjustment (-25..+10) to 0..100
      50 + (COALESCE(v_integrity_adj, 0) * 2),
      v_efficiency, v_composite,
      v_thrash, v_revert, v_verify_density, v_wasted, v_pivots::real,
      1,
      CASE WHEN v_disputed THEN 1 ELSE 0 END,
      CASE WHEN v_disqualified THEN 1 ELSE 0 END,
      v_composite, v_composite,
      now()
    );
  ELSE
    -- Update existing profile with EMA
    UPDATE public.agent_capability_profiles SET
      -- EMA update: new = alpha * current_run + (1-alpha) * historical
      reasoning_depth         = reasoning_depth         * (1 - v_alpha) + v_strategy * v_alpha,
      tool_discipline         = tool_discipline         * (1 - v_alpha) + GREATEST(0, 100 - v_thrash * 200) * v_alpha,
      ambiguity_handling      = ambiguity_handling      * (1 - v_alpha) + (v_strategy * 0.7 + v_process * 0.3) * v_alpha,
      recovery_quality        = recovery_quality        * (1 - v_alpha) + v_process * v_alpha,
      verification_discipline = verification_discipline * (1 - v_alpha) + LEAST(100, v_verify_density * 200) * v_alpha,
      strategic_planning      = strategic_planning      * (1 - v_alpha) + v_strategy * v_alpha,
      execution_precision     = execution_precision     * (1 - v_alpha) + v_process * v_alpha,
      integrity_reliability   = integrity_reliability   * (1 - v_alpha) +
        CASE v_integrity_outcome
          WHEN 'commendable'  THEN 95
          WHEN 'clean'        THEN 80
          WHEN 'suspicious'   THEN 50
          WHEN 'exploitative' THEN 10
          ELSE 70
        END * v_alpha,
      adaptation_speed        = adaptation_speed        * (1 - v_alpha) + v_efficiency * v_alpha,
      -- Lane averages
      avg_process_score    = avg_process_score    * (1 - v_alpha) + v_process    * v_alpha,
      avg_strategy_score   = avg_strategy_score   * (1 - v_alpha) + v_strategy   * v_alpha,
      avg_integrity_score  = avg_integrity_score  * (1 - v_alpha) + (50 + COALESCE(v_integrity_adj, 0) * 2) * v_alpha,
      avg_efficiency_score = avg_efficiency_score * (1 - v_alpha) + v_efficiency * v_alpha,
      avg_composite_score  = avg_composite_score  * (1 - v_alpha) + v_composite  * v_alpha,
      -- Telemetry averages
      avg_thrash_rate          = COALESCE(avg_thrash_rate, 0)          * (1 - v_alpha) + v_thrash         * v_alpha,
      avg_revert_ratio         = COALESCE(avg_revert_ratio, 0)         * (1 - v_alpha) + v_revert         * v_alpha,
      avg_verification_density = COALESCE(avg_verification_density, 0) * (1 - v_alpha) + v_verify_density * v_alpha,
      avg_wasted_action_ratio  = COALESCE(avg_wasted_action_ratio, 0)  * (1 - v_alpha) + v_wasted         * v_alpha,
      avg_pivot_count          = COALESCE(avg_pivot_count, 0)          * (1 - v_alpha) + v_pivots         * v_alpha,
      -- Participation
      challenges_scored    = challenges_scored + 1,
      challenges_disputed  = challenges_disputed  + CASE WHEN v_disputed     THEN 1 ELSE 0 END,
      challenges_disqualified = challenges_disqualified + CASE WHEN v_disqualified THEN 1 ELSE 0 END,
      best_composite_score  = GREATEST(COALESCE(best_composite_score, 0), v_composite),
      worst_composite_score = LEAST(COALESCE(worst_composite_score, 100), v_composite),
      last_challenge_at = now(),
      profile_version = profile_version + 1,
      updated_at = now()
    WHERE agent_id = v_agent_id;
  END IF;

  -- Track failure signatures from judge flags
  UPDATE public.agent_capability_profiles SET
    failure_false_confidence = failure_false_confidence +
      (SELECT COUNT(*)::integer FROM public.judge_outputs
       WHERE entry_id = p_entry_id
         AND flags::text ILIKE '%false_confidence%')
  WHERE agent_id = v_agent_id;

END;
$$;

-- ============================================================
-- 3. Wire update_capability_profile into judging pipeline
-- Trigger after challenge_entries status → 'judged'
-- ============================================================

CREATE OR REPLACE FUNCTION public.on_entry_judged()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'judged' AND (OLD.status IS DISTINCT FROM 'judged') THEN
    PERFORM public.update_capability_profile(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_on_entry_judged ON public.challenge_entries;
CREATE TRIGGER trigger_on_entry_judged
  AFTER UPDATE ON public.challenge_entries
  FOR EACH ROW EXECUTE FUNCTION public.on_entry_judged();

-- ============================================================
-- 4. View: leaderboard_with_profiles
-- Enriched leaderboard joining ratings + capability profiles
-- ============================================================

CREATE OR REPLACE VIEW public.leaderboard_with_profiles AS
SELECT
  ar.agent_id,
  ar.weight_class_id,
  ar.rating,
  ar.rating_deviation,
  ar.wins,
  ar.losses,
  ar.challenges_entered,
  ar.best_placement,
  ar.current_streak,
  -- Agent info
  a.name AS agent_name,
  a.avatar_url,
  a.model_name,
  a.is_online,
  -- Sub-ratings from capability profile
  cp.avg_process_score,
  cp.avg_strategy_score,
  cp.avg_integrity_score,
  cp.avg_efficiency_score,
  cp.avg_composite_score,
  -- Radar dimensions
  cp.reasoning_depth,
  cp.tool_discipline,
  cp.ambiguity_handling,
  cp.recovery_quality,
  cp.verification_discipline,
  cp.strategic_planning,
  cp.execution_precision,
  cp.integrity_reliability,
  cp.adaptation_speed,
  -- Telemetry behavioral averages
  cp.avg_thrash_rate,
  cp.avg_verification_density,
  cp.challenges_scored,
  cp.best_composite_score
FROM public.agent_ratings ar
JOIN public.agents a ON a.id = ar.agent_id
LEFT JOIN public.agent_capability_profiles cp ON cp.agent_id = ar.agent_id;

-- RLS on view is inherited from base tables (no separate policy needed)
