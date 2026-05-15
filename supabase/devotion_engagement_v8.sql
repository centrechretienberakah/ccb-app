-- =====================================================================
-- CCB DEVOTION ENGAGEMENT v8 — likes + comments sur les méditations
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. devotion_likes (un user peut liker une devotion une fois)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.devotion_likes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devotion_id  UUID NOT NULL REFERENCES public.devotions(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (devotion_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_devotion_likes_devotion ON public.devotion_likes(devotion_id);
CREATE INDEX IF NOT EXISTS idx_devotion_likes_user     ON public.devotion_likes(user_id);

ALTER TABLE public.devotion_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS devotion_likes_public_read ON public.devotion_likes;
CREATE POLICY devotion_likes_public_read ON public.devotion_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS devotion_likes_insert_own ON public.devotion_likes;
CREATE POLICY devotion_likes_insert_own ON public.devotion_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS devotion_likes_delete_own ON public.devotion_likes;
CREATE POLICY devotion_likes_delete_own ON public.devotion_likes
  FOR DELETE USING (auth.uid() = user_id OR public.is_moderator_or_above());

-- ---------------------------------------------------------------------
-- 2. devotion_comments
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.devotion_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devotion_id  UUID NOT NULL REFERENCES public.devotions(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content      TEXT NOT NULL CHECK (char_length(content) BETWEEN 2 AND 1000),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devotion_comments_devotion ON public.devotion_comments(devotion_id, created_at);
CREATE INDEX IF NOT EXISTS idx_devotion_comments_user     ON public.devotion_comments(user_id);

ALTER TABLE public.devotion_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS devotion_comments_public_read ON public.devotion_comments;
CREATE POLICY devotion_comments_public_read ON public.devotion_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS devotion_comments_insert_own ON public.devotion_comments;
CREATE POLICY devotion_comments_insert_own ON public.devotion_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS devotion_comments_update_own ON public.devotion_comments;
CREATE POLICY devotion_comments_update_own ON public.devotion_comments
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS devotion_comments_delete_own ON public.devotion_comments;
CREATE POLICY devotion_comments_delete_own ON public.devotion_comments
  FOR DELETE USING (auth.uid() = user_id OR public.is_moderator_or_above());

-- =====================================================================
-- FIN
-- =====================================================================
