-- =====================================================================
-- CCB MESSAGERIE — Mini-groupes privés v54
--
-- RPCs pour créer une conversation de groupe et y ajouter des membres.
-- Réutilise les tables v52 (conversations / conversation_members).
-- Idempotent. À exécuter dans Supabase SQL Editor.
-- =====================================================================

-- Crée une conversation de groupe avec un titre + une liste de membres.
-- Le créateur devient 'owner'. Renvoie l'id de la conversation.
CREATE OR REPLACE FUNCTION public.create_group_conversation(
  p_title   TEXT,
  p_members UUID[]
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_conv UUID;
  v_member UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;

  INSERT INTO public.conversations (type, title, created_by)
  VALUES ('group', NULLIF(TRIM(COALESCE(p_title, '')), ''), v_uid)
  RETURNING id INTO v_conv;

  -- Créateur = owner
  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  VALUES (v_conv, v_uid, 'owner')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  -- Ajoute les membres fournis (hors créateur)
  IF p_members IS NOT NULL THEN
    FOREACH v_member IN ARRAY p_members LOOP
      IF v_member IS NOT NULL AND v_member <> v_uid THEN
        INSERT INTO public.conversation_members (conversation_id, user_id, role)
        VALUES (v_conv, v_member, 'member')
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN v_conv;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_group_conversation(TEXT, UUID[]) TO authenticated;


-- Ajoute un membre à une conversation existante (réservé à un membre actuel ;
-- en pratique l'owner du groupe). Idempotent.
CREATE OR REPLACE FUNCTION public.add_conversation_member(
  p_conv UUID,
  p_user UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  -- L'appelant doit déjà être membre de la conversation
  IF NOT public.is_conversation_member(p_conv, v_uid) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;
  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  VALUES (p_conv, p_user, 'member')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.add_conversation_member(UUID, UUID) TO authenticated;


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v54 — Mini-groupes privés
-- =====================================================================
