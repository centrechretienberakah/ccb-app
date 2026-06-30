-- =====================================================================
-- CCB — GROUPES : 30 jours d'historique à l'arrivée d'un membre  v85
--
--   À l'adhésion, un membre doit pouvoir lire l'historique des 30 jours
--   précédant son arrivée (+ tout ce qui est posté depuis qu'il a rejoint).
--   Avant : un membre voyait TOUT l'historique du groupe, même très ancien.
--
--   Nouvelle règle de lecture de group_messages :
--     • modérateur+            → tout (inchangé, gestion)
--     • membre                 → messages depuis (sa date d'adhésion − 30 j)
--                                = 30 j d'historique avant son arrivée + tout
--                                  ce qui suit. Un ancien membre garde donc
--                                  l'accès à tout ce qui date d'après son
--                                  adhésion (aucune régression pour lui).
--     • groupe public (visiteur connecté, non membre) → 30 derniers jours
--       (aperçu) — rejoindre donne ensuite l'accès complet décrit ci-dessus.
--
-- Idempotent. À exécuter dans Supabase → SQL Editor. Dépend de v19
-- (table group_messages, is_group_member, is_group_public).
-- =====================================================================

-- ─── Helper SECURITY DEFINER : date d'adhésion (évite la récursion RLS) ─
CREATE OR REPLACE FUNCTION public.group_joined_at(p_group_id UUID, p_user_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT joined_at
    FROM public.group_members
   WHERE group_id = p_group_id AND user_id = p_user_id
   LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.group_joined_at(UUID, UUID) TO authenticated;

-- ─── Policy de lecture : fenêtre de 30 j à l'arrivée ─────────────────
DROP POLICY IF EXISTS group_messages_read ON public.group_messages;
CREATE POLICY group_messages_read ON public.group_messages
  FOR SELECT USING (
    -- Modérateurs et + : accès total (modération)
    public.is_moderator_or_above()
    -- Membre : depuis 30 j avant son adhésion (→ 30 j d'historique + tout le reste)
    OR (
      public.is_group_member(group_id, auth.uid())
      AND created_at >= (
        COALESCE(public.group_joined_at(group_id, auth.uid()), now()) - INTERVAL '30 days'
      )
    )
    -- Aperçu d'un groupe public (visiteur connecté non membre) : 30 derniers jours
    OR (
      public.is_group_public(group_id)
      AND auth.uid() IS NOT NULL
      AND created_at >= now() - INTERVAL '30 days'
    )
  );

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v85 — 30 jours d'historique à l'adhésion
-- =====================================================================
