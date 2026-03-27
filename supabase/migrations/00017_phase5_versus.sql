-- ============================================================
-- 00017: Phase 5 — Versus Format
-- Head-to-head competitive challenges
-- Forge · 2026-03-27
-- ============================================================
-- Architecture:
-- - versus_matches: pairs two agent entries on the same challenge instance
-- - versus_rounds: multi-phase structure within a match
-- - versus_outcomes: final result per match with pairwise scoring
-- - ELO updated from pairwise outcomes separately from individual score
-- ============================================================

-- ============================================================
-- 1. versus_matches
-- ============================================================

CREATE TABLE IF NOT EXISTS public.versus_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  -- The two competing entries
  entry_a_id uuid NOT NULL REFERENCES public.challenge_entries(id) ON DELETE CASCADE,
  entry_b_id uuid NOT NULL REFERENCES public.challenge_entries(id) ON DELETE CASCADE,
  -- Match format
  match_type text NOT NULL DEFAULT 'mirror'
    CHECK (match_type IN ('mirror', 'asymmetric', 'resource_contested', 'draft', 'escalation')),
  -- State
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'judging', 'complete', 'cancelled')),
  -- Results
  winner_entry_id uuid REFERENCES public.challenge_entries(id),
  is_draw boolean NOT NULL DEFAULT false,
  -- Pairwise scoring
  score_a real,
  score_b real,
  -- Adaptation scores (how each responded to the other)
  adaptation_score_a real,
  adaptation_score_b real,
  -- ELO change from this match
  elo_change_a real,
  elo_change_b real,
  -- Judge rationale for the match outcome
  match_rationale text,
  -- Timestamps
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Constraints
  CONSTRAINT different_entries CHECK (entry_a_id != entry_b_id),
  UNIQUE(entry_a_id, entry_b_id)
);

ALTER TABLE public.versus_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Versus matches viewable by everyone"
  ON public.versus_matches FOR SELECT USING (true);

CREATE POLICY "Admins can manage versus matches"
  ON public.versus_matches FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE INDEX idx_versus_matches_challenge ON public.versus_matches(challenge_id);
CREATE INDEX idx_versus_matches_entry_a ON public.versus_matches(entry_a_id);
CREATE INDEX idx_versus_matches_entry_b ON public.versus_matches(entry_b_id);
CREATE INDEX idx_versus_matches_status ON public.versus_matches(status);

-- ============================================================
-- 2. versus_rounds
-- Multi-phase structure within a match
-- ============================================================

CREATE TABLE IF NOT EXISTS public.versus_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.versus_matches(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  -- Round type
  round_type text NOT NULL DEFAULT 'standard'
    CHECK (round_type IN ('standard', 'phase_shift', 'resource_contested', 'tiebreaker')),
  -- Per-round prompts or constraints (may differ from base challenge)
  round_context jsonb NOT NULL DEFAULT '{}',
  -- Phase shift details (for adaptive mid-run changes)
  phase_shift jsonb,
  -- Scores this round
  score_a real,
  score_b real,
  -- Round winner
  round_winner text CHECK (round_winner IN ('a', 'b', 'draw')),
  -- Status
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'complete')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_id, round_number)
);

ALTER TABLE public.versus_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Versus rounds viewable by everyone" ON public.versus_rounds FOR SELECT USING (true);
CREATE POLICY "Admins can manage versus rounds" ON public.versus_rounds FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE INDEX idx_versus_rounds_match ON public.versus_rounds(match_id);

-- ============================================================
-- 3. Add versus columns to challenge_entries
-- ============================================================

ALTER TABLE public.challenge_entries
  ADD COLUMN IF NOT EXISTS versus_match_id uuid REFERENCES public.versus_matches(id),
  ADD COLUMN IF NOT EXISTS versus_adaptation_score real,
  ADD COLUMN IF NOT EXISTS versus_tempo_score real,
  ADD COLUMN IF NOT EXISTS versus_result text CHECK (versus_result IN ('win', 'loss', 'draw'));

-- ============================================================
-- 4. Function: create_versus_match
-- Pairs two entries for a challenge marked as versus format
-- Called by admin or automatically after entries close
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_versus_match(
  p_challenge_id uuid,
  p_entry_a uuid,
  p_entry_b uuid,
  p_match_type text DEFAULT 'mirror'
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_match_id uuid;
BEGIN
  -- Validate both entries belong to this challenge
  IF NOT EXISTS (
    SELECT 1 FROM public.challenge_entries
    WHERE id = p_entry_a AND challenge_id = p_challenge_id
  ) THEN
    RAISE EXCEPTION 'entry_a does not belong to challenge';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.challenge_entries
    WHERE id = p_entry_b AND challenge_id = p_challenge_id
  ) THEN
    RAISE EXCEPTION 'entry_b does not belong to challenge';
  END IF;

  INSERT INTO public.versus_matches (
    challenge_id, entry_a_id, entry_b_id, match_type, status
  ) VALUES (
    p_challenge_id, p_entry_a, p_entry_b, p_match_type, 'pending'
  )
  RETURNING id INTO v_match_id;

  -- Link entries to match
  UPDATE public.challenge_entries
  SET versus_match_id = v_match_id
  WHERE id IN (p_entry_a, p_entry_b);

  RETURN v_match_id;
END;
$$;

-- ============================================================
-- 5. Function: judge_versus_match
-- Compares two completed entries head-to-head
-- Produces pairwise scores + ELO delta + adaptation scores
-- ============================================================

CREATE OR REPLACE FUNCTION public.judge_versus_match(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_match record;
  v_entry_a record;
  v_entry_b record;
  v_score_a real;
  v_score_b real;
  v_adapt_a real;
  v_adapt_b real;
  v_winner uuid;
  v_is_draw boolean := false;
  v_elo_change real;
  -- Glicko-2 simplified delta
  v_expected_a real;
  v_rating_a real;
  v_rating_b real;
BEGIN
  SELECT * INTO v_match FROM public.versus_matches WHERE id = p_match_id;
  IF v_match IS NULL THEN RETURN; END IF;

  -- Get entry scores
  SELECT composite_score, process_score, strategy_score, efficiency_score
  INTO v_entry_a
  FROM public.challenge_entries WHERE id = v_match.entry_a_id;

  SELECT composite_score, process_score, strategy_score, efficiency_score
  INTO v_entry_b
  FROM public.challenge_entries WHERE id = v_match.entry_b_id;

  v_score_a := COALESCE(v_entry_a.composite_score, 50);
  v_score_b := COALESCE(v_entry_b.composite_score, 50);

  -- Adaptation score: how much each agent improved relative to the other
  -- High process + efficiency relative to opponent = better adaptation
  v_adapt_a := (COALESCE(v_entry_a.process_score, 50) + COALESCE(v_entry_a.efficiency_score, 50)) / 2;
  v_adapt_b := (COALESCE(v_entry_b.process_score, 50) + COALESCE(v_entry_b.efficiency_score, 50)) / 2;

  -- Determine winner
  IF ABS(v_score_a - v_score_b) < 2.0 THEN
    v_is_draw := true;
    v_winner := NULL;
  ELSIF v_score_a > v_score_b THEN
    v_winner := v_match.entry_a_id;
  ELSE
    v_winner := v_match.entry_b_id;
  END IF;

  -- ELO delta calculation (simplified)
  SELECT rating INTO v_rating_a FROM public.agent_ratings ar
    JOIN public.challenge_entries ce ON ce.agent_id = ar.agent_id
    WHERE ce.id = v_match.entry_a_id LIMIT 1;
  SELECT rating INTO v_rating_b FROM public.agent_ratings ar
    JOIN public.challenge_entries ce ON ce.agent_id = ar.agent_id
    WHERE ce.id = v_match.entry_b_id LIMIT 1;

  v_rating_a := COALESCE(v_rating_a, 1500);
  v_rating_b := COALESCE(v_rating_b, 1500);
  v_expected_a := 1.0 / (1.0 + power(10, (v_rating_b - v_rating_a) / 400.0));

  v_elo_change := CASE
    WHEN v_is_draw            THEN 16 * (0.5 - v_expected_a)
    WHEN v_winner = v_match.entry_a_id THEN 32 * (1.0 - v_expected_a)
    ELSE                           32 * (0.0 - v_expected_a)
  END;

  -- Update match
  UPDATE public.versus_matches SET
    score_a = v_score_a,
    score_b = v_score_b,
    adaptation_score_a = v_adapt_a,
    adaptation_score_b = v_adapt_b,
    winner_entry_id = v_winner,
    is_draw = v_is_draw,
    elo_change_a = v_elo_change,
    elo_change_b = -v_elo_change,
    status = 'complete',
    completed_at = now()
  WHERE id = p_match_id;

  -- Update entries with versus result
  UPDATE public.challenge_entries SET
    versus_adaptation_score = v_adapt_a,
    versus_result = CASE
      WHEN v_is_draw THEN 'draw'
      WHEN v_winner = v_match.entry_a_id THEN 'win'
      ELSE 'loss'
    END
  WHERE id = v_match.entry_a_id;

  UPDATE public.challenge_entries SET
    versus_adaptation_score = v_adapt_b,
    versus_result = CASE
      WHEN v_is_draw THEN 'draw'
      WHEN v_winner = v_match.entry_b_id THEN 'win'
      ELSE 'loss'
    END
  WHERE id = v_match.entry_b_id;

END;
$$;
