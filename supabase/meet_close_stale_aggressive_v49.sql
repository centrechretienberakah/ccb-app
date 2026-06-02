-- =====================================================================
-- CCB MEET — Close stale sessions agressif v49
--
-- Problème : des sessions "Appel en cours" restent affichées pendant des
-- jours/semaines parce que :
--   - Le webhook LiveKit n'est peut-être pas configuré côté Cloud
--   - participant_left peut être raté (network blip, restart, etc.)
--   - meet_session_close_stale (v43) attendait 6h avant de cleanup
--
-- Cette migration :
--   1) Ferme IMMÉDIATEMENT toutes les sessions zombies actuelles
--      (active mais 0 participants actifs OU démarrée > 1h)
--   2) Remplace meet_session_close_stale par une version aggressive :
--      ferme dès qu'il y a 0 participants actifs (peu importe l'âge)
--      OU si la session est démarrée depuis > 1h
--   3) Garde le fallback 6h pour les cas pathologiques (participants
--      coincés en "active" car webhook jamais reçu)
--
-- Idempotent.
-- =====================================================================

-- ─── 1) Nettoyage one-shot des sessions zombies actuelles ─────────────
-- Marque ended_at = NOW() pour toutes les sessions où aucun participant
-- n'est actuellement actif (tous ont left_at rempli, OU il n'y a aucun
-- participant tout court).
UPDATE public.meet_sessions s
SET
  ended_at = COALESCE(s.ended_at, NOW()),
  total_seconds = COALESCE(
    s.total_seconds,
    EXTRACT(EPOCH FROM (NOW() - s.started_at))::INT
  )
WHERE s.ended_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.meet_session_participants p
    WHERE p.session_id = s.id AND p.left_at IS NULL
  );

-- Ferme aussi les sessions actives démarrées il y a + d'1h (filet de sécu
-- pour les cas où participants restent coincés "actifs" car le webhook
-- a raté le participant_left)
UPDATE public.meet_sessions s
SET
  ended_at = COALESCE(s.ended_at, NOW()),
  total_seconds = COALESCE(
    s.total_seconds,
    EXTRACT(EPOCH FROM (NOW() - s.started_at))::INT
  )
WHERE s.ended_at IS NULL
  AND s.started_at < NOW() - INTERVAL '1 hour';

-- Marque comme "left" tous les participants encore actifs des sessions
-- qu'on vient de fermer
UPDATE public.meet_session_participants p
SET
  left_at = COALESCE(p.left_at, NOW()),
  total_seconds = COALESCE(
    p.total_seconds,
    EXTRACT(EPOCH FROM (NOW() - p.joined_at))::INT
  )
WHERE p.left_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.meet_sessions s
    WHERE s.id = p.session_id AND s.ended_at IS NOT NULL
  );


-- ─── 2) Nouvelle version aggressive de meet_session_close_stale ───────
-- Strategy : ferme dès qu'il n'y a 0 participants actifs, sans attendre.
-- Plus le fallback 1h pour les sessions où les participants sont coincés.
CREATE OR REPLACE FUNCTION public.meet_session_close_stale()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
BEGIN
  -- Case 1 : sessions actives SANS participants actifs → ferme tout de suite
  FOR r IN
    SELECT s.id FROM public.meet_sessions s
    WHERE s.ended_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.meet_session_participants p
        WHERE p.session_id = s.id AND p.left_at IS NULL
      )
  LOOP
    PERFORM public.meet_session_end(r.id);
    v_count := v_count + 1;
  END LOOP;

  -- Case 2 : sessions actives démarrées il y a + d'1h → cleanup forcé
  -- (les participants "actifs" sont en réalité partis depuis longtemps,
  -- le webhook a raté l'event)
  FOR r IN
    SELECT id FROM public.meet_sessions
    WHERE ended_at IS NULL AND started_at < NOW() - INTERVAL '1 hour'
  LOOP
    PERFORM public.meet_session_end(r.id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Rendre la RPC appelable par tout user authentifié (pour qu'elle soit
-- déclenchée depuis le client polling)
GRANT EXECUTE ON FUNCTION public.meet_session_close_stale() TO authenticated, service_role;


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v49 — Close stale aggressif
-- =====================================================================
