-- =====================================================================
-- CCB FIX v11 — user_bible_plans : ajoute les colonnes manquantes
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================
-- Problème : la table existait avec un schéma antérieur, sans
-- completed_days / is_active / started_at / updated_at.
-- =====================================================================

-- 1) Création de la table si elle n'existe pas (sécurité)
CREATE TABLE IF NOT EXISTS public.user_bible_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id       TEXT NOT NULL,
  completed_days INT[] NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Ajoute les colonnes manquantes si absentes
ALTER TABLE public.user_bible_plans
  ADD COLUMN IF NOT EXISTS completed_days INT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.user_bible_plans
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.user_bible_plans
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.user_bible_plans
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3) Index
CREATE INDEX IF NOT EXISTS idx_user_bible_plans_user_id
  ON public.user_bible_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bible_plans_active
  ON public.user_bible_plans(user_id, is_active);

-- 4) Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_bible_plans_updated_at ON public.user_bible_plans;
CREATE TRIGGER user_bible_plans_updated_at
  BEFORE UPDATE ON public.user_bible_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) RLS
ALTER TABLE public.user_bible_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own plans" ON public.user_bible_plans;
CREATE POLICY "Users can view their own plans"
  ON public.user_bible_plans FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own plans" ON public.user_bible_plans;
CREATE POLICY "Users can insert their own plans"
  ON public.user_bible_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own plans" ON public.user_bible_plans;
CREATE POLICY "Users can update their own plans"
  ON public.user_bible_plans FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own plans" ON public.user_bible_plans;
CREATE POLICY "Users can delete their own plans"
  ON public.user_bible_plans FOR DELETE
  USING (auth.uid() = user_id);

-- 6) Force PostgREST à recharger le schéma cache (résout l'erreur PGRST204)
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN — Après exécution, /plan-biblique et /bible/theme/[id] devraient
-- accepter le démarrage de plans.
-- =====================================================================
