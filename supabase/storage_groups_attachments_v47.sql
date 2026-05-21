-- =====================================================================
-- CCB STORAGE — Membres des groupes peuvent uploader des fichiers v47
--
-- Contexte : la policy v38 "posts_mod_insert" n'autorise QUE
-- owner/admin/leader/moderator à uploader dans le bucket "posts".
-- Conséquence : un membre normal d'un groupe ne peut pas partager
-- une image / audio / PDF / vidéo dans le chat du groupe (le client
-- uploade dans `posts/groups/<group_id>/...`).
--
-- Cette migration ajoute des policies COMPLÉMENTAIRES (pas de remplacement
-- de v38) qui autorisent les membres d'un groupe à uploader, modifier
-- et supprimer leurs fichiers dans le sous-dossier `groups/<group_id>/`.
--
-- Les policies RLS sur storage.objects sont en OR : il suffit qu'une
-- policy autorise pour que l'opération passe. Donc :
--   - les mod+ continuent de pouvoir uploader partout (v38)
--   - les membres d'un groupe peuvent uploader dans leur sous-dossier
--
-- Le path attendu côté client (cf. uploadFile dans GroupDetailClient) :
--   posts/groups/<group_id>/<timestamp>-<user_id>.<ext>
-- → storage.foldername(name)[1] = 'groups'
-- → storage.foldername(name)[2] = '<group_id>'
--
-- Idempotent. À exécuter dans Supabase SQL Editor.
-- =====================================================================

-- ─── INSERT : membre du groupe peut uploader dans posts/groups/<gid>/ ──
DROP POLICY IF EXISTS "posts_group_member_insert" ON storage.objects;
CREATE POLICY "posts_group_member_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'posts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'groups'
    AND public.is_group_member(
      ((storage.foldername(name))[2])::uuid,
      auth.uid()
    )
  );


-- ─── UPDATE : auteur peut éditer son propre fichier dans posts/groups/ ──
DROP POLICY IF EXISTS "posts_group_member_update" ON storage.objects;
CREATE POLICY "posts_group_member_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'posts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'groups'
    AND public.is_group_member(
      ((storage.foldername(name))[2])::uuid,
      auth.uid()
    )
    AND owner = auth.uid()    -- seul le propriétaire de l'objet
  );


-- ─── DELETE : auteur OU admin du groupe peut supprimer ─────────────────
DROP POLICY IF EXISTS "posts_group_member_delete" ON storage.objects;
CREATE POLICY "posts_group_member_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'posts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'groups'
    AND (
      owner = auth.uid()
      OR public.is_group_admin(
        ((storage.foldername(name))[2])::uuid,
        auth.uid()
      )
    )
  );


-- ─── Lecture publique déjà couverte par "posts_public_read" (v38) ──────
-- Pas besoin d'ajouter de policy SELECT : le bucket est public.


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v47 — Uploads membres dans le bucket "posts" sous-dossier groups/
-- =====================================================================
