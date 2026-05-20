-- =====================================================================
-- CCB INSTITUT BERAKAH PHASE 3 v25 — favoris utilisateur
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.institut_user_favorites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES public.institut_courses(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_institut_favorites_user
  ON public.institut_user_favorites(user_id, created_at DESC);

ALTER TABLE public.institut_user_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS institut_fav_read_own ON public.institut_user_favorites;
CREATE POLICY institut_fav_read_own ON public.institut_user_favorites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS institut_fav_insert_own ON public.institut_user_favorites;
CREATE POLICY institut_fav_insert_own ON public.institut_user_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS institut_fav_delete_own ON public.institut_user_favorites;
CREATE POLICY institut_fav_delete_own ON public.institut_user_favorites
  FOR DELETE USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Institut Berakah Phase 3 v25
-- =====================================================================
