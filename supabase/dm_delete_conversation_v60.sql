-- =====================================================================
-- CCB — Suppression DÉFINITIVE d'une conversation v60
--
-- Remplace le « masquage » (deleted_at, v59) par une vraie suppression :
--   • DM (type 'dm' ou autre) : suppression DÉFINITIVE de la conversation.
--     Grâce aux FK ON DELETE CASCADE, cela efface aussi automatiquement :
--       - dm_messages         (-> dm_message_reactions)
--       - dm_calls
--       - conversation_members
--     => en rouvrant une discussion avec la personne, get_or_create_dm
--        crée une conversation NEUVE (plus d'ancien contenu qui revient).
--   • Mini-groupe (type 'group') : on QUITTE simplement (les autres membres
--     conservent le groupe) — on ne détruit pas le groupe des autres.
--
-- Sécurité : SECURITY DEFINER + vérification d'appartenance (seul un membre
-- de la conversation peut la supprimer). Idempotent.
-- À exécuter dans Supabase SQL Editor.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.dm_delete_conversation(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_type TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Seul un membre de la conversation peut la supprimer
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = p_conversation_id AND user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT type INTO v_type FROM public.conversations WHERE id = p_conversation_id;

  IF v_type = 'group' THEN
    -- Mini-groupe : on quitte uniquement (les autres gardent le groupe)
    DELETE FROM public.conversation_members
      WHERE conversation_id = p_conversation_id AND user_id = v_uid;
  ELSE
    -- DM : suppression DÉFINITIVE (cascade messages/réactions/appels/membres)
    DELETE FROM public.conversations WHERE id = p_conversation_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dm_delete_conversation(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v60 — après exécution, 🗑️ supprime DÉFINITIVEMENT la conversation
-- (DM) ; rouvrir une discussion repart d'une conversation vierge.
-- =====================================================================
