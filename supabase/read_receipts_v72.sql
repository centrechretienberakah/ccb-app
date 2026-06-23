-- =====================================================================
-- CCB — Reçus de lecture de la méditation v72
--
-- `devotion_progress` est en RLS « ligne propre » (chacun ne lit que sa
-- propre lecture). Pour afficher « lu par X personnes » avec les noms, on
-- expose une fonction SECURITY DEFINER qui renvoie la liste des lecteurs
-- d'une méditation (toute personne authentifiée peut la voir).
--
-- Idempotent. À exécuter dans Supabase → SQL Editor.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.devotion_readers(p_devotion_id UUID)
RETURNS TABLE (user_id UUID, display_name TEXT, avatar_url TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dp.user_id, up.display_name, up.avatar_url
    FROM public.devotion_progress dp
    JOIN public.user_profiles up ON up.user_id = dp.user_id
   WHERE dp.devotion_id = p_devotion_id
   ORDER BY dp.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.devotion_readers(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v72
-- =====================================================================
