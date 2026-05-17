-- =====================================================================
-- CCB PRIONS ENSEMBLE PHASE 2 v16 — réponses imbriquées sur commentaires
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

ALTER TABLE public.prayer_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID
    REFERENCES public.prayer_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_prayer_comments_parent
  ON public.prayer_comments(parent_comment_id);

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Phase 2 v16
-- =====================================================================
