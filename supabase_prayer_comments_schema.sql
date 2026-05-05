-- ═══════════════════════════════════════════════════════════════
-- SCHEMA RÉPONSES DE PRIÈRE — Centre Chrétien Berakah
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.prayer_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id  uuid NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    text NOT NULL CHECK (char_length(content) >= 2 AND char_length(content) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prayer_comments_prayer_id ON public.prayer_comments(prayer_id);
CREATE INDEX IF NOT EXISTS idx_prayer_comments_created_at ON public.prayer_comments(created_at);

ALTER TABLE public.prayer_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_read_prayer_comments"
  ON public.prayer_comments FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "members_insert_prayer_comment"
  ON public.prayer_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "author_delete_prayer_comment"
  ON public.prayer_comments FOR DELETE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_comments;
