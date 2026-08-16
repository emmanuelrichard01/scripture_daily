-- ============================================================================
-- Enables Supabase Realtime for friendships and reading_progress tables so
-- mutual reading progress and friend requests update live without polling.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'friendships'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reading_progress'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.reading_progress;
    END IF;
  END IF;
END $$;
