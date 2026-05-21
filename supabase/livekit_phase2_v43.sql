-- =====================================================================
-- CCB MEET PHASE 2 v43 — Historique des sessions (LiveKit)
--
-- 2 tables :
--   - meet_sessions : 1 ligne par appel/réunion d'un groupe
--   - meet_session_participants : 1 ligne par participant (jointure)
-- 3 RPCs SECURITY DEFINER :
--   - meet_session_join     : trouve/crée une session active + enregistre le participant
--   - meet_session_user_leave : enregistre left_at + total_seconds
--   - meet_session_end      : ferme la session (calcule durée + count)
-- 1 helper auto-clean : meet_session_close_stale (sessions actives > 6h sans participants)
--
-- Idempotent. À exécuter dans Supabase SQL Editor.
-- =====================================================================

-- ─── Table meet_sessions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meet_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id              UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  room_name             TEXT NOT NULL,                          -- ccb-group-<uuid>
  mode                  TEXT NOT NULL DEFAULT 'video'
                          CHECK (mode IN ('audio','video')),
  started_by            UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at              TIMESTAMPTZ,                            -- NULL = encore en cours
  total_seconds         INT,                                    -- rempli au end
  participant_count_peak INT NOT NULL DEFAULT 1,
  participant_count_total INT NOT NULL DEFAULT 1,              -- nb unique de joiners
  recording_url         TEXT,                                   -- futur usage
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meet_sessions_group_started
  ON public.meet_sessions(group_id, started_at DESC);

-- Une seule session ACTIVE par room à la fois
CREATE UNIQUE INDEX IF NOT EXISTS idx_meet_sessions_room_active
  ON public.meet_sessions(room_name)
  WHERE ended_at IS NULL;


-- ─── Table meet_session_participants ────────────────────────────────
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


-- ─── RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.meet_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_session_participants ENABLE ROW LEVEL SECURITY;

-- meet_sessions : lecture par membres du groupe + mod+
DROP POLICY IF EXISTS meet_sessions_read_members ON public.meet_sessions;
CREATE POLICY meet_sessions_read_members ON public.meet_sessions
  FOR SELECT USING (
    public.is_group_member(group_id, auth.uid())
    OR public.is_group_public(group_id)
    OR public.is_moderator_or_above()
  );

-- Insert + update via RPC uniquement (SECURITY DEFINER) → personne en direct

-- meet_session_participants : lecture si on peut voir la session ; insert via RPC
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


-- =====================================================================
-- RPC 1 : meet_session_join
-- Trouve la session active du groupe OU en crée une nouvelle.
-- Upsert ensuite le participant (réutilise l'enregistrement si re-join).
-- Renvoie l'ID de la session.
-- =====================================================================
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

  -- Vérifie accès au groupe
  IF NOT (
    public.is_group_member(p_group_id, v_uid)
    OR public.is_group_public(p_group_id)
    OR public.is_moderator_or_above()
  ) THEN
    RAISE EXCEPTION 'Accès refusé à ce groupe';
  END IF;

  v_room_name := 'ccb-group-' || p_group_id::TEXT;

  -- Session active ?
  SELECT id INTO v_session_id
  FROM public.meet_sessions
  WHERE room_name = v_room_name AND ended_at IS NULL
  LIMIT 1;

  IF v_session_id IS NULL THEN
    -- Crée une nouvelle session
    INSERT INTO public.meet_sessions (group_id, room_name, mode, started_by)
    VALUES (p_group_id, v_room_name,
            CASE WHEN p_mode IN ('audio','video') THEN p_mode ELSE 'video' END,
            v_uid)
    RETURNING id INTO v_session_id;
  END IF;

  -- Upsert participant (réutilise si re-join)
  INSERT INTO public.meet_session_participants (session_id, user_id, joined_at)
  VALUES (v_session_id, v_uid, NOW())
  ON CONFLICT (session_id, user_id)
    DO UPDATE SET left_at = NULL, joined_at = NOW();

  -- Met à jour les compteurs de la session
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


-- =====================================================================
-- RPC 2 : meet_session_user_leave
-- Enregistre left_at + total_seconds. Si plus aucun participant actif,
-- ferme la session entière.
-- =====================================================================
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

  -- Y a-t-il encore quelqu'un dans la session ?
  SELECT COUNT(*) INTO v_remaining
  FROM public.meet_session_participants
  WHERE session_id = p_session_id AND left_at IS NULL;

  IF v_remaining = 0 THEN
    -- Plus personne → ferme la session
    PERFORM public.meet_session_end(p_session_id);
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.meet_session_user_leave(UUID) TO authenticated;


-- =====================================================================
-- RPC 3 : meet_session_end
-- Ferme une session : ended_at + total_seconds calculé
-- =====================================================================
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

  -- Termine les participants encore actifs
  UPDATE public.meet_session_participants
  SET left_at = NOW(),
      total_seconds = COALESCE(total_seconds, 0)
        + EXTRACT(EPOCH FROM (NOW() - joined_at))::INT
  WHERE session_id = p_session_id AND left_at IS NULL;

  -- Ferme la session
  UPDATE public.meet_sessions
  SET ended_at = NOW(),
      total_seconds = EXTRACT(EPOCH FROM (NOW() - v_started_at))::INT
  WHERE id = p_session_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.meet_session_end(UUID) TO authenticated;


-- =====================================================================
-- RPC 4 : auto-clean sessions orphelines > 6h
-- À appeler depuis un cron Supabase (pg_cron) ou Vercel cron
-- =====================================================================
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


-- =====================================================================
-- VUE : meet_sessions_with_stats
-- Joint sessions + participants count pour l'affichage rapide
-- =====================================================================
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


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v43 — Historique des sessions Meet
-- =====================================================================
