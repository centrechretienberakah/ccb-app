-- ============================================================
-- Réseau social interne CCB — Feed Schema
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Catégories de posts (créées/modifiées par les admins)
CREATE TABLE IF NOT EXISTS public.post_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  icon text DEFAULT '📌',
  color text DEFAULT '#d4af37',
  sort_order integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. Posts (tous les membres peuvent publier)
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.post_categories(id) ON DELETE SET NULL,
  post_type text NOT NULL DEFAULT 'text',
  -- post_type: 'text' | 'image' | 'video' | 'link' | 'poll' | 'quiz'
  content text NOT NULL,
  media_url text,        -- image/vidéo URL ou Supabase Storage path
  link_url text,         -- pour les posts de type lien
  link_title text,
  link_description text,
  poll_options jsonb,
  -- poll: [{"text": "Option A"}, {"text": "Option B"}]
  -- quiz: [{"text": "Option A", "correct": true}, {"text": "Option B", "correct": false}]
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Commentaires
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 4. Likes
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 5. Votes de sondages / quiz
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Catégories : lecture pour tous, écriture admins
CREATE POLICY cat_select ON public.post_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY cat_admin_insert ON public.post_categories FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY cat_admin_update ON public.post_categories FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY cat_admin_delete ON public.post_categories FOR DELETE TO authenticated USING (public.is_admin());

-- Posts : lecture pour tous les connectés, écriture par l'auteur, suppression auteur ou admin
CREATE POLICY posts_select ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY posts_insert ON public.posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY posts_update_own ON public.posts FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY posts_delete_own ON public.posts FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- Commentaires
CREATE POLICY comments_select ON public.post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY comments_insert ON public.post_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY comments_delete_own ON public.post_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- Likes
CREATE POLICY likes_select ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY likes_insert ON public.post_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY likes_delete_own ON public.post_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Votes sondages
CREATE POLICY votes_select ON public.poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY votes_insert ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY votes_delete_own ON public.poll_votes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- Catégories par défaut
-- ============================================================
INSERT INTO public.post_categories (name, icon, color, sort_order) VALUES
  ('Vie chrétienne', '✝️', '#d4af37', 1),
  ('Témoignages',    '🙌', '#22c55e', 2),
  ('Questions',      '❓', '#3b82f6', 3),
  ('Encouragements', '💪', '#f97316', 4)
ON CONFLICT DO NOTHING;

-- Trigger updated_at sur posts
CREATE OR REPLACE FUNCTION update_posts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION update_posts_updated_at();
