-- ============================================================================
-- Completes the schema the application actually depends on.
--
-- The initial migration created profiles, reading_progress and user_settings,
-- but the app also reads and writes `friendships`, `push_subscriptions` and the
-- `avatars` storage bucket — none of which existed in version control. The
-- repository could not stand up a working deployment. This migration adds them,
-- along with the friend-visibility policies the Community page assumes, the
-- indexes its queries need, and a few corrections to the original tables.
--
-- Written to be idempotent so it can be applied to an environment where some of
-- these objects were created by hand.
-- ============================================================================

-- ─────────────────────────────── Friendships ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.friendships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- You cannot befriend yourself.
  CONSTRAINT friendships_no_self CHECK (sender_id <> receiver_id),
  -- One row per ordered pair; the app relies on the resulting 23505 to detect
  -- a duplicate request rather than round-tripping a SELECT first.
  CONSTRAINT friendships_unique_pair UNIQUE (sender_id, receiver_id)
);

-- Prevents A→B and B→A both existing as separate pending requests.
CREATE UNIQUE INDEX IF NOT EXISTS friendships_unique_undirected
  ON public.friendships (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id));

CREATE INDEX IF NOT EXISTS friendships_sender_status_idx
  ON public.friendships (sender_id, status);
CREATE INDEX IF NOT EXISTS friendships_receiver_status_idx
  ON public.friendships (receiver_id, status);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
CREATE POLICY "Users can view their own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT
  -- Only ever as yourself, and only in the pending state: a client must not be
  -- able to insert a pre-accepted row and grant itself read access.
  WITH CHECK (auth.uid() = sender_id AND status = 'pending');

DROP POLICY IF EXISTS "Receivers can respond to requests" ON public.friendships;
CREATE POLICY "Receivers can respond to requests"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id AND status IN ('accepted', 'rejected'));

DROP POLICY IF EXISTS "Either party can remove a friendship" ON public.friendships;
CREATE POLICY "Either party can remove a friendship"
  ON public.friendships FOR DELETE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- ─────────────────────────── Friend visibility ───────────────────────────
--
-- SECURITY DEFINER so the check can read `friendships` without recursing
-- through that table's own RLS policies. `search_path` is pinned to defeat
-- search-path hijacking, which is the standard hazard with definer functions.

CREATE OR REPLACE FUNCTION public.are_friends(a UUID, b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((sender_id = a AND receiver_id = b) OR (sender_id = b AND receiver_id = a))
  );
$$;

-- Profiles are discoverable by display name so friends can find each other.
-- Only the three columns the UI renders are exposed; email lives in auth.users
-- and is never selectable here.
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are discoverable" ON public.profiles;
CREATE POLICY "Profiles are discoverable"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Accepted friends may read each other's aggregate progress — and only that;
-- `completed_readings` is excluded from what the client selects, but the policy
-- is the real boundary, so keep this table's columns coarse.
DROP POLICY IF EXISTS "Friends can view each other's progress" ON public.reading_progress;
CREATE POLICY "Friends can view each other's progress"
  ON public.reading_progress FOR SELECT
  USING (auth.uid() = user_id OR public.are_friends(auth.uid(), user_id));

-- ──────────────────────────── Push subscriptions ────────────────────────────

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  -- IANA zone name from the subscribing device. Without it the reminder cron
  -- cannot tell whose local 07:00 it currently is.
  timezone   TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage their own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ───────────────────────────── user_settings ─────────────────────────────

-- The original default was day *names*, but the client stores day *numbers*
-- (0 = Sunday). Any row created by the signup trigger and never edited would
-- have parsed to NaN on read.
ALTER TABLE public.user_settings
  ALTER COLUMN reminder_days SET DEFAULT ARRAY['0','1','2','3','4','5','6'];

UPDATE public.user_settings
SET reminder_days = ARRAY['0','1','2','3','4','5','6']
WHERE reminder_days && ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS preferred_translation TEXT NOT NULL DEFAULT 'ESV',
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

ALTER TABLE public.user_settings
  DROP CONSTRAINT IF EXISTS user_settings_theme_check;
ALTER TABLE public.user_settings
  ADD CONSTRAINT user_settings_theme_check CHECK (theme IN ('light', 'dark', 'system'));

-- The former 'auto' theme was removed from the client; migrate any stragglers.
UPDATE public.user_settings SET theme = 'system' WHERE theme NOT IN ('light', 'dark', 'system');

DROP POLICY IF EXISTS "Users can delete their own settings" ON public.user_settings;
CREATE POLICY "Users can delete their own settings"
  ON public.user_settings FOR DELETE
  USING (auth.uid() = user_id);

-- ──────────────────────────── reading_progress ────────────────────────────

-- The client upserts on this column; without a unique constraint Postgres
-- rejects `ON CONFLICT (user_id)` outright.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.reading_progress'::regclass AND contype = 'u'
  ) THEN
    ALTER TABLE public.reading_progress ADD CONSTRAINT reading_progress_user_unique UNIQUE (user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS reading_progress_user_idx
  ON public.reading_progress (user_id);

-- ─────────────────────────────── Timestamps ───────────────────────────────

DROP TRIGGER IF EXISTS update_friendships_updated_at ON public.friendships;
CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────── Signup trigger fix ───────────────────────────
--
-- The original trigger would abort the whole signup if any of its three inserts
-- failed — for example when a row already existed. Made non-fatal and given a
-- pinned search_path.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name'
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'avatar_url',
      NEW.raw_user_meta_data ->> 'picture'
    )
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.reading_progress (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_settings (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block account creation over a profile row.
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- ────────────────────────────── Avatar storage ──────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', TRUE, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public = TRUE,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Uploads are confined to a folder named for the uploader's own uid, so one
-- user cannot overwrite another's avatar.
DROP POLICY IF EXISTS "Users manage their own avatar" ON storage.objects;
CREATE POLICY "Users manage their own avatar"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );
