-- =====================================================================
-- CCB MEET — Nettoyage sessions zombies v49
--
-- Contexte : des sessions Meet sont restées "actives" (ended_at IS NULL)
-- pendant plus d'une semaine alors qu'il n'y a personne dedans. Cause :
-- le webhook LiveKit n'a pas fermé la session quand tous sont partis,
-- ET le close_stale RPC tournait sur une fenêtre de 6h sans cron Supabase.
--
-- Cette migration fait deux choses :
--   1) NETTOYAGE IMMÉDIAT : ferme toutes les sessions sans participants
--      actifs OU démarrées il y a > 1 heure (one-shot)
--   2) HARDENING : meet_session_close_stale passe à 1h (vs 6h) ET ferme
--      aussi les sessions à 0 participants actifs (pas que les vieilles)
--
-- Idempotent. À exécuter dans Supabase SQL Editor.
-- =====================================================================

-- ─── 1) NETTOYAGE IMMÉDIAT ──────────────────────────────────────────

-- 1a) Marque tous les participants restés "actifs" depuis > 1h comme partis
UPDATE public.meet_session_participants
SET left_at = NOW(),
    total_seconds = EXTRACT(EPOCH FROM (NOW() - joined_at))::INT
WHERE left_at IS NULL
  AND joined_at < NOW() - INTERVAL '1 hour';

-- 1b) Ferme toutes les sessions sans participants actifs
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT s.id FROM public.meet_sessions s
    LEFT JOIN public.meet_session_participants p
      ON p.session_id = s.id AND p.left_at IS NULL
    WHERE s.ended_at IS NULL
    GROUP BY s.id
    HAVING COUNT(p.id) = 0
  LOOP
    PERFORM public.meet_session_end(r.id);
  END LOOP;
END $$;

-- 1c) Ferme toutes les sessions démarrées il y a > 1 heure (de toute façon)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.meet_sessions
    WHERE ended_at IS NULL
      AND started_at < NOW() - INTERVAL '1 hour'
  LOOP
    PERFORM public.meet_session_end(r.id);
  END LOOP;
END $$;


-- ─── 2) HARDENING : close_stale plus agressif ─────────────────────────
CREATE OR REPLACE FUNCTION public.meet_session_close_stale()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_count INT := 0;
  r RECORD;
BEGIN
  -- A) Sessions sans participants actifs → fermées immédiatement
  FOR r IN
    SELECT s.id FROM public.meet_sessions s
    LEFT JOIN public.meet_session_participants p
      ON p.session_id = s.id AND p.left_at IS NULL
    WHERE s.ended_at IS NULL
    GROUP BY s.id
    HAVING COUNT(p.id) = 0
  LOOP
    PERFORM public.meet_session_end(r.id);
    v_count := v_count + 1;
  END LOOP;

  -- B) Sessions démarrées > 1h (timeout sécurité, vs 6h avant)
  FOR r IN
    SELECT id FROM public.meet_sessions
    WHERE ended_at IS NULL
      AND started_at < NOW() - INTERVAL '1 hour'
  LOOP
    PERFORM public.meet_session_end(r.id);
    v_count := v_count + 1;
  END LOOP;

  -- C) Participants actifs depuis > 1h mais session pas encore fermée
  --    (cas rare où la session vient d'être créée et personne n'est revenu)
  UPDATE public.meet_session_participants
  SET left_at = NOW(),
      total_seconds = EXTRACT(EPOCH FROM (NOW() - joined_at))::INT
  WHERE left_at IS NULL
    AND joined_at < NOW() - INTERVAL '1 hour';

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.meet_session_close_stale() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v49 — Nettoyage zombies + close_stale 1h
-- =====================================================================
