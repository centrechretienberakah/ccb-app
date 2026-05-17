-- =====================================================================
-- CCB PRIÈRE PHASE 1 v15 — extension prayer_requests + likes commentaires
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- ─── Étendre prayer_requests : titre, catégorie, visibilité, exaucé+ ──
ALTER TABLE public.prayer_requests
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'autre'
    CHECK (category IN ('sante', 'finances', 'famille', 'salut', 'travail', 'delivrance', 'spirituel', 'autre')),
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'members'
    CHECK (visibility IN ('private', 'members', 'public')),
  ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS answered_with TEXT;

CREATE INDEX IF NOT EXISTS idx_prayer_requests_category
  ON public.prayer_requests(category);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_answered
  ON public.prayer_requests(is_answered, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_visibility
  ON public.prayer_requests(visibility, created_at DESC);


-- ─── Likes sur commentaires de prière ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prayer_comment_likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id  UUID NOT NULL REFERENCES public.prayer_comments(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_prayer_comment_likes_comment
  ON public.prayer_comment_likes(comment_id);

ALTER TABLE public.prayer_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prayer_comment_likes_read_all ON public.prayer_comment_likes;
CREATE POLICY prayer_comment_likes_read_all ON public.prayer_comment_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS prayer_comment_likes_insert_own ON public.prayer_comment_likes;
CREATE POLICY prayer_comment_likes_insert_own ON public.prayer_comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS prayer_comment_likes_delete_own ON public.prayer_comment_likes;
CREATE POLICY prayer_comment_likes_delete_own ON public.prayer_comment_likes
  FOR DELETE USING (auth.uid() = user_id);


-- ─── RLS prayer_requests : visibilité ────────────────────────────────
-- Override la policy SELECT existante pour respecter visibility
DROP POLICY IF EXISTS "Prayer requests are viewable by everyone" ON public.prayer_requests;
DROP POLICY IF EXISTS prayer_requests_read_visible ON public.prayer_requests;
CREATE POLICY prayer_requests_read_visible ON public.prayer_requests
  FOR SELECT USING (
    visibility = 'public'
    OR (visibility = 'members' AND auth.uid() IS NOT NULL)
    OR (visibility = 'private' AND (auth.uid() = user_id OR public.is_moderator_or_above()))
  );


-- ─── Reload PostgREST cache ──────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Prière Phase 1 v15
-- =====================================================================
