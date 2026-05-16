-- =====================================================================
-- CCB COMMUNAUTÉ v14 — ajoute la colonne title sur posts
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS title TEXT;

-- Reload PostgREST cache
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN
-- =====================================================================
