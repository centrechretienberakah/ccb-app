-- =====================================================================
-- CCB — Vue Admin du profil membre v55
--
-- Tables + RPCs pour la gestion pastorale/administrative des membres,
-- réservées aux OWNER/ADMIN (is_admin_or_above) — empêche tout
-- moderator/leader d'escalader ses privilèges via admin_set_member_role.
-- N'affecte aucun module existant. Idempotent. À exécuter dans Supabase.
-- =====================================================================

-- ─── 1) Méta admin par membre : statut + niveau de suivi ──────────────
CREATE TABLE IF NOT EXISTS public.member_admin_meta (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','inactive','suspended','banned')),
  follow_level  TEXT NOT NULL DEFAULT 'none'
                  CHECK (follow_level IN ('none','light','regular','priority')),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.member_admin_meta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS member_admin_meta_admin ON public.member_admin_meta;
CREATE POLICY member_admin_meta_admin ON public.member_admin_meta
  FOR ALL USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

-- ─── 2) Notes pastorales privées (invisibles au membre) ───────────────
CREATE TABLE IF NOT EXISTS public.member_pastoral_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pastoral_notes_user ON public.member_pastoral_notes(user_id, created_at DESC);
ALTER TABLE public.member_pastoral_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pastoral_notes_admin ON public.member_pastoral_notes;
CREATE POLICY pastoral_notes_admin ON public.member_pastoral_notes
  FOR ALL USING (public.is_admin_or_above())
  WITH CHECK (public.is_admin_or_above());

-- ─── 3) Journal d'audit des actions admin sur un membre ───────────────
CREATE TABLE IF NOT EXISTS public.member_admin_audit (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  details         JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_member_audit_target ON public.member_admin_audit(target_user_id, created_at DESC);
ALTER TABLE public.member_admin_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS member_audit_admin_read ON public.member_admin_audit;
CREATE POLICY member_audit_admin_read ON public.member_admin_audit
  FOR SELECT USING (public.is_admin_or_above());
-- insert via RPC SECURITY DEFINER uniquement

-- ─── Helper interne : log audit ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.member_admin_log(
  p_target UUID, p_action TEXT, p_details JSONB
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.member_admin_audit (target_user_id, actor_id, action, details)
  VALUES (p_target, auth.uid(), p_action, COALESCE(p_details, '{}'::jsonb));
END;
$$;

-- ─── 4) RPC : changer le rôle (RBAC) d'un membre ──────────────────────
-- N'autorise QUE les rôles RBAC réels de l'app pour ne pas casser les
-- permissions : member, premium_member, moderator, leader, admin, owner.
CREATE OR REPLACE FUNCTION public.admin_set_member_role(p_target UUID, p_role TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old TEXT;
BEGIN
  IF NOT public.is_admin_or_above() THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  IF p_role NOT IN ('member','premium_member','moderator','leader','admin','owner') THEN
    RAISE EXCEPTION 'Rôle invalide';
  END IF;
  SELECT role INTO v_old FROM public.user_roles WHERE user_id = p_target;
  INSERT INTO public.user_roles (user_id, role) VALUES (p_target, p_role)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  PERFORM public.member_admin_log(p_target, 'role_change',
    jsonb_build_object('from', v_old, 'to', p_role));
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_member_role(UUID, TEXT) TO authenticated;

-- ─── 5) RPC : statut du compte ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_set_member_status(p_target UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin_or_above() THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  IF p_status NOT IN ('active','inactive','suspended','banned') THEN RAISE EXCEPTION 'Statut invalide'; END IF;
  INSERT INTO public.member_admin_meta (user_id, status, updated_at, updated_by)
  VALUES (p_target, p_status, NOW(), auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW(), updated_by = auth.uid();
  PERFORM public.member_admin_log(p_target, 'status_change', jsonb_build_object('status', p_status));
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_member_status(UUID, TEXT) TO authenticated;

-- ─── 6) RPC : niveau de suivi pastoral ────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_set_follow_level(p_target UUID, p_level TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin_or_above() THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  IF p_level NOT IN ('none','light','regular','priority') THEN RAISE EXCEPTION 'Niveau invalide'; END IF;
  INSERT INTO public.member_admin_meta (user_id, follow_level, updated_at, updated_by)
  VALUES (p_target, p_level, NOW(), auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET follow_level = EXCLUDED.follow_level, updated_at = NOW(), updated_by = auth.uid();
  PERFORM public.member_admin_log(p_target, 'follow_level', jsonb_build_object('level', p_level));
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_follow_level(UUID, TEXT) TO authenticated;

-- ─── 7) RPC : ajouter une note pastorale ──────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_add_pastoral_note(p_target UUID, p_content TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT public.is_admin_or_above() THEN RAISE EXCEPTION 'Permission refusée'; END IF;
  INSERT INTO public.member_pastoral_notes (user_id, author_id, content)
  VALUES (p_target, auth.uid(), TRIM(p_content))
  RETURNING id INTO v_id;
  PERFORM public.member_admin_log(p_target, 'note_add', '{}'::jsonb);
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_add_pastoral_note(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v55 — Vue admin du profil membre
-- =====================================================================
