-- ============================================================
-- 00008: Integrity & Anti-Cheat System
-- ============================================================

-- 1. Add integrity columns to challenge_entries
ALTER TABLE public.challenge_entries
  ADD COLUMN IF NOT EXISTS integrity_flag text CHECK (integrity_flag IN ('clean', 'suspicious', 'flagged', 'disqualified')) DEFAULT 'clean',
  ADD COLUMN IF NOT EXISTS integrity_reason text,
  ADD COLUMN IF NOT EXISTS reported_model text,        -- model the connector claims it used at submission
  ADD COLUMN IF NOT EXISTS integrity_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_entries_integrity_flag ON public.challenge_entries(integrity_flag);

-- 2. Violations / reports table
CREATE TABLE IF NOT EXISTS public.violations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accused_agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  entry_id uuid REFERENCES public.challenge_entries(id) ON DELETE SET NULL,
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 2000),
  evidence text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'confirmed', 'dismissed')),
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a report (auth required to prevent spam)
CREATE POLICY "Authenticated users can submit violations"
  ON public.violations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON public.violations FOR SELECT
  USING (auth.uid() = reporter_user_id);

-- Admins can see all
CREATE POLICY "Admins can view all violations"
  ON public.violations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE INDEX idx_violations_status ON public.violations(status);
CREATE INDEX idx_violations_accused ON public.violations(accused_agent_id);
CREATE INDEX idx_violations_entry ON public.violations(entry_id);

-- 3. Weight class score averages (materialised for outlier detection)
CREATE TABLE IF NOT EXISTS public.weight_class_stats (
  weight_class_id text PRIMARY KEY,
  avg_score real NOT NULL DEFAULT 5.0,
  stddev_score real NOT NULL DEFAULT 2.0,
  sample_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed with reasonable baseline values
INSERT INTO public.weight_class_stats (weight_class_id, avg_score, stddev_score, sample_count)
VALUES
  ('frontier',  7.2, 1.4, 0),
  ('contender', 6.1, 1.6, 0),
  ('scrapper',  5.0, 1.8, 0),
  ('underdog',  4.2, 1.7, 0),
  ('homebrew',  3.5, 1.6, 0),
  ('open',      5.0, 2.0, 0)
ON CONFLICT (weight_class_id) DO NOTHING;

-- 4. Function to run outlier check after scoring
CREATE OR REPLACE FUNCTION public.check_entry_integrity(p_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry record;
  v_stats record;
  v_zscore real;
  v_flag text := 'clean';
  v_reason text := null;
  v_declared_class text;
BEGIN
  -- Get entry with agent weight class and final score
  SELECT
    ce.id,
    ce.final_score,
    ce.reported_model,
    a.weight_class_id,
    a.model_name
  INTO v_entry
  FROM public.challenge_entries ce
  JOIN public.agents a ON a.id = ce.agent_id
  WHERE ce.id = p_entry_id;

  IF NOT FOUND OR v_entry.final_score IS NULL THEN
    RETURN;
  END IF;

  -- Get weight class stats
  SELECT avg_score, stddev_score
  INTO v_stats
  FROM public.weight_class_stats
  WHERE weight_class_id = v_entry.weight_class_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate z-score
  IF v_stats.stddev_score > 0 THEN
    v_zscore := (v_entry.final_score - v_stats.avg_score) / v_stats.stddev_score;
  ELSE
    v_zscore := 0;
  END IF;

  -- Flag if 2.5+ standard deviations above class average
  IF v_zscore >= 2.5 THEN
    v_flag := 'suspicious';
    v_reason := format(
      'Score %.1f is %.1f standard deviations above %s class average (avg: %.1f, stddev: %.1f). Z-score: %.2f.',
      v_entry.final_score,
      v_zscore,
      v_entry.weight_class_id,
      v_stats.avg_score,
      v_stats.stddev_score,
      v_zscore
    );
  END IF;

  -- Flag if reported_model doesn't match declared weight class
  IF v_entry.reported_model IS NOT NULL AND v_entry.reported_model != '' THEN
    -- Check if reported model is significantly more powerful than declared
    -- (simple keyword check — refined model lookup happens in application layer)
    IF v_entry.weight_class_id IN ('homebrew', 'underdog', 'scrapper') THEN
      IF v_entry.reported_model ILIKE '%opus%' OR
         v_entry.reported_model ILIKE '%gpt-5%' OR
         v_entry.reported_model ILIKE '%gpt-4o%' OR
         v_entry.reported_model ILIKE '%sonnet%' OR
         v_entry.reported_model ILIKE '%gemini-2%' THEN
        v_flag := 'flagged';
        v_reason := coalesce(v_reason || ' | ', '') ||
          format('Connector reported model "%s" appears inconsistent with declared weight class "%s".',
            v_entry.reported_model, v_entry.weight_class_id);
      END IF;
    END IF;
  END IF;

  -- Update entry
  UPDATE public.challenge_entries
  SET
    integrity_flag = v_flag,
    integrity_reason = v_reason,
    integrity_checked_at = now()
  WHERE id = p_entry_id;

  -- Update weight class running stats (Welford online algorithm approximation)
  UPDATE public.weight_class_stats
  SET
    sample_count = sample_count + 1,
    avg_score = (avg_score * sample_count + v_entry.final_score) / (sample_count + 1),
    -- Simple running variance approximation
    stddev_score = GREATEST(
      0.5,
      SQRT(
        (stddev_score * stddev_score * sample_count +
         (v_entry.final_score - avg_score) * (v_entry.final_score - avg_score)) /
        GREATEST(sample_count + 1, 1)
      )
    ),
    updated_at = now()
  WHERE weight_class_id = v_entry.weight_class_id;

END;
$$;

-- 5. Updated_at trigger for violations
CREATE TRIGGER set_violations_updated_at
  BEFORE UPDATE ON public.violations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
