-- =====================================================================
-- CCB STORAGE POLICIES v38 — bucket "posts" (uploads admin + lecture publique)
-- À exécuter dans Supabase SQL Editor (idempotent)
--
-- Configure :
--   - Le bucket "posts" comme PUBLIC (lecture anonyme OK)
--   - INSERT/UPDATE/DELETE réservés aux moderator+ (rôle dans user_roles)
--
-- Utilisé par : /institut/admin, /jesus-daily/admin, /dons/admin
-- =====================================================================

-- ─── 1) Créer le bucket s'il n'existe pas ────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'posts',
  'posts',
  true,                                              -- public read
  10 * 1024 * 1024,                                  -- 10 Mo max par fichier
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg',
    'video/mp4', 'video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = GREATEST(EXCLUDED.file_size_limit, COALESCE(storage.buckets.file_size_limit, 0));


-- ─── 2) Lecture publique du bucket "posts" ───────────────────────────
DROP POLICY IF EXISTS "posts_public_read" ON storage.objects;
CREATE POLICY "posts_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'posts');


-- ─── 3) INSERT : moderator+ uniquement ────────────────────────────────
DROP POLICY IF EXISTS "posts_mod_insert" ON storage.objects;
CREATE POLICY "posts_mod_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'posts'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'leader', 'moderator')
    )
  );


-- ─── 4) UPDATE (overwrite, metadata, etc.) : moderator+ uniquement ───
DROP POLICY IF EXISTS "posts_mod_update" ON storage.objects;
CREATE POLICY "posts_mod_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'posts'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'leader', 'moderator')
    )
  );


-- ─── 5) DELETE : moderator+ uniquement ────────────────────────────────
DROP POLICY IF EXISTS "posts_mod_delete" ON storage.objects;
CREATE POLICY "posts_mod_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'posts'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'leader', 'moderator')
    )
  );


-- =====================================================================
-- FIN v38 — policies storage "posts"
-- =====================================================================
