-- =====================================================================
-- HOTFIX : "Database error saving new user" sur signup
-- À exécuter immédiatement dans Supabase SQL Editor
-- =====================================================================
-- Cause : le trigger trg_auto_assign_owner crée par admin_rbac_v3.sql
-- pouvait lever une exception silencieuse (RLS sur owner_emails, etc.)
-- ce qui fait remonter une erreur côté Supabase Auth et bloque l'INSERT
-- dans auth.users.
--
-- Fix : enrober tout en BEGIN/EXCEPTION + bypass RLS via SET LOCAL.
-- Le trigger NE DOIT JAMAIS faire échouer un signup.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.auto_assign_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  is_owner_email BOOLEAN := false;
BEGIN
  -- Toute erreur dans ce trigger doit être avalée pour ne PAS bloquer le signup
  BEGIN
    SET LOCAL row_security = off;
    user_email := COALESCE(NEW.email, '');
    IF user_email <> '' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.owner_emails WHERE LOWER(email) = LOWER(user_email)
      ) INTO is_owner_email;
      IF is_owner_email THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'owner')
        ON CONFLICT (user_id) DO UPDATE SET role = 'owner';
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log silencieux : le signup doit aboutir même si la promotion échoue
    RAISE WARNING 'auto_assign_owner failed for user % : %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Recréer le trigger pour qu'il pointe sur la nouvelle fonction
DROP TRIGGER IF EXISTS trg_auto_assign_owner ON auth.users;
CREATE TRIGGER trg_auto_assign_owner
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_owner();

-- =====================================================================
-- BONUS : sécuriser aussi trg_sync_last_sign_in de la même façon
-- (au cas où il échouerait sur un user_profiles row absent)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.sync_last_sign_in()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
      SET LOCAL row_security = off;
      UPDATE public.user_profiles
         SET last_sign_in_at = NEW.last_sign_in_at
       WHERE user_id = NEW.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_last_sign_in failed for user % : %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- =====================================================================
-- FIN
-- =====================================================================
