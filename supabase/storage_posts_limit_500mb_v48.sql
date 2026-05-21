-- =====================================================================
-- CCB STORAGE — Bucket "posts" : passer file_size_limit à 500 Mo v48
--
-- Contexte : la v38 a créé le bucket "posts" avec file_size_limit = 10 Mo.
-- Le client autorise 500 Mo (groupes : sermons, vidéos d'enseignements…)
-- mais le bucket rejetait tout fichier > 10 Mo → "exceeded the size limit".
--
-- Cette migration relève la limite à 500 Mo (524 288 000 octets).
--
-- Idempotent. À exécuter dans Supabase SQL Editor.
-- =====================================================================

UPDATE storage.buckets
SET file_size_limit = 500 * 1024 * 1024
WHERE id = 'posts'
  AND COALESCE(file_size_limit, 0) < 500 * 1024 * 1024;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v48 — Bucket posts : 500 Mo max par fichier
-- =====================================================================
