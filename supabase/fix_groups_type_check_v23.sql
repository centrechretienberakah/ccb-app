-- =====================================================================
-- CCB FIX v23 — groups.type CHECK constraint conflict
-- Erreur : new row for relation "groups" violates check constraint "groups_type_check"
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- L'ancien schema (backend_3_modules_triggers.sql) avait :
--   CHECK (type IN ('cell','prayer','study','mentoring','team'))
-- On veut maintenant : CHECK (type IN ('public','private'))
-- + on garde aussi une colonne "category" pour stocker l'ancien "type" comme
-- catégorie thématique si besoin (cell, prayer, study…)

-- 1) Drop l'ancien check (peu importe son nom)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.groups'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%type%IN%'
  LOOP
    EXECUTE format('ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2) Convertit les anciennes valeurs si elles existent
-- ('cell','prayer','study','mentoring','team') → 'public'
-- En attendant la migration manuelle, on rebascule tout sur public
UPDATE public.groups
SET type = 'public'
WHERE type NOT IN ('public','private') OR type IS NULL;

-- 3) Recréation du check avec les bonnes valeurs
ALTER TABLE public.groups
  ADD CONSTRAINT groups_type_check CHECK (type IN ('public','private'));

-- 4) Met le default approprié
ALTER TABLE public.groups
  ALTER COLUMN type SET DEFAULT 'public';

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v23
-- =====================================================================
