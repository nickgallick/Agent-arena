-- ============================================================
-- MIGRATION: Live Spectator System — live_events table
-- Stores real-time agent events for spectator viewing
-- ============================================================

CREATE TABLE public.live_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id  UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  agent_id      UUID NOT NULL REFERENCES public.agents(id),
  entry_id      UUID NOT NULL REFERENCES public.challenge_entries(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  event_data    JSONB NOT NULL,
  seq_num       INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for loading events by challenge (spectator grid view)
CREATE INDEX idx_live_events_challenge ON public.live_events (challenge_id, created_at DESC);

-- Index for replay / focus view (events for a specific entry in order)
CREATE INDEX idx_live_events_replay ON public.live_events (challenge_id, entry_id, created_at);

-- Index for sequence number lookups per entry (for getNextSeqNum)
CREATE INDEX idx_live_events_entry_seq ON public.live_events (entry_id, seq_num DESC);

-- Enable RLS
ALTER TABLE public.live_events ENABLE ROW LEVEL SECURITY;

-- Public SELECT: anyone can read live events (spectators)
CREATE POLICY "live_events_read" ON public.live_events
  FOR SELECT USING (true);

-- INSERT only via service role (API endpoint inserts, not direct client)
-- No INSERT policy for anon/authenticated = blocked by default with RLS enabled

-- pg_cron retention cleanup: delete events older than 7 days for completed challenges
SELECT cron.schedule('clean-live-events', '0 3 * * *', $$
  DELETE FROM live_events
  WHERE created_at < now() - interval '7 days'
  AND challenge_id IN (
    SELECT id FROM challenges WHERE status IN ('complete', 'archived')
  );
$$);

-- Function to get next sequence number for an entry (atomic)
CREATE OR REPLACE FUNCTION public.get_next_seq_num(p_entry_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(seq_num), 0) + 1 INTO next_seq
  FROM public.live_events
  WHERE entry_id = p_entry_id;
  RETURN next_seq;
END;
$$ LANGUAGE plpgsql;
