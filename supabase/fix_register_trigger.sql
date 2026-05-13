-- ============================================================
-- FIX : "Database error saving new user"
-- Problème : trigger handle_new_user_profile() échoue car
--   1. auth.uid() = NULL au moment du trigger → RLS bloque l'INSERT
--   2. Le trigger utilise 'full_name' mais le form envoie 'display_name'
-- Solution :
--   1. SET row_security = off dans le trigger (SECURITY DEFINER)
--   2. Lire display_name ET full_name depuis raw_user_meta_data
--   3. Ajouter la colonne display_name si elle manque
--   4. Ajouter is_public si elle manque
-- ============================================================

-- 1. Ajouter les colonnes manquantes si nécessaire
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.user_profiles ADD COLUMN display_name TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.user_profiles ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END;
END $$;

-- 2. Recréer la fonction trigger avec :
--    - row_security = off (bypass RLS — sécurisé car SECURITY DEFINER)
--    - support display_name ET full_name
--    - is_public = true par défaut

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name TEXT;
BEGIN
  -- Récupérer display_name ou full_name selon ce qui est fourni
  v_display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Bypass RLS (nécessaire car auth.uid() = NULL au moment du trigger)
  SET LOCAL row_security = off;

  INSERT INTO public.user_profiles (
    user_id,
    display_name,
    full_name,
    avatar_url,
    is_public
  )
  VALUES (
    NEW.id,
    v_display_name,
    v_display_name,
    NEW.raw_user_meta_data->>'avatar_url',
    true
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 3. Recréer le trigger (au cas où)
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_profile();

-- 4. Vérification : afficher la fonction recréée
SELECT
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user_profile'
  AND routine_schema = 'public';

