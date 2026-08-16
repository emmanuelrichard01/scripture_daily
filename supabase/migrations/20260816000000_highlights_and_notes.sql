-- Migration: 20260816000000_highlights_and_notes.sql
-- Description: Adds user verse highlights and reflection notes with Row Level Security

CREATE TABLE IF NOT EXISTS public.highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  color TEXT NOT NULL CHECK (color IN ('yellow', 'green', 'blue', 'pink')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT highlights_unique_verse UNIQUE (user_id, book, chapter, verse)
);

CREATE INDEX IF NOT EXISTS highlights_user_idx
  ON public.highlights (user_id);
CREATE INDEX IF NOT EXISTS highlights_verse_idx
  ON public.highlights (user_id, book, chapter);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_highlights_updated_at ON public.highlights;
CREATE TRIGGER update_highlights_updated_at
  BEFORE UPDATE ON public.highlights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Row Level Security
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own highlights" ON public.highlights;
CREATE POLICY "Users can view their own highlights"
  ON public.highlights FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own highlights" ON public.highlights;
CREATE POLICY "Users can insert their own highlights"
  ON public.highlights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own highlights" ON public.highlights;
CREATE POLICY "Users can update their own highlights"
  ON public.highlights FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own highlights" ON public.highlights;
CREATE POLICY "Users can delete their own highlights"
  ON public.highlights FOR DELETE
  USING (auth.uid() = user_id);
