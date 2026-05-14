-- =====================================================================
-- CCB SCHEMA FIXES v4 — alignement complet user_profiles + tables
-- À exécuter dans Supabase SQL Editor (idempotent, sûr à relancer)
-- =====================================================================
-- En prod, certains projets ont une user_profiles minimale ; cette
-- migration ajoute toutes les colonnes attendues par l'app, en silence
-- si elles existent déjà.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. user_profiles : ajout de toutes les colonnes attendues
-- ---------------------------------------------------------------------

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS display_name     TEXT,
  ADD COLUMN IF NOT EXISTS full_name        TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url       TEXT,
  ADD COLUMN IF NOT EXISTS phone            TEXT,
  ADD COLUMN IF NOT EXISTS city             TEXT,
  ADD COLUMN IF NOT EXISTS country          TEXT DEFAULT 'Cameroun',
  ADD COLUMN IF NOT EXISTS bio              TEXT,
  ADD COLUMN IF NOT EXISTS cell_group       TEXT,
  ADD COLUMN IF NOT EXISTS spiritual_level  TEXT DEFAULT 'Nouveau croyant',
  ADD COLUMN IF NOT EXISTS is_premium       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_public        BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_disabled      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_sign_in_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill : display_name depuis (display_name | full_name | email username | 'Membre')
UPDATE public.user_profiles up
   SET display_name = COALESCE(
     NULLIF(up.display_name, ''),
     NULLIF(up.full_name, ''),
     NULLIF(SPLIT_PART(u.email, '@', 1), ''),
     'Membre'
   )
  FROM auth.users u
 WHERE up.user_id = u.id
   AND (up.display_name IS NULL OR up.display_name = '');

-- ---------------------------------------------------------------------
-- 2. prayer_requests : colonnes manquantes
-- ---------------------------------------------------------------------

ALTER TABLE public.prayer_requests
  ADD COLUMN IF NOT EXISTS title         TEXT,
  ADD COLUMN IF NOT EXISTS category      TEXT DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS prayer_count  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS testimony     TEXT,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill : titre par défaut depuis content
UPDATE public.prayer_requests
   SET title = COALESCE(
     NULLIF(SUBSTRING(content FROM 1 FOR 60), ''),
     'Sujet de prière'
   )
 WHERE title IS NULL OR title = '';

-- ---------------------------------------------------------------------
-- 3. devotions : aligner avec ce que le code attend
-- ---------------------------------------------------------------------

-- Renomme daily_devotions → devotions si nécessaire
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

-- Crée devotions si absente
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

-- Ajoute la colonne content si manquante (legacy)
ALTER TABLE public.devotions
  ADD COLUMN IF NOT EXISTS content TEXT;

-- Colonne 'date' (alias de devotion_date, lue par certains endroits du code)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'devotions' AND column_name = 'date'
  ) THEN
    BEGIN
      EXECUTE 'ALTER TABLE public.devotions ADD COLUMN date DATE GENERATED ALWAYS AS (devotion_date) STORED';
    EXCEPTION WHEN others THEN
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

-- Ne crée la policy write QUE si la fonction existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_moderator_or_above' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'CREATE POLICY devotions_admin_write ON public.devotions FOR ALL USING (public.is_moderator_or_above())';
  END IF;
END $$;

-- =====================================================================
-- FIN
-- =====================================================================
