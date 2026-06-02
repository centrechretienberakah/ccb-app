-- =====================================================================
-- CCB MEET — Nuke + heartbeat propre v50
--
-- À exécuter dans Supabase SQL Editor.
--
-- Fait 4 choses :
--   1) DIAGNOSTIC : NOTICE avec le count de sessions zombies AVANT
--   2) NUKE : ferme TOUTES les sessions actives (one-shot)
--   3) AJOUTE colonne last_seen_at à meet_session_participants pour
--      un vrai tracking heartbeat (vs joined_at qui doit rester fixe)
--   4) REFACT VUE : is_active dépend de last_seen_at > NOW() - 90 secondes
--      → un participant qui ne fait plus de heartbeat est considéré
--      inactif → bandeau disparaît
--   5) AJOUTE RPC meet_session_heartbeat (appelée toutes les 30s côté client)
--
-- Idempotent. Cassant pour les sessions VRAIMENT en cours (très rare).
-- =====================================================================

-- ─── 1) DIAGNOSTIC AVANT NUKE ───────────────────────────────────────
DO $$
DECLARE
  v_active_sessions   INT;
  v_active_participants INT;
  v_oldest_session    TIMESTAMPTZ;
BEGIN
  SELECT COUNT(*) INTO v_active_sessions
  FROM public.meet_sessions WHERE ended_at IS NULL;

  SELECT COUNT(*) INTO v_active_participants
  FROM public.meet_session_participants WHERE left_at IS NULL;

  SELECT MIN(started_at) INTO v_oldest_session
  FROM public.meet_sessions WHERE ended_at IS NULL;

  RAISE NOTICE 'AVANT NUKE — Sessions actives : %, Participants actifs : %, Plus vieille session active : %',
    v_active_sessions, v_active_participants, v_oldest_session;
END $$;

-- ─── 2) NUKE TOTAL ──────────────────────────────────────────────────
UPDATE public.meet_session_participants
SET left_at = NOW(),
    total_seconds = COALESCE(total_seconds, EXTRACT(EPOCH FROM (NOW() - joined_at))::INT)
WHERE left_at IS NULL;

UPDATE public.meet_sessions
SET ended_at = NOW(),
    total_seconds = COALESCE(total_seconds, EXTRACT(EPOCH FROM (NOW() - started_at))::INT)
WHERE ended_at IS NULL;

DO $$
DECLARE
  v_active_sessions   INT;
  v_active_participants INT;
BEGIN
  SELECT COUNT(*) INTO v_active_sessions
  FROM public.meet_sessions WHERE ended_at IS NULL;
  SELECT COUNT(*) INTO v_active_participants
  FROM public.meet_session_participants WHERE left_at IS NULL;
  RAISE NOTICE 'APRES NUKE — Sessions actives : %, Participants actifs : %',
    v_active_sessions, v_active_participants;
END $$;

-- ─── 3) AJOUTE colonne last_seen_at ─────────────────────────────────
ALTER TABLE public.meet_session_participants
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Init pour les rows existantes : last_seen_at = joined_at
UPDATE public.meet_session_participants
SET last_seen_at = COALESCE(joined_at, NOW())
WHERE last_seen_at IS NULL;

-- À partir de maintenant, les inserts auront last_seen_at = NOW() par défaut
ALTER TABLE public.meet_session_participants
  ALTER COLUMN last_seen_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_meet_session_participants_last_seen
  ON public.meet_session_participants(session_id, last_seen_at)
  WHERE left_at IS NULL;

-- ─── 4) Met à jour meet_session_join pour set last_seen_at = NOW() ──
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

  -- Upsert participant + reset heartbeat
  INSERT INTO public.meet_session_participants (session_id, user_id, joined_at, last_seen_at)
  VALUES (v_session_id, v_uid, NOW(), NOW())
  ON CONFLICT (session_id, user_id)
    DO UPDATE SET left_at = NULL, joined_at = NOW(), last_seen_at = NOW();

  SELECT COUNT(*) INTO v_part_count
  FROM public.meet_session_participants
  WHERE session_id = v_session_id AND left_at IS NULL;

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

-- ─── 5) RPC meet_session_heartbeat (refresh last_seen_at) ───────────
CREATE OR REPLACE FUNCTION public.meet_session_heartbeat(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  UPDATE public.meet_session_participants
  SET last_seen_at = NOW()
  WHERE session_id = p_session_id
    AND user_id = v_uid
    AND left_at IS NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.meet_session_heartbeat(UUID) TO authenticated;

-- ─── 6) REFONTE VUE — is_active dépend de heartbeat récent ──────────
-- Une session est "active" si :
--   - ended_at IS NULL
--   - ET au moins 1 participant a fait un heartbeat dans les 90 dernières
--     secondes (= participant vraiment présent)
-- Conséquence : tous les zombies (participant qui n'a pas fait heartbeat
-- depuis > 90s) sont automatiquement exclus du bandeau.
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
  (
    s.ended_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.meet_session_participants p
      WHERE p.session_id = s.id
        AND p.left_at IS NULL
        AND COALESCE(p.last_seen_at, p.joined_at) > NOW() - INTERVAL '90 seconds'
    )
  ) AS is_active,
  COALESCE((
    SELECT COUNT(*) FROM public.meet_session_participants p
    WHERE p.session_id = s.id
      AND p.left_at IS NULL
      AND COALESCE(p.last_seen_at, p.joined_at) > NOW() - INTERVAL '90 seconds'
  ), 0)::INT AS active_count
FROM public.meet_sessions s;

GRANT SELECT ON public.meet_sessions_with_stats TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v50 — Heartbeat + vue hardened
--
-- Après exécution :
--   - Toutes les sessions zombies fermées
--   - Une session n'est "active" que si un participant a fait un
--     heartbeat dans les 90 dernières secondes
--   - Le client doit appeler meet_session_heartbeat(session_id) toutes
--     les 30s pendant l'appel (fait dans le commit Next.js suivant)
-- =====================================================================
