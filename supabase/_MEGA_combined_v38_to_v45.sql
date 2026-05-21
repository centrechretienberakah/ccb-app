-- =====================================================================
-- CCB MEGA COMBINED SQL — v38 → v45
--
-- Concatène en UN SEUL fichier toutes les migrations récentes pour
-- Storage / Groupes / Meet (LiveKit). À coller en une fois dans
-- Supabase SQL Editor.
--
-- Ordre d'exécution (dépendances respectées) :
--   1. storage_posts_policies_v38     (bucket "posts" + policies)
--   2. groups_refonte_phase1_v39      (pin / mute / unread / auto-owner)
--   3. groups_refonte_phase3_v41      (dashboard admin + archive)
--   4. groups_refonte_phase4_v42      (demandes d'accès groupes privés)
--   5. groups_role_check_widen_v45    (autorise 'moderator' dans group_members)
--   6. livekit_phase2_v43             (historique des sessions Meet)
--   7. livekit_phase3_v44             (réunions programmées)
--
-- Tout est idempotent : peut être ré-exécuté sans danger.
-- Aucune donnée n'est supprimée — uniquement des ajouts de colonnes,
-- tables, views, RPCs et policies.
--
-- Pré-requis (déjà en place dans la base CCB) :
--   - tables : groups, group_members, group_messages, user_roles, auth.users
--   - helpers : is_group_member, is_group_admin, is_group_public,
--               is_moderator_or_above
--   - bucket storage existant (sera créé/mis à jour si besoin)
-- =====================================================================


-- =====================================================================
-- ============ 1) STORAGE POSTS POLICIES v38 ==========================
-- =====================================================================
-- CCB STORAGE POLICIES v38 — bucket "posts" (uploads admin + lecture publique)
-- Configure :
--   - Le bucket "posts" comme PUBLIC (lecture anonyme OK)
--   - INSERT/UPDATE/DELETE réservés aux moderator+ (rôle dans user_roles)

-- ─── 1.1) Créer le bucket s'il n'existe pas ──────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'posts',
  'posts',
  true,
  10 * 1024 * 1024,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg',
    'video/mp4', 'video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = GREATEST(EXCLUDED.file_size_limit, COALESCE(storage.buckets.file_size_limit, 0));

-- ─── 1.2) Lecture publique du bucket "posts" ─────────────────────────
DROP POLICY IF EXISTS "posts_public_read" ON storage.objects;
CREATE POLICY "posts_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'posts');

-- ─── 1.3) INSERT : moderator+ uniquement ─────────────────────────────
DROP POLICY IF EXISTS "posts_mod_insert" ON storage.objects;
CREATE POLICY "posts_mod_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'posts'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'leader', 'moderator')
    )
  );

-- ─── 1.4) UPDATE : moderator+ uniquement ─────────────────────────────
DROP POLICY IF EXISTS "posts_mod_update" ON storage.objects;
CREATE POLICY "posts_mod_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'posts'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'leader', 'moderator')
    )
  );

-- ─── 1.5) DELETE : moderator+ uniquement ─────────────────────────────
DROP POLICY IF EXISTS "posts_mod_delete" ON storage.objects;
CREATE POLICY "posts_mod_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'posts'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin', 'leader', 'moderator')
    )
  );


-- =====================================================================
-- ============ 2) GROUPES REFONTE PHASE 1 v39 =========================
-- =====================================================================
-- Aligne le module sur le brief :
--   1) Restriction création aux owner/admin/leader (via is_moderator_or_above)
--   2) Messages épinglés (is_pinned + pinned_at + pinned_by)
--   3) État utilisateur par groupe (last_read_at + muted_until)
--   4) Vue agrégée group_summary
--   5) Trigger auto-membership : créateur devient owner du groupe

-- ─── 2.1) Restriction création : moderator+ uniquement ───────────────
DROP POLICY IF EXISTS groups_insert_auth ON public.groups;
CREATE POLICY groups_insert_auth ON public.groups
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND public.is_moderator_or_above()
  );

-- ─── 2.2) Messages épinglés ──────────────────────────────────────────
ALTER TABLE public.group_messages
  ADD COLUMN IF NOT EXISTS is_pinned   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_group_messages_pinned
  ON public.group_messages(group_id, pinned_at DESC NULLS LAST)
  WHERE is_pinned = true;

DROP POLICY IF EXISTS group_messages_pin_admin ON public.group_messages;
CREATE POLICY group_messages_pin_admin ON public.group_messages
  FOR UPDATE USING (
    public.is_group_admin(group_id, auth.uid())
    OR public.is_moderator_or_above()
  );

-- ─── 2.3) État utilisateur par groupe (last_read + mute) ─────────────
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

-- ─── 2.4) Trigger auto-membership : créateur devient owner ───────────
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

-- ─── 2.5) Vue group_summary : dernière activité + métriques ──────────
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

-- ─── 2.6) RPC : compteur unread par user ─────────────────────────────
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

-- ─── 2.7) RPC : marque les messages d'un groupe comme lus ────────────
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

-- ─── 2.8) RPC : toggle mute d'un groupe (durée en heures) ────────────
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
    v_until := NULL;
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


-- =====================================================================
-- ============ 3) GROUPES REFONTE PHASE 3 v41 =========================
-- =====================================================================
-- Dashboard admin (mod+) :
--   1) Colonne is_archived (soft-archive) sur groups
--   2) RLS : groupes archivés invisibles aux non-admins
--   3) VIEW groups_admin_stats
--   4) VIEW groups_admin_activity_30d
--   5) RPC groups_admin_set_archived

-- ─── 3.1) Colonnes soft-archive ──────────────────────────────────────
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_groups_archived
  ON public.groups(is_archived, created_at DESC) WHERE is_archived = true;

-- ─── 3.2) RLS : masquer archivés aux non-admins ──────────────────────
DROP POLICY IF EXISTS groups_read_visible ON public.groups;
CREATE POLICY groups_read_visible ON public.groups
  FOR SELECT USING (
    (
      is_archived = false
      AND (
        type = 'public'
        OR public.is_group_member(id, auth.uid())
      )
    )
    OR public.is_moderator_or_above()
  );

-- ─── 3.3) VIEW groups_admin_stats ────────────────────────────────────
DROP VIEW IF EXISTS public.groups_admin_stats CASCADE;
CREATE VIEW public.groups_admin_stats AS
SELECT
  g.id,
  g.name,
  g.description,
  g.cover_url,
  g.type,
  g.category,
  g.created_by,
  g.created_at,
  g.is_archived,
  g.archived_at,
  (SELECT COUNT(*) FROM public.group_members gm WHERE gm.group_id = g.id)::INT AS member_count,
  (SELECT COUNT(*) FROM public.group_messages m WHERE m.group_id = g.id)::INT AS total_messages,
  (SELECT COUNT(*) FROM public.group_messages m
     WHERE m.group_id = g.id AND m.created_at >= NOW() - INTERVAL '7 days')::INT AS messages_7d,
  (SELECT COUNT(*) FROM public.group_messages m
     WHERE m.group_id = g.id AND m.created_at >= NOW() - INTERVAL '30 days')::INT AS messages_30d,
  (SELECT MAX(created_at) FROM public.group_messages m WHERE m.group_id = g.id) AS last_activity_at
FROM public.groups g;

GRANT SELECT ON public.groups_admin_stats TO authenticated, service_role;

-- ─── 3.4) VIEW activité globale 30 jours ─────────────────────────────
DROP VIEW IF EXISTS public.groups_admin_activity_30d CASCADE;
CREATE VIEW public.groups_admin_activity_30d AS
WITH days AS (
  SELECT generate_series(
    (NOW() - INTERVAL '29 days')::DATE,
    NOW()::DATE,
    INTERVAL '1 day'
  )::DATE AS day
),
new_groups AS (
  SELECT DATE(created_at) AS day, COUNT(*)::INT AS n_groups
  FROM public.groups
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)
),
msg_per_day AS (
  SELECT DATE(created_at) AS day, COUNT(*)::INT AS n_messages
  FROM public.group_messages
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)
),
new_members AS (
  SELECT DATE(joined_at) AS day, COUNT(*)::INT AS n_members
  FROM public.group_members
  WHERE joined_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(joined_at)
)
SELECT
  d.day,
  COALESCE(ng.n_groups, 0)  AS new_groups,
  COALESCE(mp.n_messages, 0) AS messages,
  COALESCE(nm.n_members, 0) AS new_members
FROM days d
LEFT JOIN new_groups   ng ON ng.day = d.day
LEFT JOIN msg_per_day  mp ON mp.day = d.day
LEFT JOIN new_members  nm ON nm.day = d.day
ORDER BY d.day ASC;

GRANT SELECT ON public.groups_admin_activity_30d TO authenticated, service_role;

-- ─── 3.5) RPC : archive / restore (sécurisé mod+) ────────────────────
CREATE OR REPLACE FUNCTION public.groups_admin_set_archived(
  p_group_id UUID,
  p_archived BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NOT public.is_moderator_or_above() THEN
    RAISE EXCEPTION 'Permission refusée — moderator+ requis';
  END IF;
  UPDATE public.groups
  SET is_archived = p_archived,
      archived_at = CASE WHEN p_archived THEN NOW() ELSE NULL END,
      archived_by = CASE WHEN p_archived THEN auth.uid() ELSE NULL END
  WHERE id = p_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.groups_admin_set_archived(UUID, BOOLEAN) TO authenticated;


-- =====================================================================
-- ============ 4) GROUPES REFONTE PHASE 4 v42 =========================
-- =====================================================================
-- Demandes d'accès aux groupes privés :
--   - Table group_join_requests + RLS
--   - RPCs groups_request_join / approve / reject

-- ─── 4.1) Table demandes d'accès ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_join_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected','cancelled')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at    TIMESTAMPTZ,
  decided_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_gjr_group_status
  ON public.group_join_requests(group_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gjr_user
  ON public.group_join_requests(user_id, created_at DESC);

-- ─── 4.2) RLS ────────────────────────────────────────────────────────
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

-- ─── 4.3) Realtime ──────────────────────────────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.group_join_requests;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

-- ─── 4.4) RPC : créer ou réactiver une demande ──────────────────────
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

  IF public.is_group_member(p_group_id, v_uid) THEN
    RAISE EXCEPTION 'Tu es déjà membre de ce groupe';
  END IF;

  SELECT * INTO v_existing
  FROM public.group_join_requests
  WHERE group_id = p_group_id AND user_id = v_uid
  LIMIT 1;

  IF v_existing.id IS NULL THEN
    INSERT INTO public.group_join_requests (group_id, user_id, message, status)
    VALUES (p_group_id, v_uid, NULLIF(TRIM(COALESCE(p_message, '')), ''), 'pending')
    RETURNING id INTO v_req_id;
  ELSE
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

-- ─── 4.5) RPC : approuver une demande (admin du groupe) ─────────────
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

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_req.group_id, v_req.user_id, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  UPDATE public.group_join_requests
  SET status = 'approved',
      decided_at = NOW(),
      decided_by = v_uid
  WHERE id = p_request_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.groups_approve_request(UUID) TO authenticated;

-- ─── 4.6) RPC : rejeter une demande ─────────────────────────────────
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


-- =====================================================================
-- ============ 5) GROUPES ROLE CHECK WIDEN v45 ========================
-- =====================================================================
-- Élargit le check constraint group_members.role pour accepter 'moderator'
-- (en plus de owner / admin / member) afin de débloquer la promotion
-- modérateur dans l'UI.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'group_members_role_check'
  ) THEN
    ALTER TABLE public.group_members DROP CONSTRAINT group_members_role_check;
  END IF;

  ALTER TABLE public.group_members
    ADD CONSTRAINT group_members_role_check
    CHECK (role IN ('owner','admin','moderator','member'));
END $$;


-- =====================================================================
-- ============ 6) LIVEKIT MEET PHASE 2 v43 ============================
-- =====================================================================
-- Historique des sessions Meet :
--   - Tables meet_sessions + meet_session_participants
--   - 4 RPCs (join / user_leave / end / close_stale)
--   - Vue meet_sessions_with_stats

-- ─── 6.1) Table meet_sessions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meet_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id              UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  room_name             TEXT NOT NULL,
  mode                  TEXT NOT NULL DEFAULT 'video'
                          CHECK (mode IN ('audio','video')),
  started_by            UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at              TIMESTAMPTZ,
  total_seconds         INT,
  participant_count_peak INT NOT NULL DEFAULT 1,
  participant_count_total INT NOT NULL DEFAULT 1,
  recording_url         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meet_sessions_group_started
  ON public.meet_sessions(group_id, started_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meet_sessions_room_active
  ON public.meet_sessions(room_name)
  WHERE ended_at IS NULL;

-- ─── 6.2) Table meet_session_participants ────────────────────────────
CREATE TABLE IF NOT EXISTS public.meet_session_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.meet_sessions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at         TIMESTAMPTZ,
  total_seconds   INT,
  UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meet_session_participants_session
  ON public.meet_session_participants(session_id, joined_at);
CREATE INDEX IF NOT EXISTS idx_meet_session_participants_user
  ON public.meet_session_participants(user_id, joined_at DESC);

-- ─── 6.3) RLS ────────────────────────────────────────────────────────
ALTER TABLE public.meet_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_session_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS meet_sessions_read_members ON public.meet_sessions;
CREATE POLICY meet_sessions_read_members ON public.meet_sessions
  FOR SELECT USING (
    public.is_group_member(group_id, auth.uid())
    OR public.is_group_public(group_id)
    OR public.is_moderator_or_above()
  );

DROP POLICY IF EXISTS meet_session_participants_read ON public.meet_session_participants;
CREATE POLICY meet_session_participants_read ON public.meet_session_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meet_sessions s
      WHERE s.id = meet_session_participants.session_id
        AND (
          public.is_group_member(s.group_id, auth.uid())
          OR public.is_group_public(s.group_id)
          OR public.is_moderator_or_above()
        )
    )
  );

-- ─── 6.4) RPC meet_session_join ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.meet_session_join(
  p_group_id UUID,
  p_mode     TEXT DEFAULT 'video'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_uid          UUID := auth.uid();
  v_session_id   UUID;
  v_room_name    TEXT;
  v_part_count   INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;

  IF NOT (
    public.is_group_member(p_group_id, v_uid)
    OR public.is_group_public(p_group_id)
    OR public.is_moderator_or_above()
  ) THEN
    RAISE EXCEPTION 'Accès refusé à ce groupe';
  END IF;

  v_room_name := 'ccb-group-' || p_group_id::TEXT;

  SELECT id INTO v_session_id
  FROM public.meet_sessions
  WHERE room_name = v_room_name AND ended_at IS NULL
  LIMIT 1;

  IF v_session_id IS NULL THEN
    INSERT INTO public.meet_sessions (group_id, room_name, mode, started_by)
    VALUES (p_group_id, v_room_name,
            CASE WHEN p_mode IN ('audio','video') THEN p_mode ELSE 'video' END,
            v_uid)
    RETURNING id INTO v_session_id;
  END IF;

  INSERT INTO public.meet_session_participants (session_id, user_id, joined_at)
  VALUES (v_session_id, v_uid, NOW())
  ON CONFLICT (session_id, user_id)
    DO UPDATE SET left_at = NULL, joined_at = NOW();

  SELECT COUNT(*) INTO v_part_count
  FROM public.meet_session_participants
  WHERE session_id = v_session_id;

  UPDATE public.meet_sessions
  SET participant_count_peak  = GREATEST(participant_count_peak, v_part_count),
      participant_count_total = (
        SELECT COUNT(DISTINCT user_id)
        FROM public.meet_session_participants
        WHERE session_id = v_session_id
      )
  WHERE id = v_session_id;

  RETURN v_session_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.meet_session_join(UUID, TEXT) TO authenticated;

-- ─── 6.5) RPC meet_session_user_leave ────────────────────────────────
CREATE OR REPLACE FUNCTION public.meet_session_user_leave(
  p_session_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_uid             UUID := auth.uid();
  v_joined_at       TIMESTAMPTZ;
  v_remaining       INT;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  SELECT joined_at INTO v_joined_at
  FROM public.meet_session_participants
  WHERE session_id = p_session_id AND user_id = v_uid AND left_at IS NULL
  LIMIT 1;
  IF v_joined_at IS NULL THEN RETURN; END IF;

  UPDATE public.meet_session_participants
  SET left_at = NOW(),
      total_seconds = COALESCE(total_seconds, 0)
        + EXTRACT(EPOCH FROM (NOW() - v_joined_at))::INT
  WHERE session_id = p_session_id AND user_id = v_uid AND left_at IS NULL;

  SELECT COUNT(*) INTO v_remaining
  FROM public.meet_session_participants
  WHERE session_id = p_session_id AND left_at IS NULL;

  IF v_remaining = 0 THEN
    PERFORM public.meet_session_end(p_session_id);
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.meet_session_user_leave(UUID) TO authenticated;

-- ─── 6.6) RPC meet_session_end ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.meet_session_end(
  p_session_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_started_at TIMESTAMPTZ;
BEGIN
  SELECT started_at INTO v_started_at
  FROM public.meet_sessions
  WHERE id = p_session_id AND ended_at IS NULL;
  IF v_started_at IS NULL THEN RETURN; END IF;

  UPDATE public.meet_session_participants
  SET left_at = NOW(),
      total_seconds = COALESCE(total_seconds, 0)
        + EXTRACT(EPOCH FROM (NOW() - joined_at))::INT
  WHERE session_id = p_session_id AND left_at IS NULL;

  UPDATE public.meet_sessions
  SET ended_at = NOW(),
      total_seconds = EXTRACT(EPOCH FROM (NOW() - v_started_at))::INT
  WHERE id = p_session_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.meet_session_end(UUID) TO authenticated;

-- ─── 6.7) RPC auto-clean sessions orphelines > 6h ────────────────────
CREATE OR REPLACE FUNCTION public.meet_session_close_stale()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.meet_sessions
    WHERE ended_at IS NULL AND started_at < NOW() - INTERVAL '6 hours'
  LOOP
    PERFORM public.meet_session_end(r.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.meet_session_close_stale() TO authenticated, service_role;

-- ─── 6.8) VUE meet_sessions_with_stats ───────────────────────────────
DROP VIEW IF EXISTS public.meet_sessions_with_stats CASCADE;
CREATE VIEW public.meet_sessions_with_stats AS
SELECT
  s.id,
  s.group_id,
  s.room_name,
  s.mode,
  s.started_by,
  s.started_at,
  s.ended_at,
  COALESCE(
    s.total_seconds,
    CASE WHEN s.ended_at IS NULL THEN EXTRACT(EPOCH FROM (NOW() - s.started_at))::INT END
  ) AS total_seconds,
  s.participant_count_peak,
  s.participant_count_total,
  s.recording_url,
  (s.ended_at IS NULL)                              AS is_active,
  COALESCE((
    SELECT COUNT(*) FROM public.meet_session_participants p
    WHERE p.session_id = s.id AND p.left_at IS NULL
  ), 0)::INT                                        AS active_count
FROM public.meet_sessions s;

GRANT SELECT ON public.meet_sessions_with_stats TO authenticated, service_role;


-- =====================================================================
-- ============ 7) LIVEKIT MEET PHASE 3 v44 ============================
-- =====================================================================
-- Réunions programmées :
--   - Table meet_scheduled + RLS
--   - Vue meet_scheduled_with_stats (is_now / is_upcoming / countdown)
--   - 3 RPCs : meet_scheduled_create / cancel / mark_started

-- ─── 7.1) Table meet_scheduled ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meet_scheduled (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title             TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 160),
  description       TEXT,
  mode              TEXT NOT NULL DEFAULT 'video'
                      CHECK (mode IN ('audio','video')),
  scheduled_at      TIMESTAMPTZ NOT NULL,
  duration_minutes  INT NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 5 AND 480),
  created_by        UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'scheduled'
                      CHECK (status IN ('scheduled','started','completed','cancelled')),
  reminder_sent_at  TIMESTAMPTZ,
  started_at        TIMESTAMPTZ,
  session_id        UUID REFERENCES public.meet_sessions(id) ON DELETE SET NULL,
  cancelled_at      TIMESTAMPTZ,
  cancelled_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meet_scheduled_group_at
  ON public.meet_scheduled(group_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_meet_scheduled_upcoming
  ON public.meet_scheduled(scheduled_at)
  WHERE status = 'scheduled';

-- ─── 7.2) RLS ────────────────────────────────────────────────────────
ALTER TABLE public.meet_scheduled ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS meet_scheduled_read ON public.meet_scheduled;
CREATE POLICY meet_scheduled_read ON public.meet_scheduled
  FOR SELECT USING (
    public.is_group_member(group_id, auth.uid())
    OR public.is_group_public(group_id)
    OR public.is_moderator_or_above()
  );

DROP POLICY IF EXISTS meet_scheduled_insert ON public.meet_scheduled;
CREATE POLICY meet_scheduled_insert ON public.meet_scheduled
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND (
      public.is_group_member(group_id, auth.uid())
      OR public.is_moderator_or_above()
    )
  );

DROP POLICY IF EXISTS meet_scheduled_update ON public.meet_scheduled;
CREATE POLICY meet_scheduled_update ON public.meet_scheduled
  FOR UPDATE USING (
    auth.uid() = created_by
    OR public.is_group_admin(group_id, auth.uid())
    OR public.is_moderator_or_above()
  );

DROP POLICY IF EXISTS meet_scheduled_delete ON public.meet_scheduled;
CREATE POLICY meet_scheduled_delete ON public.meet_scheduled
  FOR DELETE USING (
    auth.uid() = created_by
    OR public.is_group_admin(group_id, auth.uid())
    OR public.is_moderator_or_above()
  );

-- ─── 7.3) VUE meet_scheduled_with_stats ──────────────────────────────
DROP VIEW IF EXISTS public.meet_scheduled_with_stats CASCADE;
CREATE VIEW public.meet_scheduled_with_stats AS
SELECT
  s.id, s.group_id, s.title, s.description, s.mode,
  s.scheduled_at, s.duration_minutes,
  s.created_by, s.status, s.session_id,
  s.started_at, s.cancelled_at, s.cancelled_by,
  s.reminder_sent_at, s.created_at,
  (s.status = 'scheduled' AND s.scheduled_at > NOW())              AS is_upcoming,
  (s.status = 'scheduled'
    AND s.scheduled_at <= NOW() + INTERVAL '5 minutes'
    AND s.scheduled_at + (s.duration_minutes || ' minutes')::INTERVAL > NOW()
  )                                                                  AS is_now,
  GREATEST(0, EXTRACT(EPOCH FROM (s.scheduled_at - NOW()))::INT)    AS seconds_until_start
FROM public.meet_scheduled s;

GRANT SELECT ON public.meet_scheduled_with_stats TO authenticated, service_role;

-- ─── 7.4) RPC meet_scheduled_create ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.meet_scheduled_create(
  p_group_id         UUID,
  p_title            TEXT,
  p_description      TEXT DEFAULT NULL,
  p_mode             TEXT DEFAULT 'video',
  p_scheduled_at     TIMESTAMPTZ DEFAULT NULL,
  p_duration_minutes INT DEFAULT 60
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_id  UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF p_scheduled_at IS NULL OR p_scheduled_at < NOW() - INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'Date programmée invalide (doit être dans le futur)';
  END IF;
  IF NOT (
    public.is_group_member(p_group_id, v_uid)
    OR public.is_moderator_or_above()
  ) THEN
    RAISE EXCEPTION 'Tu dois être membre du groupe pour programmer une réunion';
  END IF;

  INSERT INTO public.meet_scheduled (
    group_id, title, description, mode,
    scheduled_at, duration_minutes, created_by
  ) VALUES (
    p_group_id, TRIM(p_title), NULLIF(TRIM(COALESCE(p_description,'')), ''),
    CASE WHEN p_mode IN ('audio','video') THEN p_mode ELSE 'video' END,
    p_scheduled_at, GREATEST(5, LEAST(480, p_duration_minutes)), v_uid
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.meet_scheduled_create(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, INT) TO authenticated;

-- ─── 7.5) RPC meet_scheduled_cancel ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.meet_scheduled_cancel(
  p_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_sched  RECORD;
BEGIN
  SELECT * INTO v_sched FROM public.meet_scheduled WHERE id = p_id;
  IF v_sched.id IS NULL THEN RAISE EXCEPTION 'Réunion introuvable'; END IF;
  IF v_sched.status <> 'scheduled' THEN
    RAISE EXCEPTION 'Cette réunion n''est pas annulable (statut: %)', v_sched.status;
  END IF;
  IF NOT (
    v_sched.created_by = v_uid
    OR public.is_group_admin(v_sched.group_id, v_uid)
    OR public.is_moderator_or_above()
  ) THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  UPDATE public.meet_scheduled
  SET status = 'cancelled',
      cancelled_at = NOW(),
      cancelled_by = v_uid
  WHERE id = p_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.meet_scheduled_cancel(UUID) TO authenticated;

-- ─── 7.6) RPC meet_scheduled_mark_started ────────────────────────────
CREATE OR REPLACE FUNCTION public.meet_scheduled_mark_started(
  p_id         UUID,
  p_session_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  UPDATE public.meet_scheduled
  SET status = 'started',
      started_at = COALESCE(started_at, NOW()),
      session_id = p_session_id
  WHERE id = p_id AND status = 'scheduled';
END;
$$;
GRANT EXECUTE ON FUNCTION public.meet_scheduled_mark_started(UUID, UUID) TO authenticated;


-- =====================================================================
-- RELOAD SCHEMA POSTGREST (1 seule fois en fin de fichier)
-- =====================================================================
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN MEGA COMBINED — v38 → v45
-- Si tu vois ce commentaire dans le résultat sans erreur, tout est OK.
-- =====================================================================
