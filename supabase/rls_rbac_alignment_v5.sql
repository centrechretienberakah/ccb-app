-- =====================================================================
-- CCB RLS ALIGNMENT v5 — Toutes les policies admin acceptent OWNER + MODERATOR
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================
-- Bug : les policies inline 'role IN (admin, leader)' n'incluent pas
-- les nouveaux rôles owner/moderator. Résultat : le OWNER ne voit pas
-- les groupes privés / médias premium / etc. qu'il vient de créer.
--
-- Fix : on remplace toutes les policies inline par des appels aux fonctions
-- public.is_admin_or_above() / public.is_moderator_or_above() définies
-- dans admin_rbac_v3.sql, qui couvrent (owner, admin, moderator, leader).
-- =====================================================================

-- ── GROUPS ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "groups_public_read"  ON public.groups;
DROP POLICY IF EXISTS "groups_member_read"  ON public.groups;
DROP POLICY IF EXISTS "groups_admin_write"  ON public.groups;
DROP POLICY IF EXISTS "groups_admin_read"   ON public.groups;

-- Lecture publique des groupes publics
CREATE POLICY "groups_public_read" ON public.groups
  FOR SELECT USING (is_private = false);

-- Lecture des groupes privés par les membres
CREATE POLICY "groups_member_read" ON public.groups
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = groups.id AND user_id = auth.uid())
  );

-- Lecture totale (privés inclus) par admin/owner/moderator
CREATE POLICY "groups_admin_read" ON public.groups
  FOR SELECT USING (public.is_moderator_or_above());

-- Écriture par admin/owner/moderator
CREATE POLICY "groups_admin_write" ON public.groups
  FOR ALL USING (public.is_moderator_or_above());

-- ── GROUP_MEMBERS ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "group_members_select" ON public.group_members;
DROP POLICY IF EXISTS "group_members_admin"  ON public.group_members;
DROP POLICY IF EXISTS "group_members_public_count" ON public.group_members;

-- Lecture : un user voit ses propres adhésions, et les admins voient tout
CREATE POLICY "group_members_select" ON public.group_members
  FOR SELECT USING (auth.uid() = user_id OR public.is_moderator_or_above());

-- Permet de compter les membres pour affichage public (sans révéler les identités)
CREATE POLICY "group_members_public_count" ON public.group_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND is_private = false)
  );

-- Insertion/modification par les admins ou par l'utilisateur pour lui-même
CREATE POLICY "group_members_admin" ON public.group_members
  FOR ALL USING (public.is_moderator_or_above() OR auth.uid() = user_id);

-- ── MEDIA_LIBRARY ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "media_admin_write" ON public.media_library;
CREATE POLICY "media_admin_write" ON public.media_library
  FOR ALL USING (public.is_moderator_or_above());

-- ── SERMONS ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "sermons_admin_write" ON public.sermons;
CREATE POLICY "sermons_admin_write" ON public.sermons
  FOR ALL USING (public.is_moderator_or_above());

-- ── PHOTO_ALBUMS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "albums_admin_write" ON public.photo_albums;
CREATE POLICY "albums_admin_write" ON public.photo_albums
  FOR ALL USING (public.is_moderator_or_above());

-- Owner doit pouvoir lire ses albums privés aussi
DROP POLICY IF EXISTS "albums_admin_read" ON public.photo_albums;
CREATE POLICY "albums_admin_read" ON public.photo_albums
  FOR SELECT USING (public.is_moderator_or_above());

-- ── PHOTOS ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "photos_admin_write" ON public.photos;
CREATE POLICY "photos_admin_write" ON public.photos
  FOR ALL USING (public.is_moderator_or_above());

-- ── COURSES (si la table existe) ─────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='courses') THEN
    EXECUTE 'DROP POLICY IF EXISTS "courses_admin_write" ON public.courses';
    EXECUTE 'CREATE POLICY "courses_admin_write" ON public.courses FOR ALL USING (public.is_moderator_or_above())';
    EXECUTE 'DROP POLICY IF EXISTS "courses_public_read" ON public.courses';
    EXECUTE 'CREATE POLICY "courses_public_read" ON public.courses FOR SELECT USING (is_published = true OR public.is_moderator_or_above())';
  END IF;
END $$;

-- ── EVENTS ───────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='events') THEN
    EXECUTE 'DROP POLICY IF EXISTS "events_admin_write" ON public.events';
    EXECUTE 'CREATE POLICY "events_admin_write" ON public.events FOR ALL USING (public.is_moderator_or_above())';
  END IF;
END $$;

-- ── TESTIMONIES ──────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='testimonies') THEN
    EXECUTE 'DROP POLICY IF EXISTS "testimonies_admin_write" ON public.testimonies';
    EXECUTE 'CREATE POLICY "testimonies_admin_write" ON public.testimonies FOR ALL USING (public.is_moderator_or_above())';
    EXECUTE 'DROP POLICY IF EXISTS "testimonies_public_read" ON public.testimonies';
    EXECUTE 'CREATE POLICY "testimonies_public_read" ON public.testimonies FOR SELECT USING (is_approved = true OR public.is_moderator_or_above())';
  END IF;
END $$;

-- ── DEVOTIONS ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='devotions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "devotions_admin_write" ON public.devotions';
    EXECUTE 'CREATE POLICY "devotions_admin_write" ON public.devotions FOR ALL USING (public.is_moderator_or_above())';
  END IF;
END $$;

-- =====================================================================
-- FIN
-- =====================================================================
