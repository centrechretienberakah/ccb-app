-- =====================================================================
-- CCB MESSAGERIE PRIVÉE — Storage fichiers DM v53
--
-- Autorise les membres d'une conversation à uploader des fichiers dans
-- le bucket "posts" sous le sous-dossier dm/<conversation_id>/.
-- Policies COMPLÉMENTAIRES (en OR avec v38/v47) — rien n'est cassé.
--
-- Path attendu côté client : posts/dm/<conversation_id>/<ts>-<uid>.<ext>
--   → storage.foldername(name)[1] = 'dm'
--   → storage.foldername(name)[2] = '<conversation_id>'
--
-- Pré-requis : helper public.is_conversation_member (créé en v52).
-- Idempotent. À exécuter dans Supabase SQL Editor.
-- =====================================================================

-- INSERT : membre de la conversation
DROP POLICY IF EXISTS "posts_dm_member_insert" ON storage.objects;
CREATE POLICY "posts_dm_member_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'posts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'dm'
    AND public.is_conversation_member(
      ((storage.foldername(name))[2])::uuid,
      auth.uid()
    )
  );

-- UPDATE : propriétaire de l'objet, membre de la conversation
DROP POLICY IF EXISTS "posts_dm_member_update" ON storage.objects;
CREATE POLICY "posts_dm_member_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'posts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'dm'
    AND owner = auth.uid()
    AND public.is_conversation_member(
      ((storage.foldername(name))[2])::uuid,
      auth.uid()
    )
  );

-- DELETE : propriétaire de l'objet
DROP POLICY IF EXISTS "posts_dm_member_delete" ON storage.objects;
CREATE POLICY "posts_dm_member_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'posts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'dm'
    AND owner = auth.uid()
  );

-- Lecture : déjà couverte par "posts_public_read" (bucket public, v38).

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v53 — Storage fichiers messagerie privée
-- =====================================================================
