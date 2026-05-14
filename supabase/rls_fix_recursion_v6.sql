-- =====================================================================
-- CCB RLS FIX v6 — Casse la récursion entre groups et group_members
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================
-- Bug v5 : groups_member_read query group_members, dont la RLS query
-- de nouveau groups → infinite recursion → 500 sur SELECT groups.
-- Fix : encapsule le check dans une fonction SECURITY DEFINER qui
-- bypass RLS, ce qui rompt la boucle.
-- =====================================================================

-- ── Helper : est-ce que l'utilisateur courant est membre d'un groupe donné ?
CREATE OR REPLACE FUNCTION public.is_member_of_group(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
     WHERE group_id = p_group_id
       AND user_id = auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_member_of_group(UUID) TO authenticated;

-- ── Helper : un groupe donné est-il public ?
CREATE OR REPLACE FUNCTION public.is_group_public(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.groups
     WHERE id = p_group_id
       AND is_private = false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_group_public(UUID) TO authenticated;

-- ── GROUPS : utilise is_member_of_group au lieu d'EXISTS inline
DROP POLICY IF EXISTS "groups_public_read"  ON public.groups;
DROP POLICY IF EXISTS "groups_member_read"  ON public.groups;
DROP POLICY IF EXISTS "groups_admin_read"   ON public.groups;
DROP POLICY IF EXISTS "groups_admin_write"  ON public.groups;
DROP POLICY IF EXISTS "groups_admin_insert" ON public.groups;
DROP POLICY IF EXISTS "groups_admin_update" ON public.groups;
DROP POLICY IF EXISTS "groups_admin_delete" ON public.groups;

CREATE POLICY "groups_public_read" ON public.groups
  FOR SELECT USING (is_private = false);

CREATE POLICY "groups_member_read" ON public.groups
  FOR SELECT USING (public.is_member_of_group(id));

CREATE POLICY "groups_admin_read" ON public.groups
  FOR SELECT USING (public.is_moderator_or_above());

CREATE POLICY "groups_admin_insert" ON public.groups
  FOR INSERT WITH CHECK (public.is_moderator_or_above());

CREATE POLICY "groups_admin_update" ON public.groups
  FOR UPDATE USING (public.is_moderator_or_above())
  WITH CHECK (public.is_moderator_or_above());

CREATE POLICY "groups_admin_delete" ON public.groups
  FOR DELETE USING (public.is_moderator_or_above());

-- ── GROUP_MEMBERS : utilise is_group_public au lieu d'EXISTS inline
DROP POLICY IF EXISTS "group_members_select"       ON public.group_members;
DROP POLICY IF EXISTS "group_members_admin"        ON public.group_members;
DROP POLICY IF EXISTS "group_members_public_count" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert"       ON public.group_members;
DROP POLICY IF EXISTS "group_members_update"       ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete"       ON public.group_members;

CREATE POLICY "group_members_select" ON public.group_members
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_moderator_or_above()
    OR public.is_group_public(group_id)
  );

CREATE POLICY "group_members_insert" ON public.group_members
  FOR INSERT WITH CHECK (
    public.is_moderator_or_above() OR auth.uid() = user_id
  );

CREATE POLICY "group_members_update" ON public.group_members
  FOR UPDATE USING (public.is_moderator_or_above())
  WITH CHECK (public.is_moderator_or_above());

CREATE POLICY "group_members_delete" ON public.group_members
  FOR DELETE USING (public.is_moderator_or_above() OR auth.uid() = user_id);

-- =====================================================================
-- FIN
-- =====================================================================
