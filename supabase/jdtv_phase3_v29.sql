-- =====================================================================
-- CCB JESUS DAILY TV PHASE 3 v29 — commentaires + réactions + live chat
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- ─── 1) Commentaires (asynchrones, persistants) ──────────────────────
CREATE TABLE IF NOT EXISTS public.jdtv_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id     UUID NOT NULL REFERENCES public.jdtv_videos(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id    UUID REFERENCES public.jdtv_comments(id) ON DELETE CASCADE,
  body         TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  like_count   INT NOT NULL DEFAULT 0,
  is_pinned    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jdtv_comments_video
  ON public.jdtv_comments(video_id, is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jdtv_comments_user
  ON public.jdtv_comments(user_id);


-- ─── 2) Likes sur commentaires ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jdtv_comment_likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id  UUID NOT NULL REFERENCES public.jdtv_comments(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_jdtv_comment_likes_user
  ON public.jdtv_comment_likes(user_id);


-- ─── 3) Réactions vidéo (5 émojis) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.jdtv_video_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id    UUID NOT NULL REFERENCES public.jdtv_videos(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction    TEXT NOT NULL CHECK (reaction IN ('clap', 'love', 'pray', 'fire', 'sparkle')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (video_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_jdtv_reactions_video
  ON public.jdtv_video_reactions(video_id);


-- ─── 4) Live chat (uniquement pendant les diffusions LIVE) ───────────
CREATE TABLE IF NOT EXISTS public.jdtv_live_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id    UUID NOT NULL REFERENCES public.jdtv_videos(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jdtv_live_messages_video
  ON public.jdtv_live_messages(video_id, created_at DESC);


-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Sync like_count sur commentaire
CREATE OR REPLACE FUNCTION public.jdtv_comment_like_count_sync()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.jdtv_comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.jdtv_comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_jdtv_comment_like_sync ON public.jdtv_comment_likes;
CREATE TRIGGER trg_jdtv_comment_like_sync
  AFTER INSERT OR DELETE ON public.jdtv_comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.jdtv_comment_like_count_sync();

DROP TRIGGER IF EXISTS trg_jdtv_comments_updated_at ON public.jdtv_comments;
CREATE TRIGGER trg_jdtv_comments_updated_at
  BEFORE UPDATE ON public.jdtv_comments
  FOR EACH ROW EXECUTE FUNCTION public.jdtv_touch_updated_at();


-- =====================================================================
-- RLS
-- =====================================================================

ALTER TABLE public.jdtv_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jdtv_comments_read_all ON public.jdtv_comments;
CREATE POLICY jdtv_comments_read_all ON public.jdtv_comments
  FOR SELECT USING (true);
DROP POLICY IF EXISTS jdtv_comments_insert_auth ON public.jdtv_comments;
CREATE POLICY jdtv_comments_insert_auth ON public.jdtv_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS jdtv_comments_update_own ON public.jdtv_comments;
CREATE POLICY jdtv_comments_update_own ON public.jdtv_comments
  FOR UPDATE USING (auth.uid() = user_id OR public.is_moderator_or_above())
  WITH CHECK (auth.uid() = user_id OR public.is_moderator_or_above());
DROP POLICY IF EXISTS jdtv_comments_delete_own ON public.jdtv_comments;
CREATE POLICY jdtv_comments_delete_own ON public.jdtv_comments
  FOR DELETE USING (auth.uid() = user_id OR public.is_moderator_or_above());

ALTER TABLE public.jdtv_comment_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jdtv_clikes_read_all ON public.jdtv_comment_likes;
CREATE POLICY jdtv_clikes_read_all ON public.jdtv_comment_likes
  FOR SELECT USING (true);
DROP POLICY IF EXISTS jdtv_clikes_insert_own ON public.jdtv_comment_likes;
CREATE POLICY jdtv_clikes_insert_own ON public.jdtv_comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS jdtv_clikes_delete_own ON public.jdtv_comment_likes;
CREATE POLICY jdtv_clikes_delete_own ON public.jdtv_comment_likes
  FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.jdtv_video_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jdtv_reactions_read_all ON public.jdtv_video_reactions;
CREATE POLICY jdtv_reactions_read_all ON public.jdtv_video_reactions
  FOR SELECT USING (true);
DROP POLICY IF EXISTS jdtv_reactions_upsert_own ON public.jdtv_video_reactions;
CREATE POLICY jdtv_reactions_upsert_own ON public.jdtv_video_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS jdtv_reactions_update_own ON public.jdtv_video_reactions;
CREATE POLICY jdtv_reactions_update_own ON public.jdtv_video_reactions
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS jdtv_reactions_delete_own ON public.jdtv_video_reactions;
CREATE POLICY jdtv_reactions_delete_own ON public.jdtv_video_reactions
  FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.jdtv_live_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jdtv_live_read_all ON public.jdtv_live_messages;
CREATE POLICY jdtv_live_read_all ON public.jdtv_live_messages
  FOR SELECT USING (true);
DROP POLICY IF EXISTS jdtv_live_insert_auth ON public.jdtv_live_messages;
CREATE POLICY jdtv_live_insert_auth ON public.jdtv_live_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS jdtv_live_delete_mod ON public.jdtv_live_messages;
CREATE POLICY jdtv_live_delete_mod ON public.jdtv_live_messages
  FOR DELETE USING (auth.uid() = user_id OR public.is_moderator_or_above());


-- =====================================================================
-- REALTIME : activer la publication temps réel pour le chat live
-- (idempotent)
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'jdtv_live_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.jdtv_live_messages;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- ignore si la publication n'existe pas dans cet environnement
  NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'jdtv_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.jdtv_comments;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;


-- =====================================================================
-- VUE : agrégation réactions par vidéo (pour stats publiques)
-- =====================================================================
CREATE OR REPLACE VIEW public.jdtv_video_reaction_counts AS
SELECT
  video_id,
  reaction,
  COUNT(*)::INT AS count
FROM public.jdtv_video_reactions
GROUP BY video_id, reaction;

GRANT SELECT ON public.jdtv_video_reaction_counts TO authenticated, anon;


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Jesus Daily TV Phase 3 v29
-- =====================================================================
