-- =====================================================================
-- CCB SCHEMA FIXES v4 — alignement schéma prod avec ce que le code attend
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. user_profiles : ajout `display_name` (le code l'utilise partout)
-- ---------------------------------------------------------------------

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Backfill : si display_name vide, copie depuis full_name puis email
UPDATE public.user_profiles up
   SET display_name = COALESCE(up.full_name, NULLIF(split_part(u.email, '@', 1), ''), 'Membre')
  FROM auth.users u
 WHERE up.user_id = u.id
   AND (up.display_name IS NULL OR up.display_name = '');

-- ---------------------------------------------------------------------
-- 2. prayer_requests : colonnes manquantes attendues par l'app
-- ---------------------------------------------------------------------

ALTER TABLE public.prayer_requests
  ADD COLUMN IF NOT EXISTS title         TEXT,
  ADD COLUMN IF NOT EXISTS category      TEXT DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS prayer_count  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS testimony     TEXT,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill : titre par défaut si manquant
UPDATE public.prayer_requests
   SET title = COALESCE(
     NULLIF(SUBSTRING(content FROM 1 FOR 60), ''),
     'Sujet de prière'
   )
 WHERE title IS NULL OR title = '';

-- ---------------------------------------------------------------------
-- 3. devotions : aligner avec ce que le code attend
-- ---------------------------------------------------------------------

-- Cas A : la table 'devotions' n'existe pas et 'daily_devotions' existe
--         → on renomme daily_devotions en devotions
DO $$
DECLARE
  has_devotions BOOLEAN;
  has_daily BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'devotions') INTO has_devotions;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_devotions') INTO has_daily;
  IF NOT has_devotions AND has_daily THEN
    EXECUTE 'ALTER TABLE public.daily_devotions RENAME TO devotions';
  END IF;
END $$;

-- Cas B : la table devotions existe maintenant — assure-toi qu'elle a les colonnes attendues
CREATE TABLE IF NOT EXISTS public.devotions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devotion_date       DATE NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  verse_reference     TEXT NOT NULL,
  verse_text          TEXT NOT NULL,
  meditation_p1       TEXT,
  meditation_p2       TEXT,
  meditation_p3       TEXT,
  reflection_question TEXT,
  prayer              TEXT,
  declaration         TEXT,
  author              TEXT DEFAULT 'Pasteur CCB',
  content             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Le code admin lit `date` (alias) ET fait des INSERTs avec `devotion_date` :
-- on s'assure que les deux colonnes existent / le code utilisera la table directement.
ALTER TABLE public.devotions
  ADD COLUMN IF NOT EXISTS content TEXT;

-- Le code lit la colonne `date` comme alias de devotion_date
-- → on crée une colonne 'date' générée si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'devotions' AND column_name = 'date'
  ) THEN
    BEGIN
      EXECUTE 'ALTER TABLE public.devotions ADD COLUMN date DATE GENERATED ALWAYS AS (devotion_date) STORED';
    EXCEPTION WHEN others THEN
      -- Si la génération échoue, ajoute juste la colonne (le code utilisera coalesce côté JS)
      EXECUTE 'ALTER TABLE public.devotions ADD COLUMN IF NOT EXISTS date DATE';
      EXECUTE 'UPDATE public.devotions SET date = devotion_date WHERE date IS NULL';
    END;
  END IF;
END $$;

-- RLS : lecture publique des devotions publiées
ALTER TABLE public.devotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS devotions_public_read ON public.devotions;
DROP POLICY IF EXISTS devotions_admin_write ON public.devotions;
CREATE POLICY devotions_public_read ON public.devotions FOR SELECT USING (true);
CREATE POLICY devotions_admin_write ON public.devotions FOR ALL USING (public.is_moderator_or_above());

-- =====================================================================
-- FIN
-- =====================================================================
