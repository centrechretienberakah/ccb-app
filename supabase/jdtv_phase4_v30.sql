-- =====================================================================
-- CCB JESUS DAILY TV PHASE 4 v30 — heartbeat + skip intro + auto-next
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- ─── Colonnes optionnelles sur les vidéos ────────────────────────────
ALTER TABLE public.jdtv_videos
  ADD COLUMN IF NOT EXISTS intro_end_secs   INT,
  ADD COLUMN IF NOT EXISTS outro_start_secs INT,
  ADD COLUMN IF NOT EXISTS next_video_id    UUID REFERENCES public.jdtv_videos(id) ON DELETE SET NULL;


-- ─── RPC heartbeat : upsert watched_secs en max, last_seen_at = now ──
-- On utilise GREATEST pour ne jamais revenir en arrière.
CREATE OR REPLACE FUNCTION public.jdtv_heartbeat(
  p_video_id UUID,
  p_watched_secs INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_duration INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN; END IF;

  SELECT duration_secs INTO v_duration FROM public.jdtv_videos WHERE id = p_video_id;

  INSERT INTO public.jdtv_user_watch_progress (user_id, video_id, watched_secs, is_completed, last_seen_at)
  VALUES (
    v_user_id, p_video_id,
    p_watched_secs,
    COALESCE(v_duration IS NOT NULL AND p_watched_secs >= v_duration * 0.9, false),
    NOW()
  )
  ON CONFLICT (user_id, video_id) DO UPDATE
  SET watched_secs = GREATEST(public.jdtv_user_watch_progress.watched_secs, EXCLUDED.watched_secs),
      last_seen_at = NOW(),
      is_completed = (
        v_duration IS NOT NULL AND
        GREATEST(public.jdtv_user_watch_progress.watched_secs, EXCLUDED.watched_secs) >= v_duration * 0.9
      ),
      completed_at = CASE
        WHEN v_duration IS NOT NULL
          AND GREATEST(public.jdtv_user_watch_progress.watched_secs, EXCLUDED.watched_secs) >= v_duration * 0.9
          AND public.jdtv_user_watch_progress.completed_at IS NULL
        THEN NOW()
        ELSE public.jdtv_user_watch_progress.completed_at
      END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.jdtv_heartbeat(UUID, INT) TO authenticated;


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Jesus Daily TV Phase 4 v30
-- =====================================================================
