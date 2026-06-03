-- =====================================================================
-- CCB — Méditons Ensemble : persistance « Marquer comme lu » v58
--
-- BUG : le code (DevotionHomeCard, /dashboard, /devotion) lit/écrit la
-- table `devotion_progress`, mais celle-ci n'existait pas (seule l'ancienne
-- `user_devotion_progress` → `daily_devotions` existait). L'upsert échouait
-- donc silencieusement → l'état « lu » n'était jamais persisté et revenait
-- à « non lu » au rafraîchissement.
--
-- Cette migration crée la table attendue par le code, reliée à `devotions`
-- (la table réellement utilisée par getTodayDevotion / ensure), avec RLS.
-- Idempotent. À exécuter dans Supabase SQL Editor.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.devotion_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  devotion_id  UUID NOT NULL REFERENCES public.devotions(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, devotion_id)   -- nécessaire pour upsert onConflict
);

CREATE INDEX IF NOT EXISTS idx_devotion_progress_user
  ON public.devotion_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_devotion_progress_devotion
  ON public.devotion_progress(devotion_id);

ALTER TABLE public.devotion_progress ENABLE ROW LEVEL SECURITY;

-- Chaque membre gère uniquement sa propre progression
DROP POLICY IF EXISTS devotion_progress_self ON public.devotion_progress;
CREATE POLICY devotion_progress_self ON public.devotion_progress
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v58 — après exécution, « Marquer comme lu » persiste au refresh.
-- =====================================================================
