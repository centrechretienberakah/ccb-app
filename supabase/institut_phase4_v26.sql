-- =====================================================================
-- CCB INSTITUT BERAKAH PHASE 4 v26 — quiz par leçon + score utilisateur
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- quiz_questions : array JSONB
-- Format : [{ "q": "Question?", "options": [{ "text": "A", "correct": true }, ...] }, ...]
ALTER TABLE public.institut_lessons
  ADD COLUMN IF NOT EXISTS quiz_questions JSONB;

ALTER TABLE public.institut_user_progress
  ADD COLUMN IF NOT EXISTS quiz_score INT,
  ADD COLUMN IF NOT EXISTS quiz_max INT,
  ADD COLUMN IF NOT EXISTS quiz_completed_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Phase 4 v26
-- =====================================================================
