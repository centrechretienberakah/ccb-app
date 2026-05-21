-- =====================================================================
-- CCB GROUPES — RPC groups_add_member v46
--
-- Contexte : la policy RLS group_members_insert n'autorise qu'un user
-- à se rajouter LUI-MÊME (auth.uid() = user_id). Conséquence : un
-- owner/admin du groupe ne peut pas ajouter d'autres membres directement
-- via `from('group_members').insert(...)` → "row level security policy".
--
-- Cette RPC SECURITY DEFINER bypass RLS proprement après avoir vérifié
-- que l'appelant est bien :
--   - owner / admin du groupe   (is_group_admin)
--   - OU moderator+ plateforme   (is_moderator_or_above)
--
-- Idempotent.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.groups_add_member(
  p_group_id UUID,
  p_user_id  UUID,
  p_role     TEXT DEFAULT 'member'
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Permission : owner/admin du groupe OU mod+ plateforme
  IF NOT (
    public.is_group_admin(p_group_id, v_uid)
    OR public.is_moderator_or_above()
  ) THEN
    RAISE EXCEPTION 'Permission refusée — owner/admin du groupe requis';
  END IF;

  -- Vérifie que le groupe existe
  IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = p_group_id) THEN
    RAISE EXCEPTION 'Groupe introuvable';
  END IF;

  -- Vérifie que l'utilisateur cible existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Utilisateur introuvable';
  END IF;

  -- Limite le rôle aux valeurs autorisées (idem check constraint)
  IF p_role NOT IN ('member','moderator','admin') THEN
    p_role := 'member';
  END IF;

  -- Idempotent : si déjà membre, ne fait rien (pas d'erreur)
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (p_group_id, p_user_id, p_role)
  ON CONFLICT (group_id, user_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.groups_add_member(UUID, UUID, TEXT) TO authenticated;


-- =====================================================================
-- RPC : groups_search_users
-- Recherche d'utilisateurs par display_name (insensible à la casse).
-- Filtre AUTO les users déjà membres du groupe pour proposer uniquement
-- des candidats à ajouter. Limit 20.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.groups_search_users(
  p_group_id UUID,
  p_query    TEXT
) RETURNS TABLE(
  user_id      UUID,
  display_name TEXT,
  avatar_url   TEXT,
  city         TEXT,
  country      TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Permission : owner/admin du groupe OU mod+
  IF NOT (
    public.is_group_admin(p_group_id, v_uid)
    OR public.is_moderator_or_above()
  ) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.display_name, p.avatar_url, p.city, p.country
  FROM public.user_profiles p
  WHERE (
    p_query IS NULL OR LENGTH(TRIM(p_query)) = 0
    OR p.display_name ILIKE '%' || TRIM(p_query) || '%'
    OR p.city ILIKE '%' || TRIM(p_query) || '%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = p.user_id
  )
  ORDER BY
    -- Match exact en premier
    (CASE WHEN p.display_name ILIKE TRIM(p_query) THEN 0 ELSE 1 END),
    p.display_name ASC
  LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.groups_search_users(UUID, TEXT) TO authenticated;


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v46 — Ajout de membres par admins du groupe
-- =====================================================================
