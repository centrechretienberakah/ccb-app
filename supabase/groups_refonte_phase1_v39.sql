-- =====================================================================
-- CCB GROUPES — REFONTE PHASE 1 v39
--
-- Aligne le module sur le brief :
--   1) Restriction création aux owner/admin/leader (via is_moderator_or_above)
--   2) Messages épinglés (is_pinned + pinned_at + pinned_by)
--   3) État utilisateur par groupe (last_read_at + muted_until) → unread count + mute
--   4) Vue agrégée group_summary (dernier message + member_count) pour la liste
--   5) Trigger auto-membership : créateur devient owner du groupe automatiquement
--
-- Idempotent. À exécuter dans Supabase SQL Editor.
-- =====================================================================

-- ─── 1) Restriction création : moderator+ uniquement ─────────────────
-- Avant : tout utilisateur authentifié pouvait créer un groupe.
-- Après : owner / admin / leader / moderator dans user_roles.
DROP POLICY IF EXISTS groups_insert_auth ON public.groups;
CREATE POLICY groups_insert_auth ON public.groups
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND public.is_moderator_or_above()
  );


-- ─── 2) Messages épinglés ────────────────────────────────────────────
ALTER TABLE public.group_messages
  ADD COLUMN IF NOT EXISTS is_pinned   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_group_messages_pinned
  ON public.group_messages(group_id, pinned_at DESC NULLS LAST)
  WHERE is_pinned = true;

-- Policy : seuls les admins du groupe (ou mod+) peuvent toggle is_pinned.
-- L'UPDATE existant (group_messages_update_own) couvre déjà l'édition de
-- son propre message ; on en ajoute une dédiée pour le pin par admin.
DROP POLICY IF EXISTS group_messages_pin_admin ON public.group_messages;
CREATE POLICY group_messages_pin_admin ON public.group_messages
  FOR UPDATE USING (
    public.is_group_admin(group_id, auth.uid())
    OR public.is_moderator_or_above()
  );


-- ─── 3) État utilisateur par groupe (last_read + mute) ───────────────
CREATE TABLE IF NOT EXISTS public.group_user_state (
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id       UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  last_read_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  muted_until    TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_group_user_state_user ON public.group_user_state(user_id);
CREATE INDEX IF NOT EXISTS idx_group_user_state_group ON public.group_user_state(group_id);

ALTER TABLE public.group_user_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS group_user_state_read_own ON public.group_user_state;
CREATE POLICY group_user_state_read_own ON public.group_user_state
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS group_user_state_upsert_own ON public.group_user_state;
CREATE POLICY group_user_state_upsert_own ON public.group_user_state
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.is_group_member(group_id, auth.uid())
  );

DROP POLICY IF EXISTS group_user_state_update_own ON public.group_user_state;
CREATE POLICY group_user_state_update_own ON public.group_user_state
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS group_user_state_delete_own ON public.group_user_state;
CREATE POLICY group_user_state_delete_own ON public.group_user_state
  FOR DELETE USING (auth.uid() = user_id);


-- ─── 4) Trigger auto-membership : créateur devient owner ─────────────
CREATE OR REPLACE FUNCTION public.groups_auto_owner_membership()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (group_id, user_id) DO UPDATE SET role = 'owner';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_groups_auto_owner ON public.groups;
CREATE TRIGGER trg_groups_auto_owner
  AFTER INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.groups_auto_owner_membership();


-- ─── 5) Vue group_summary : dernière activité + métriques ────────────
-- Fournit, pour chaque groupe :
--   - last_message_content + last_message_at
--   - member_count
--   - has_attachment du dernier msg
-- Le unread_count se calcule côté serveur par jointure avec
-- group_user_state (différent par user).
DROP VIEW IF EXISTS public.group_summary CASCADE;
CREATE VIEW public.group_summary AS
SELECT
  g.id,
  g.name,
  g.description,
  g.cover_url,
  g.type,
  g.category,
  g.created_by,
  g.created_at,
  (SELECT COUNT(*) FROM public.group_members gm WHERE gm.group_id = g.id)::INT AS member_count,
  lm.id        AS last_message_id,
  lm.user_id   AS last_message_user_id,
  lm.content   AS last_message_content,
  lm.attachment_type AS last_message_attachment_type,
  lm.created_at AS last_message_at
FROM public.groups g
LEFT JOIN LATERAL (
  SELECT id, user_id, content, attachment_type, created_at
  FROM public.group_messages
  WHERE group_id = g.id
  ORDER BY created_at DESC
  LIMIT 1
) lm ON true;

GRANT SELECT ON public.group_summary TO authenticated, service_role;


-- ─── 6) RPC : compteur unread par user (pour la liste) ───────────────
-- Renvoie une table {group_id, unread_count} pour le user appelant.
CREATE OR REPLACE FUNCTION public.groups_my_unread_counts()
RETURNS TABLE(group_id UUID, unread_count INT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    m.group_id,
    COUNT(*)::INT AS unread_count
  FROM public.group_messages m
  JOIN public.group_members mb
    ON mb.group_id = m.group_id AND mb.user_id = auth.uid()
  LEFT JOIN public.group_user_state s
    ON s.group_id = m.group_id AND s.user_id = auth.uid()
  WHERE m.created_at > COALESCE(s.last_read_at, mb.joined_at)
    AND m.user_id <> auth.uid()
  GROUP BY m.group_id;
$$;

GRANT EXECUTE ON FUNCTION public.groups_my_unread_counts() TO authenticated;


-- ─── 7) RPC : marque tous les messages d'un groupe comme lus ─────────
CREATE OR REPLACE FUNCTION public.groups_mark_read(p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  INSERT INTO public.group_user_state (user_id, group_id, last_read_at)
  VALUES (v_uid, p_group_id, NOW())
  ON CONFLICT (user_id, group_id)
    DO UPDATE SET last_read_at = NOW(), updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.groups_mark_read(UUID) TO authenticated;


-- ─── 8) RPC : toggle mute d'un groupe (durée en heures) ──────────────
CREATE OR REPLACE FUNCTION public.groups_set_mute(p_group_id UUID, p_hours INT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_until TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  IF p_hours IS NULL OR p_hours <= 0 THEN
    v_until := NULL;   -- unmute
  ELSE
    v_until := NOW() + (p_hours || ' hours')::INTERVAL;
  END IF;
  INSERT INTO public.group_user_state (user_id, group_id, muted_until)
  VALUES (v_uid, p_group_id, v_until)
  ON CONFLICT (user_id, group_id)
    DO UPDATE SET muted_until = v_until, updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.groups_set_mute(UUID, INT) TO authenticated;


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v39 — Refonte Groupes Phase 1
-- =====================================================================
