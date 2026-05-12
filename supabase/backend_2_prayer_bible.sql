-- CCB BACKEND — PARTIE 2/3 : Prière + Bible + Events + Realtime communauté
-- Executer en second

-- =====================================================================
-- 5. PRIERE — INTERCESSIONS & COMMENTAIRES
--    NOTE: table reelle = prayer_request (sans 's')
--    Tables existent deja
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.prayer_intercessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id  UUID NOT NULL REFERENCES public.prayer_request(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (prayer_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_intercessions_prayer ON public.prayer_intercessions(prayer_id);
CREATE INDEX IF NOT EXISTS idx_intercessions_user   ON public.prayer_intercessions(user_id);
ALTER TABLE public.prayer_intercessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "intercessions_select" ON public.prayer_intercessions;
DROP POLICY IF EXISTS "intercessions_insert" ON public.prayer_intercessions;
DROP POLICY IF EXISTS "intercessions_delete" ON public.prayer_intercessions;
CREATE POLICY "intercessions_select" ON public.prayer_intercessions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "intercessions_insert" ON public.prayer_intercessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "intercessions_delete" ON public.prayer_intercessions FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.prayer_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id  UUID NOT NULL REFERENCES public.prayer_request(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_prayer_comments_prayer ON public.prayer_comments(prayer_id, created_at); EXCEPTION WHEN undefined_column THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
ALTER TABLE public.prayer_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prayer_comments_select" ON public.prayer_comments;
DROP POLICY IF EXISTS "prayer_comments_insert" ON public.prayer_comments;
DROP POLICY IF EXISTS "prayer_comments_delete" ON public.prayer_comments;
CREATE POLICY "prayer_comments_select" ON public.prayer_comments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "prayer_comments_insert" ON public.prayer_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prayer_comments_delete" ON public.prayer_comments FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_request;    EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_comments;   EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_intercessions; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

-- =====================================================================
-- 6. EVENEMENTS — RSVP
--    NOTE: table reelle = events_rsvp (avec 's')
--    On ajoute les colonnes manquantes + policies
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.events_rsvp (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'attending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

DO $$
BEGIN
  BEGIN ALTER TABLE public.events_rsvp ADD COLUMN status TEXT NOT NULL DEFAULT 'attending'; EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_table THEN NULL; WHEN others THEN NULL; END;
END $$;

CREATE INDEX IF NOT EXISTS idx_events_rsvp_event ON public.events_rsvp(event_id);
CREATE INDEX IF NOT EXISTS idx_events_rsvp_user  ON public.events_rsvp(user_id);
ALTER TABLE public.events_rsvp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_rsvp_select"     ON public.events_rsvp;
DROP POLICY IF EXISTS "events_rsvp_insert"     ON public.events_rsvp;
DROP POLICY IF EXISTS "events_rsvp_update_own" ON public.events_rsvp;
DROP POLICY IF EXISTS "events_rsvp_delete_own" ON public.events_rsvp;
CREATE POLICY "events_rsvp_select"     ON public.events_rsvp FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "events_rsvp_insert"     ON public.events_rsvp FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "events_rsvp_update_own" ON public.events_rsvp FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "events_rsvp_delete_own" ON public.events_rsvp FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.events;      EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.events_rsvp; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

-- =====================================================================
-- 7. BIBLE — VERSETS SAUVEGARDES, NOTES, PROGRESSION
--    (tables existent deja)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.user_saved_verses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book       TEXT NOT NULL,
  chapter    INTEGER NOT NULL,
  verse      INTEGER NOT NULL,
  verse_text TEXT NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, book, chapter, verse)
);

DO $$
BEGIN
  BEGIN ALTER TABLE public.user_saved_verses ADD COLUMN note TEXT; EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_table THEN NULL; WHEN others THEN NULL; END;
END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_saved_verses_user ON public.user_saved_verses(user_id, created_at DESC); EXCEPTION WHEN undefined_column THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
ALTER TABLE public.user_saved_verses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "saved_verses_own" ON public.user_saved_verses;
CREATE POLICY "saved_verses_own" ON public.user_saved_verses FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_bible_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book       TEXT NOT NULL,
  chapter    INTEGER NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, book, chapter)
);

DO $$
BEGIN
  BEGIN ALTER TABLE public.user_bible_notes ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; WHEN undefined_table THEN NULL; WHEN others THEN NULL; END;
END $$;

CREATE INDEX IF NOT EXISTS idx_bible_notes_user ON public.user_bible_notes(user_id);
ALTER TABLE public.user_bible_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bible_notes_own" ON public.user_bible_notes;
CREATE POLICY "bible_notes_own" ON public.user_bible_notes FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS bible_notes_updated_at ON public.user_bible_notes;
CREATE TRIGGER bible_notes_updated_at
  BEFORE UPDATE ON public.user_bible_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.user_reading_progress (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book    TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, book, chapter)
);

CREATE INDEX IF NOT EXISTS idx_reading_progress_user ON public.user_reading_progress(user_id);
ALTER TABLE public.user_reading_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reading_progress_own" ON public.user_reading_progress;
CREATE POLICY "reading_progress_own" ON public.user_reading_progress FOR ALL USING (auth.uid() = user_id);

-- =====================================================================
-- 8. GALERIE PHOTOS — NOUVELLES TABLES
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.photo_albums (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  cover_url   TEXT,
  event_id    UUID REFERENCES public.events(id) ON DELETE SET NULL,
  is_public   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_albums_created ON public.photo_albums(created_at DESC); EXCEPTION WHEN undefined_column THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
ALTER TABLE public.photo_albums ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "albums_public_read" ON public.photo_albums;
DROP POLICY IF EXISTS "albums_admin_write" ON public.photo_albums;
CREATE POLICY "albums_public_read" ON public.photo_albums FOR SELECT USING (is_public = true);
CREATE POLICY "albums_admin_write" ON public.photo_albums FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','leader'))
);

CREATE TABLE IF NOT EXISTS public.photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id    UUID NOT NULL REFERENCES public.photo_albums(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  caption     TEXT,
  like_count  INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_photos_album ON public.photos(album_id, created_at DESC); EXCEPTION WHEN undefined_column THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "photos_public_read" ON public.photos;
DROP POLICY IF EXISTS "photos_admin_write" ON public.photos;
CREATE POLICY "photos_public_read" ON public.photos FOR SELECT USING (true);
CREATE POLICY "photos_admin_write" ON public.photos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','leader'))
);

-- =====================================================================
-- 9. BIBLIOTHEQUE DIGITALE — NOUVELLE TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.media_library (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  description    TEXT,
  type           TEXT NOT NULL CHECK (type IN ('pdf','audio','video','ebook','document')),
  category       TEXT DEFAULT 'general',
  file_url       TEXT NOT NULL,
  thumbnail_url  TEXT,
  file_size_mb   DECIMAL(10,2),
  duration_secs  INTEGER,
  is_premium     BOOLEAN NOT NULL DEFAULT false,
  is_published   BOOLEAN NOT NULL DEFAULT true,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_by     UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_type      ON public.media_library(type);
CREATE INDEX IF NOT EXISTS idx_media_created   ON public.media_library(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_published ON public.media_library(is_published);
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "media_public_read"  ON public.media_library;
DROP POLICY IF EXISTS "media_premium_read" ON public.media_library;
DROP POLICY IF EXISTS "media_admin_write"  ON public.media_library;
CREATE POLICY "media_public_read"  ON public.media_library FOR SELECT USING (is_published = true AND is_premium = false);
CREATE POLICY "media_premium_read" ON public.media_library FOR SELECT USING (
  is_published = true AND (
    is_premium = false OR
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND is_premium = true)
  )
);
CREATE POLICY "media_admin_write"  ON public.media_library FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
