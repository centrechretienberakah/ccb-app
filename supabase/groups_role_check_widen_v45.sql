-- =====================================================================
-- CCB GROUPES — Élargir group_members.role v45
--
-- Contexte : le check constraint actuel n'accepte que owner/admin/member.
-- La brief Groupes mentionne "promouvoir modérateur" comme action.
-- Cette migration ajoute le rôle 'moderator' au check constraint, ce qui
-- débloque toute UI ou RPC qui tenterait de poser role='moderator' sur
-- une ligne group_members.
--
-- Reste exclus : 'leader' (alias historique de 'moderator', pas utilisé
-- dans group_members), 'premium_member' (rôle plateforme, pas groupe).
--
-- Idempotent. À exécuter dans Supabase SQL Editor.
-- =====================================================================

DO $$
BEGIN
  -- Supprime l'ancien check s'il existe
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'group_members_role_check'
  ) THEN
    ALTER TABLE public.group_members DROP CONSTRAINT group_members_role_check;
  END IF;

  -- Recrée avec le set élargi
  ALTER TABLE public.group_members
    ADD CONSTRAINT group_members_role_check
    CHECK (role IN ('owner','admin','moderator','member'));
END $$;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v45
-- =====================================================================
