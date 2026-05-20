-- =====================================================================
-- CCB JESUS DAILY TV PHASE 1 v27 — Netflix-style premium video platform
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================
-- Tables : jdtv_categories, jdtv_videos, jdtv_user_watchlist, jdtv_user_watch_progress

-- ─── 1) Catégories ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jdtv_categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  description  TEXT,
  icon         TEXT,                          -- emoji
  cover_url    TEXT,
  order_index  INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jdtv_categories_order
  ON public.jdtv_categories(order_index, name);


-- ─── 2) Vidéos ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jdtv_videos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id    UUID REFERENCES public.jdtv_categories(id) ON DELETE SET NULL,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  subtitle       TEXT,
  description    TEXT,
  thumbnail_url  TEXT,
  hero_url       TEXT,                                   -- image bandeau hero (16:9 grand)
  video_url      TEXT NOT NULL,                          -- YouTube / Vimeo / mp4 / m3u8
  duration_secs  INT,
  speaker        TEXT,                                   -- prédicateur / animateur
  scripture      TEXT,                                   -- verset associé
  published_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_published   BOOLEAN NOT NULL DEFAULT TRUE,
  is_premium     BOOLEAN NOT NULL DEFAULT FALSE,
  is_live        BOOLEAN NOT NULL DEFAULT FALSE,         -- diffusion LIVE en cours
  is_featured    BOOLEAN NOT NULL DEFAULT FALSE,         -- mis en avant dans Hero
  view_count     BIGINT NOT NULL DEFAULT 0,
  order_index    INT NOT NULL DEFAULT 0,
  tags           TEXT[] DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jdtv_videos_cat
  ON public.jdtv_videos(category_id, order_index);
CREATE INDEX IF NOT EXISTS idx_jdtv_videos_published
  ON public.jdtv_videos(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_jdtv_videos_live
  ON public.jdtv_videos(is_live) WHERE is_live = true;
CREATE INDEX IF NOT EXISTS idx_jdtv_videos_featured
  ON public.jdtv_videos(is_featured) WHERE is_featured = true;


-- ─── 3) Watchlist utilisateur ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jdtv_user_watchlist (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id   UUID NOT NULL REFERENCES public.jdtv_videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_jdtv_watchlist_user
  ON public.jdtv_user_watchlist(user_id, created_at DESC);


-- ─── 4) Progression visionnage ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jdtv_user_watch_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id      UUID NOT NULL REFERENCES public.jdtv_videos(id) ON DELETE CASCADE,
  watched_secs  INT NOT NULL DEFAULT 0,
  is_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  UNIQUE (user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_jdtv_progress_user
  ON public.jdtv_user_watch_progress(user_id, last_seen_at DESC);


-- =====================================================================
-- RLS — lecture publique (vidéos publiées), écriture moderator+
-- =====================================================================

ALTER TABLE public.jdtv_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jdtv_cat_read_all ON public.jdtv_categories;
CREATE POLICY jdtv_cat_read_all ON public.jdtv_categories
  FOR SELECT USING (is_published = true OR public.is_moderator_or_above());
DROP POLICY IF EXISTS jdtv_cat_write_admin ON public.jdtv_categories;
CREATE POLICY jdtv_cat_write_admin ON public.jdtv_categories
  FOR ALL USING (public.is_moderator_or_above())
  WITH CHECK (public.is_moderator_or_above());

ALTER TABLE public.jdtv_videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jdtv_videos_read ON public.jdtv_videos;
CREATE POLICY jdtv_videos_read ON public.jdtv_videos
  FOR SELECT USING (is_published = true OR public.is_moderator_or_above());
DROP POLICY IF EXISTS jdtv_videos_write_admin ON public.jdtv_videos;
CREATE POLICY jdtv_videos_write_admin ON public.jdtv_videos
  FOR ALL USING (public.is_moderator_or_above())
  WITH CHECK (public.is_moderator_or_above());

ALTER TABLE public.jdtv_user_watchlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jdtv_watchlist_read_own ON public.jdtv_user_watchlist;
CREATE POLICY jdtv_watchlist_read_own ON public.jdtv_user_watchlist
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS jdtv_watchlist_insert_own ON public.jdtv_user_watchlist;
CREATE POLICY jdtv_watchlist_insert_own ON public.jdtv_user_watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS jdtv_watchlist_delete_own ON public.jdtv_user_watchlist;
CREATE POLICY jdtv_watchlist_delete_own ON public.jdtv_user_watchlist
  FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.jdtv_user_watch_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jdtv_progress_read_own ON public.jdtv_user_watch_progress;
CREATE POLICY jdtv_progress_read_own ON public.jdtv_user_watch_progress
  FOR SELECT USING (auth.uid() = user_id OR public.is_moderator_or_above());
DROP POLICY IF EXISTS jdtv_progress_insert_own ON public.jdtv_user_watch_progress;
CREATE POLICY jdtv_progress_insert_own ON public.jdtv_user_watch_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS jdtv_progress_update_own ON public.jdtv_user_watch_progress;
CREATE POLICY jdtv_progress_update_own ON public.jdtv_user_watch_progress
  FOR UPDATE USING (auth.uid() = user_id);


-- =====================================================================
-- Seed initial : 10 catégories CCB (idempotent)
-- =====================================================================
INSERT INTO public.jdtv_categories (slug, name, description, icon, order_index)
SELECT * FROM (VALUES
  ('predications',   'Prédications',     'Messages prêchés par les pasteurs', '🎙️', 1),
  ('podcast',        'Podcast',          'Échanges et entretiens audio',      '🎧', 2),
  ('enseignements',  'Enseignements',    'Cours bibliques approfondis',       '📖', 3),
  ('prieres',        'Prières',          'Veillées et temps de prière',       '🙏', 4),
  ('worship',        'Worship',          'Adoration et louange',              '🎶', 5),
  ('temoignages',    'Témoignages',      'Vies transformées par Christ',      '✨', 6),
  ('bootcamps',      'Bootcamps',        'Séminaires intensifs',              '🔥', 7),
  ('conferences',    'Conférences',      'Événements et conventions',         '🎤', 8),
  ('leadership',     'Leadership',       'Formation des leaders',             '👑', 9),
  ('vie-chretienne', 'Vie chrétienne',   'Au quotidien avec Christ',          '🕊️', 10)
) AS v(slug, name, description, icon, order_index)
WHERE NOT EXISTS (
  SELECT 1 FROM public.jdtv_categories jc WHERE jc.slug = v.slug
);


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Jesus Daily TV Phase 1 v27
-- =====================================================================
