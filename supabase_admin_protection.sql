-- ============================================================
-- Protection admin : groupes de cellule + jalons spirituels
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Fonction is_admin() : vérifie si l'utilisateur courant est admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- 2. Trigger : empêche les non-admins de modifier cell_group sur user_profiles
CREATE OR REPLACE FUNCTION public.protect_cell_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si cell_group change et que l'utilisateur n'est pas admin
  IF NEW.cell_group IS DISTINCT FROM OLD.cell_group THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Seuls les administrateurs peuvent modifier le groupe de cellule.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_cell_group ON public.user_profiles;
CREATE TRIGGER trg_protect_cell_group
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_cell_group();

-- 3. Jalons spirituels : seuls les admins peuvent écrire (INSERT/UPDATE/DELETE)
-- Supprimer les anciennes politiques d'écriture si elles existent
DROP POLICY IF EXISTS milestones_insert_own ON public.spiritual_milestones;
DROP POLICY IF EXISTS milestones_update_own ON public.spiritual_milestones;
DROP POLICY IF EXISTS milestones_delete_own ON public.spiritual_milestones;
DROP POLICY IF EXISTS milestones_all ON public.spiritual_milestones;

-- Politique lecture : chaque utilisateur voit ses propres jalons
DROP POLICY IF EXISTS milestones_select_own ON public.spiritual_milestones;
CREATE POLICY milestones_select_own
  ON public.spiritual_milestones FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- Politique écriture : admins seulement
CREATE POLICY milestones_admin_insert
  ON public.spiritual_milestones FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY milestones_admin_update
  ON public.spiritual_milestones FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY milestones_admin_delete
  ON public.spiritual_milestones FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 4. user_profiles : les admins peuvent mettre à jour n'importe quel profil
DROP POLICY IF EXISTS profiles_update_admin ON public.user_profiles;
CREATE POLICY profiles_update_admin
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
