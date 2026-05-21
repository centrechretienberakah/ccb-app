-- =====================================================================
-- CCB MEET PHASE 3 v44 — Réunions programmées
--
-- Table meet_scheduled + RLS + 3 RPCs SECURITY DEFINER :
--   - meet_scheduled_create
--   - meet_scheduled_cancel
--   - meet_scheduled_mark_started   (appelé quand un user rejoint)
--
-- Vue meet_scheduled_with_stats avec champs calculés (is_upcoming,
-- is_now, minutes_until_start, etc.) pour l'UI.
--
-- Idempotent. À exécuter dans Supabase SQL Editor.
-- =====================================================================

-- ─── Table meet_scheduled ───────────────────────────────────────────
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


-- ─── RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.meet_scheduled ENABLE ROW LEVEL SECURITY;

-- Lecture : membres du groupe (ou public) + mod+
DROP POLICY IF EXISTS meet_scheduled_read ON public.meet_scheduled;
CREATE POLICY meet_scheduled_read ON public.meet_scheduled
  FOR SELECT USING (
    public.is_group_member(group_id, auth.uid())
    OR public.is_group_public(group_id)
    OR public.is_moderator_or_above()
  );

-- Insert : tout membre OU mod+ peut programmer une réunion dans son groupe
-- (Si tu veux restreindre aux admins du groupe : changer en is_group_admin)
DROP POLICY IF EXISTS meet_scheduled_insert ON public.meet_scheduled;
CREATE POLICY meet_scheduled_insert ON public.meet_scheduled
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND (
      public.is_group_member(group_id, auth.uid())
      OR public.is_moderator_or_above()
    )
  );

-- Update : créateur OU admin du groupe OU mod+ (pour cancel, etc.)
DROP POLICY IF EXISTS meet_scheduled_update ON public.meet_scheduled;
CREATE POLICY meet_scheduled_update ON public.meet_scheduled
  FOR UPDATE USING (
    auth.uid() = created_by
    OR public.is_group_admin(group_id, auth.uid())
    OR public.is_moderator_or_above()
  );

-- Delete : créateur OU admin du groupe OU mod+
DROP POLICY IF EXISTS meet_scheduled_delete ON public.meet_scheduled;
CREATE POLICY meet_scheduled_delete ON public.meet_scheduled
  FOR DELETE USING (
    auth.uid() = created_by
    OR public.is_group_admin(group_id, auth.uid())
    OR public.is_moderator_or_above()
  );


-- =====================================================================
-- VUE meet_scheduled_with_stats
-- =====================================================================
DROP VIEW IF EXISTS public.meet_scheduled_with_stats CASCADE;
CREATE VIEW public.meet_scheduled_with_stats AS
SELECT
  s.id, s.group_id, s.title, s.description, s.mode,
  s.scheduled_at, s.duration_minutes,
  s.created_by, s.status, s.session_id,
  s.started_at, s.cancelled_at, s.cancelled_by,
  s.reminder_sent_at, s.created_at,
  -- Calculé
  (s.status = 'scheduled' AND s.scheduled_at > NOW())              AS is_upcoming,
  (s.status = 'scheduled'
    AND s.scheduled_at <= NOW() + INTERVAL '5 minutes'
    AND s.scheduled_at + (s.duration_minutes || ' minutes')::INTERVAL > NOW()
  )                                                                  AS is_now,
  GREATEST(0, EXTRACT(EPOCH FROM (s.scheduled_at - NOW()))::INT)    AS seconds_until_start
FROM public.meet_scheduled s;

GRANT SELECT ON public.meet_scheduled_with_stats TO authenticated, service_role;


-- =====================================================================
-- RPC : meet_scheduled_create
-- =====================================================================
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


-- =====================================================================
-- RPC : meet_scheduled_cancel
-- =====================================================================
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


-- =====================================================================
-- RPC : meet_scheduled_mark_started
-- Appelé quand un user rejoint depuis une réunion programmée
-- (lie la session live à la réunion programmée)
-- =====================================================================
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


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v44 — Réunions programmées
-- =====================================================================
