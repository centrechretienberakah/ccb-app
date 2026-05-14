-- =====================================================================
-- CCB RLS ALIGNMENT v5 — Policies acceptent OWNER + MODERATOR (idempotent)
-- À exécuter dans Supabase SQL Editor
-- =====================================================================
-- Bug : policies inline 'role IN (admin, leader)' refusent owner/moderator.
-- Fix : remplace par appel à public.is_moderator_or_above() qui couvre
-- (owner, admin, moderator, leader). Ajout WITH CHECK pour INSERT explicite.
-- =====================================================================

-- ── PRÉREQUIS : recrée la fonction helper au cas où admin_rbac_v3 pas exécuté
CREATE OR REPLACE FUNCTION public.is_moderator_or_above()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = auth.uid()
       AND role IN ('owner', 'admin', 'moderator', 'leader')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_moderator_or_above() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin_or_above()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = auth.uid()
       AND role IN ('owner', 'admin')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_or_above() TO authenticated;

-- ── GROUPS ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "groups_public_read"  ON public.groups;
DROP POLICY IF EXISTS "groups_member_read"  ON public.groups;
DROP POLICY IF EXISTS "groups_admin_write"  ON public.groups;
DROP POLICY IF EXISTS "groups_admin_read"   ON public.groups;
DROP POLICY IF EXISTS "groups_admin_insert" ON public.groups;
DROP POLICY IF EXISTS "groups_admin_update" ON public.groups;
DROP POLICY IF EXISTS "groups_admin_delete" ON public.groups;

CREATE POLICY "groups_public_read" ON public.groups
  FOR SELECT USING (is_private = false);

CREATE POLICY "groups_member_read" ON public.groups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = groups.id AND user_id = auth.uid())
  );

CREATE POLICY "groups_admin_read" ON public.groups
  FOR SELECT USING (public.is_moderator_or_above());

CREATE POLICY "groups_admin_insert" ON public.groups
  FOR INSERT WITH CHECK (public.is_moderator_or_above());

CREATE POLICY "groups_admin_update" ON public.groups
  FOR UPDATE USING (public.is_moderator_or_above()) WITH CHECK (public.is_moderator_or_above());

CREATE POLICY "groups_admin_delete" ON public.groups
  FOR DELETE USING (public.is_moderator_or_above());

-- ── GROUP_MEMBERS ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "group_members_select"      ON public.group_members;
DROP POLICY IF EXISTS "group_members_admin"       ON public.group_members;
DROP POLICY IF EXISTS "group_members_public_count" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert"      ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete"      ON public.group_members;
DROP POLICY IF EXISTS "group_members_update"      ON public.group_members;

CREATE POLICY "group_members_select" ON public.group_members
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_moderator_or_above()
    OR EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND is_private = false)
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

-- ── MEDIA_LIBRARY ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "media_admin_write" ON public.media_library;
CREATE POLICY "media_admin_write" ON public.media_library
  FOR ALL USING (public.is_moderator_or_above())
  WITH CHECK (public.is_moderator_or_above());

-- ── SERMONS ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "sermons_admin_write" ON public.sermons;
CREATE POLICY "sermons_admin_write" ON public.sermons
  FOR ALL USING (public.is_moderator_or_above())
  WITH CHECK (public.is_moderator_or_above());

-- ── PHOTO_ALBUMS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "albums_admin_write" ON public.photo_albums;
DROP POLICY IF EXISTS "albums_admin_read"  ON public.photo_albums;
CREATE POLICY "albums_admin_write" ON public.photo_albums
  FOR ALL USING (public.is_moderator_or_above())
  WITH CHECK (public.is_moderator_or_above());
CREATE POLICY "albums_admin_read" ON public.photo_albums
  FOR SELECT USING (public.is_moderator_or_above());

-- ── PHOTOS ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "photos_admin_write" ON public.photos;
CREATE POLICY "photos_admin_write" ON public.photos
  FOR ALL USING (public.is_moderator_or_above())
  WITH CHECK (public.is_moderator_or_above());

-- ── COURSES (si la table existe) ─────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='courses') THEN
    EXECUTE 'DROP POLICY IF EXISTS "courses_admin_write" ON public.courses';
    EXECUTE 'CREATE POLICY "courses_admin_write" ON public.courses FOR ALL USING (public.is_moderator_or_above()) WITH CHECK (public.is_moderator_or_above())';
    EXECUTE 'DROP POLICY IF EXISTS "courses_public_read" ON public.courses';
    EXECUTE 'CREATE POLICY "courses_public_read" ON public.courses FOR SELECT USING (is_published = true OR public.is_moderator_or_above())';
  END IF;
END $$;

-- ── EVENTS ───────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='events') THEN
    EXECUTE 'DROP POLICY IF EXISTS "events_admin_write" ON public.events';
    EXECUTE 'CREATE POLICY "events_admin_write" ON public.events FOR ALL USING (public.is_moderator_or_above()) WITH CHECK (public.is_moderator_or_above())';
  END IF;
END $$;

-- ── TESTIMONIES ──────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='testimonies') THEN
    EXECUTE 'DROP POLICY IF EXISTS "testimonies_admin_write" ON public.testimonies';
    EXECUTE 'CREATE POLICY "testimonies_admin_write" ON public.testimonies FOR ALL USING (public.is_moderator_or_above()) WITH CHECK (public.is_moderator_or_above())';
    EXECUTE 'DROP POLICY IF EXISTS "testimonies_public_read" ON public.testimonies';
    EXECUTE 'CREATE POLICY "testimonies_public_read" ON public.testimonies FOR SELECT USING (is_approved = true OR public.is_moderator_or_above())';
  END IF;
END $$;

-- ── DEVOTIONS ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='devotions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "devotions_admin_write" ON public.devotions';
    EXECUTE 'CREATE POLICY "devotions_admin_write" ON public.devotions FOR ALL USING (public.is_moderator_or_above()) WITH CHECK (public.is_moderator_or_above())';
  END IF;
END $$;

-- ── SITE_CONTENT ─────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='site_content') THEN
    EXECUTE 'DROP POLICY IF EXISTS site_content_admin_write ON public.site_content';
    EXECUTE 'CREATE POLICY site_content_admin_write ON public.site_content FOR ALL USING (public.is_moderator_or_above()) WITH CHECK (public.is_moderator_or_above())';
  END IF;
END $$;

-- =====================================================================
-- STORAGE : permettre upload de cover dans bucket 'avatars'
-- =====================================================================
-- Si vous obtenez "row violates policy" sur l'upload, vérifiez ces policies.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='storage' AND table_name='objects') THEN
    EXECUTE 'DROP POLICY IF EXISTS "avatars_admin_insert" ON storage.objects';
    EXECUTE $POL$
      CREATE POLICY "avatars_admin_insert" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'avatars' AND (
          public.is_moderator_or_above()
          OR (storage.foldername(name))[1] = 'group-covers'
          OR auth.uid()::text = (storage.foldername(name))[1]
        ))
    $POL$;

    EXECUTE 'DROP POLICY IF EXISTS "avatars_admin_update" ON storage.objects';
    EXECUTE $POL$
      CREATE POLICY "avatars_admin_update" ON storage.objects
        FOR UPDATE TO authenticated
        USING (bucket_id = 'avatars' AND (
          public.is_moderator_or_above() OR owner = auth.uid()
        ))
    $POL$;

    EXECUTE 'DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects';
    EXECUTE $POL$
      CREATE POLICY "avatars_public_read" ON storage.objects
        FOR SELECT TO public
        USING (bucket_id = 'avatars')
    $POL$;
  END IF;
END $$;

-- =====================================================================
-- FIN
-- =====================================================================
