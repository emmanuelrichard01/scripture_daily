-- ============================================================================
-- Encouragements ("nudges") between reading partners.
--
-- A row is written for every nudge sent. It serves two purposes: it is the
-- rate-limit ledger the API checks before sending a push, and it is the record
-- the Community page reads to show who has been cheering whom.
--
-- Idempotent, so it is safe to re-apply.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.nudges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT nudges_no_self CHECK (sender_id <> receiver_id)
);

-- The cooldown query filters by (sender, receiver) and orders by time; the
-- Community page reads the newest few for one receiver.
CREATE INDEX IF NOT EXISTS nudges_pair_recent_idx
  ON public.nudges (sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS nudges_receiver_recent_idx
  ON public.nudges (receiver_id, created_at DESC);

ALTER TABLE public.nudges ENABLE ROW LEVEL SECURITY;

-- Read-only to clients. Writes go exclusively through /api/nudge, which holds
-- the service role key: the cooldown is only meaningful if the client cannot
-- insert rows itself, and the same endpoint is the only thing that can deliver
-- the push a nudge is for.
DROP POLICY IF EXISTS "Users can see nudges they sent or received" ON public.nudges;
CREATE POLICY "Users can see nudges they sent or received"
  ON public.nudges FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
