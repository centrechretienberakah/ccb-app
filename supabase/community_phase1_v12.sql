-- =====================================================================
-- CCB COMMUNAUTÉ PHASE 1 v12 — extensions feed Skool-style
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- ─── 1) Étendre posts : audio, pdf, post_kind (categorisation logique) ─

-- post_type existant = média (text/image/video/link/poll/quiz)
-- On ajoute audio + pdf au check si pas déjà
DO $$
BEGIN
  -- Drop l'ancien check s'il existe
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_post_type_check'
  ) THEN
    ALTER TABLE public.posts DROP CONSTRAINT posts_post_type_check;
  END IF;
  ALTER TABLE public.posts ADD CONSTRAINT posts_post_type_check
    CHECK (post_type IN ('text','image','video','audio','pdf','link','poll','quiz'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- post_kind = catégorisation thématique (différent de la catégorie qui est libre)
-- Permet de filtrer rapidement par type de contenu
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS post_kind TEXT DEFAULT 'discussion'
    CHECK (post_kind IN ('discussion','testimony','prayer','announcement','teaching','question','encouragement'));

CREATE INDEX IF NOT EXISTS idx_posts_kind ON public.posts(post_kind);


-- ─── 2) Commentaires imbriqués (replies à un commentaire) ─────────────
ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_post_comments_parent
  ON public.post_comments(parent_comment_id);


-- ─── 3) Likes sur commentaires ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_comment_likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id  UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_comment_likes_comment
  ON public.post_comment_likes(comment_id);

ALTER TABLE public.post_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS post_comment_likes_read_all ON public.post_comment_likes;
CREATE POLICY post_comment_likes_read_all ON public.post_comment_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS post_comment_likes_insert_own ON public.post_comment_likes;
CREATE POLICY post_comment_likes_insert_own ON public.post_comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS post_comment_likes_delete_own ON public.post_comment_likes;
CREATE POLICY post_comment_likes_delete_own ON public.post_comment_likes
  FOR DELETE USING (auth.uid() = user_id OR public.is_moderator_or_above());


-- ─── 4) Bookmarks (enregistrer un post) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user
  ON public.post_bookmarks(user_id, created_at DESC);

ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS post_bookmarks_read_own ON public.post_bookmarks;
CREATE POLICY post_bookmarks_read_own ON public.post_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS post_bookmarks_insert_own ON public.post_bookmarks;
CREATE POLICY post_bookmarks_insert_own ON public.post_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS post_bookmarks_delete_own ON public.post_bookmarks;
CREATE POLICY post_bookmarks_delete_own ON public.post_bookmarks
  FOR DELETE USING (auth.uid() = user_id);


-- ─── 5) Signalements (reports) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id   UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','reviewed','dismissed','actioned')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ,
  CONSTRAINT report_target_xor CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_post_reports_status
  ON public.post_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_reports_user
  ON public.post_reports(user_id);

ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS post_reports_insert_own ON public.post_reports;
CREATE POLICY post_reports_insert_own ON public.post_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS post_reports_read_admin ON public.post_reports;
CREATE POLICY post_reports_read_admin ON public.post_reports
  FOR SELECT USING (public.is_moderator_or_above() OR auth.uid() = user_id);

DROP POLICY IF EXISTS post_reports_update_admin ON public.post_reports;
CREATE POLICY post_reports_update_admin ON public.post_reports
  FOR UPDATE USING (public.is_moderator_or_above());


-- ─── 6) Catégories par défaut (post_categories) ────────────────────────
-- Insère les 11 catégories de la spec si absentes
INSERT INTO public.post_categories (name, icon, color, sort_order)
SELECT * FROM (VALUES
  ('Discussions',         '💬', '#5A2CA0', 1),
  ('Vie spirituelle',     '🙏', '#D4AF37', 2),
  ('Témoignages',         '✨', '#D4AF37', 3),
  ('Prières',             '🕯️', '#5A2CA0', 4),
  ('Leadership',          '👑', '#D4AF37', 5),
  ('Jeunesse',            '🎓', '#5A2CA0', 6),
  ('Couple & Famille',    '👨‍👩‍👧', '#5A2CA0', 7),
  ('Ministère',           '⛪', '#D4AF37', 8),
  ('Évangélisation',      '📣', '#5A2CA0', 9),
  ('Questions bibliques', '📖', '#D4AF37', 10),
  ('Actualités CCB',      '🏛️', '#5A2CA0', 11)
) AS v(name, icon, color, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.post_categories pc WHERE pc.name = v.name
);


-- ─── 7) Reload schema cache ────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN — Communauté Phase 1
-- =====================================================================
