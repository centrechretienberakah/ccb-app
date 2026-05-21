-- =====================================================================
-- CCB GROUPES — REFONTE PHASE 4 v42
--
-- Demandes d'accès aux groupes privés :
--   1) Table group_join_requests + RLS
--   2) RPC groups_request_join(group_id, message) — user authentifié
--   3) RPC groups_approve_request(request_id) — admin/owner du groupe
--   4) RPC groups_reject_request(request_id) — admin/owner du groupe
--
-- Idempotent. À exécuter dans Supabase SQL Editor.
-- =====================================================================

-- ─── Table demandes d'accès ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_join_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message       TEXT,                                  -- raison/présentation optionnelle
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected','cancelled')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at    TIMESTAMPTZ,
  decided_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (group_id, user_id)   -- 1 seule demande "active" par user+group
);

CREATE INDEX IF NOT EXISTS idx_gjr_group_status
  ON public.group_join_requests(group_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gjr_user
  ON public.group_join_requests(user_id, created_at DESC);


-- ─── RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gjr_read_own_or_admin ON public.group_join_requests;
CREATE POLICY gjr_read_own_or_admin ON public.group_join_requests
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_group_admin(group_id, auth.uid())
    OR public.is_moderator_or_above()
  );

DROP POLICY IF EXISTS gjr_insert_own ON public.group_join_requests;
CREATE POLICY gjr_insert_own ON public.group_join_requests
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND NOT public.is_group_member(group_id, auth.uid())
  );

DROP POLICY IF EXISTS gjr_update_admin_or_own_cancel ON public.group_join_requests;
CREATE POLICY gjr_update_admin_or_own_cancel ON public.group_join_requests
  FOR UPDATE USING (
    public.is_group_admin(group_id, auth.uid())
    OR public.is_moderator_or_above()
    OR (auth.uid() = user_id AND status = 'pending')
  );

DROP POLICY IF EXISTS gjr_delete_admin ON public.group_join_requests;
CREATE POLICY gjr_delete_admin ON public.group_join_requests
  FOR DELETE USING (
    public.is_group_admin(group_id, auth.uid())
    OR public.is_moderator_or_above()
    OR auth.uid() = user_id
  );


-- ─── Realtime ───────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.group_join_requests;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;


-- ─── RPC : créer ou réactiver une demande ───────────────────────────
CREATE OR REPLACE FUNCTION public.groups_request_join(
  p_group_id UUID,
  p_message  TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_existing  RECORD;
  v_req_id    UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Déjà membre ?
  IF public.is_group_member(p_group_id, v_uid) THEN
    RAISE EXCEPTION 'Tu es déjà membre de ce groupe';
  END IF;

  -- Existe-t-il déjà une demande pour ce user/groupe ?
  SELECT * INTO v_existing
  FROM public.group_join_requests
  WHERE group_id = p_group_id AND user_id = v_uid
  LIMIT 1;

  IF v_existing.id IS NULL THEN
    INSERT INTO public.group_join_requests (group_id, user_id, message, status)
    VALUES (p_group_id, v_uid, NULLIF(TRIM(COALESCE(p_message, '')), ''), 'pending')
    RETURNING id INTO v_req_id;
  ELSE
    -- Réactive une demande précédemment rejetée/annulée
    UPDATE public.group_join_requests
    SET status = 'pending',
        message = COALESCE(NULLIF(TRIM(COALESCE(p_message, '')), ''), v_existing.message),
        created_at = NOW(),
        decided_at = NULL,
        decided_by = NULL
    WHERE id = v_existing.id
    RETURNING id INTO v_req_id;
  END IF;

  RETURN v_req_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.groups_request_join(UUID, TEXT) TO authenticated;


-- ─── RPC : approuver une demande (admin du groupe) ──────────────────
CREATE OR REPLACE FUNCTION public.groups_approve_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_req    RECORD;
BEGIN
  SELECT * INTO v_req FROM public.group_join_requests WHERE id = p_request_id;
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Demande introuvable';
  END IF;

  IF NOT (public.is_group_admin(v_req.group_id, v_uid)
          OR public.is_moderator_or_above()) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  -- Ajoute le membre (idempotent)
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_req.group_id, v_req.user_id, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  -- Marque la demande approuvée
  UPDATE public.group_join_requests
  SET status = 'approved',
      decided_at = NOW(),
      decided_by = v_uid
  WHERE id = p_request_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.groups_approve_request(UUID) TO authenticated;


-- ─── RPC : rejeter une demande ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.groups_reject_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_req  RECORD;
BEGIN
  SELECT * INTO v_req FROM public.group_join_requests WHERE id = p_request_id;
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Demande introuvable';
  END IF;

  IF NOT (public.is_group_admin(v_req.group_id, v_uid)
          OR public.is_moderator_or_above()) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  UPDATE public.group_join_requests
  SET status = 'rejected',
      decided_at = NOW(),
      decided_by = v_uid
  WHERE id = p_request_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.groups_reject_request(UUID) TO authenticated;


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v42 — Demandes d'accès aux groupes privés
-- =====================================================================
