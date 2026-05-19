-- =====================================================================
-- CCB FIX v21 — colonnes manquantes sur groups + group_members
-- Erreur : Could not find the 'category' column of 'groups' in the schema cache
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- La table groups existait déjà (backend_complet.sql), ALTER pour s'assurer
-- que toutes les colonnes attendues par le code sont présentes.

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'public';

-- Si la colonne type existe sans check, on l'ajoute (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'groups_type_check'
  ) THEN
    ALTER TABLE public.groups
      ADD CONSTRAINT groups_type_check CHECK (type IN ('public','private'));
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- name check (au cas où il n'y soit pas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'groups_name_check'
  ) THEN
    ALTER TABLE public.groups
      ADD CONSTRAINT groups_name_check CHECK (char_length(name) BETWEEN 2 AND 80);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- group_members : rôle check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'group_members_role_check'
  ) THEN
    ALTER TABLE public.group_members
      ADD CONSTRAINT group_members_role_check CHECK (role IN ('owner','admin','member'));
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Reload PostgREST cache pour les nouvelles colonnes
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v21
-- =====================================================================
