-- =====================================================================
-- CCB BIBLE PHASE 1 v10 — Surlignage, progression chapitre, collections
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- ─── 1) HIGHLIGHTS (surlignages verset par couleur) ──────────────────
CREATE TABLE IF NOT EXISTS public.bible_highlights (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_name    TEXT NOT NULL,
  chapter      INT  NOT NULL,
  verse_number INT  NOT NULL,
  color        TEXT NOT NULL CHECK (color IN ('yellow','green','blue','pink')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, book_name, chapter, verse_number)
);

CREATE INDEX IF NOT EXISTS idx_bible_hl_user_chap
  ON public.bible_highlights(user_id, book_name, chapter);

ALTER TABLE public.bible_highlights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bible_hl_select_own ON public.bible_highlights;
CREATE POLICY bible_hl_select_own ON public.bible_highlights
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS bible_hl_insert_own ON public.bible_highlights;
CREATE POLICY bible_hl_insert_own ON public.bible_highlights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS bible_hl_update_own ON public.bible_highlights;
CREATE POLICY bible_hl_update_own ON public.bible_highlights
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS bible_hl_delete_own ON public.bible_highlights;
CREATE POLICY bible_hl_delete_own ON public.bible_highlights
  FOR DELETE USING (auth.uid() = user_id);


-- ─── 2) CHAPTER PROGRESS (marquer chapitre lu) ───────────────────────
CREATE TABLE IF NOT EXISTS public.bible_chapter_progress (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_name   TEXT NOT NULL,
  chapter     INT  NOT NULL,
  read_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, book_name, chapter)
);

CREATE INDEX IF NOT EXISTS idx_bible_chap_progress_user
  ON public.bible_chapter_progress(user_id, read_at DESC);

ALTER TABLE public.bible_chapter_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bible_chap_select_own ON public.bible_chapter_progress;
CREATE POLICY bible_chap_select_own ON public.bible_chapter_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS bible_chap_insert_own ON public.bible_chapter_progress;
CREATE POLICY bible_chap_insert_own ON public.bible_chapter_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS bible_chap_delete_own ON public.bible_chapter_progress;
CREATE POLICY bible_chap_delete_own ON public.bible_chapter_progress
  FOR DELETE USING (auth.uid() = user_id);


-- ─── 3) COLLECTIONS (groupes de versets thématiques) ─────────────────
CREATE TABLE IF NOT EXISTS public.bible_verse_collections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  emoji        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bible_collections_user
  ON public.bible_verse_collections(user_id, created_at DESC);

ALTER TABLE public.bible_verse_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bible_coll_select_own ON public.bible_verse_collections;
CREATE POLICY bible_coll_select_own ON public.bible_verse_collections
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS bible_coll_insert_own ON public.bible_verse_collections;
CREATE POLICY bible_coll_insert_own ON public.bible_verse_collections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS bible_coll_update_own ON public.bible_verse_collections;
CREATE POLICY bible_coll_update_own ON public.bible_verse_collections
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS bible_coll_delete_own ON public.bible_verse_collections;
CREATE POLICY bible_coll_delete_own ON public.bible_verse_collections
  FOR DELETE USING (auth.uid() = user_id);


-- Lien collection ↔ verset sauvegardé
ALTER TABLE public.user_saved_verses
  ADD COLUMN IF NOT EXISTS collection_id UUID
    REFERENCES public.bible_verse_collections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_saved_verses_collection
  ON public.user_saved_verses(collection_id);


-- ─── 4) NOTES LIÉES AU VERSET (extension de user_bible_notes) ────────
ALTER TABLE public.user_bible_notes
  ADD COLUMN IF NOT EXISTS verse_number INT;

CREATE INDEX IF NOT EXISTS idx_bible_notes_user_verse
  ON public.user_bible_notes(user_id, book_name, chapter, verse_number);


-- ─── 5) VERSET DU JOUR (table de référence partagée) ─────────────────
CREATE TABLE IF NOT EXISTS public.bible_verse_of_the_day (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_date     DATE NOT NULL UNIQUE,
  book_name    TEXT NOT NULL,
  chapter      INT  NOT NULL,
  verse_number INT  NOT NULL,
  verse_text   TEXT NOT NULL,
  reference    TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bible_verse_of_the_day ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vod_public_read ON public.bible_verse_of_the_day;
CREATE POLICY vod_public_read ON public.bible_verse_of_the_day
  FOR SELECT USING (true);

DROP POLICY IF EXISTS vod_admin_write ON public.bible_verse_of_the_day;
CREATE POLICY vod_admin_write ON public.bible_verse_of_the_day
  FOR ALL USING (public.is_moderator_or_above())
  WITH CHECK (public.is_moderator_or_above());


-- =====================================================================
-- FIN BIBLE PHASE 1 v10
-- =====================================================================
