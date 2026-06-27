-- =====================================================================
-- CCB — INSTITUT BIBLIQUE BERAKAH : nouvelle faculté  v80
--
--   Ajoute la faculté (catégorie) « Mariage, Famille et Relation ».
--   Publiée immédiatement, placée à la fin de la liste (order_index =
--   max actuel + 1). Les cours/leçons s'y ajoutent ensuite via l'admin iBB.
--
--   N'altère AUCUNE donnée existante. Idempotent (rien si le slug existe).
--
-- À exécuter dans Supabase → SQL Editor. Dépend de v24 (institut_categories).
-- =====================================================================

INSERT INTO public.institut_categories (slug, name, description, icon, order_index, is_published)
SELECT
  'mariage-famille-relation',
  'Mariage, Famille et Relation',
  'Bâtir des mariages, des familles et des relations solides et épanouies selon le cœur de Dieu.',
  '💍',
  (SELECT COALESCE(MAX(order_index), 0) + 1 FROM public.institut_categories),
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.institut_categories WHERE slug = 'mariage-famille-relation'
);

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v80 — Faculté « Mariage, Famille et Relation »
-- =====================================================================
