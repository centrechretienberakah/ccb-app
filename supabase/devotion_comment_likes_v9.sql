-- =====================================================================
-- CCB DEVOTION COMMENT LIKES v9 — likes sur les commentaires de méditations
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.devotion_comment_likes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id   UUID NOT NULL REFERENCES public.devotion_comments(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dev_comment_likes_comment ON public.devotion_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_dev_comment_likes_user    ON public.devotion_comment_likes(user_id);

ALTER TABLE public.devotion_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dev_comment_likes_public_read ON public.devotion_comment_likes;
CREATE POLICY dev_comment_likes_public_read ON public.devotion_comment_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS dev_comment_likes_insert_own ON public.devotion_comment_likes;
CREATE POLICY dev_comment_likes_insert_own ON public.devotion_comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS dev_comment_likes_delete_own ON public.devotion_comment_likes;
CREATE POLICY dev_comment_likes_delete_own ON public.devotion_comment_likes
  FOR DELETE USING (auth.uid() = user_id OR public.is_moderator_or_above());

-- =====================================================================
-- FIN
-- =====================================================================
