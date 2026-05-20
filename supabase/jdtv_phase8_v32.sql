-- =====================================================================
-- CCB JESUS DAILY TV PHASE 8 v32 — chapitres + transcript + notes perso
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- ─── Colonnes additionnelles sur les vidéos ──────────────────────────
-- chapters : JSONB array [{ "time_secs": 0, "title": "Introduction" }, ...]
ALTER TABLE public.jdtv_videos
  ADD COLUMN IF NOT EXISTS chapters      JSONB,
  ADD COLUMN IF NOT EXISTS transcript_md TEXT;


-- ─── Notes personnelles utilisateur par vidéo ────────────────────────
CREATE TABLE IF NOT EXISTS public.jdtv_user_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id    UUID NOT NULL REFERENCES public.jdtv_videos(id) ON DELETE CASCADE,
  time_secs   INT,                                       -- optionnel : timecode de la note
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jdtv_notes_user_video
  ON public.jdtv_user_notes(user_id, video_id, time_secs);

DROP TRIGGER IF EXISTS trg_jdtv_user_notes_updated_at ON public.jdtv_user_notes;
CREATE TRIGGER trg_jdtv_user_notes_updated_at
  BEFORE UPDATE ON public.jdtv_user_notes
  FOR EACH ROW EXECUTE FUNCTION public.jdtv_touch_updated_at();


-- =====================================================================
-- RLS — chaque user voit/écrit ses propres notes
-- =====================================================================
ALTER TABLE public.jdtv_user_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jdtv_notes_read_own ON public.jdtv_user_notes;
CREATE POLICY jdtv_notes_read_own ON public.jdtv_user_notes
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS jdtv_notes_insert_own ON public.jdtv_user_notes;
CREATE POLICY jdtv_notes_insert_own ON public.jdtv_user_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS jdtv_notes_update_own ON public.jdtv_user_notes;
CREATE POLICY jdtv_notes_update_own ON public.jdtv_user_notes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS jdtv_notes_delete_own ON public.jdtv_user_notes;
CREATE POLICY jdtv_notes_delete_own ON public.jdtv_user_notes
  FOR DELETE USING (auth.uid() = user_id);


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Jesus Daily TV Phase 8 v32
-- =====================================================================
