-- =====================================================================
-- CCB APP — BACKEND COMPLET v6 (CORRIGÉ)
-- Compatible Supabase / PostgreSQL
-- Idempotent — safe to run multiple times
-- =====================================================================

-- =====================================================================
-- EXTENSIONS
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- FONCTION GLOBALE updated_at
-- =====================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =====================================================================
-- FONCTION ADMIN SÉCURISÉE
-- Evite les récursions RLS
-- =====================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_leader_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'leader')
  );
END;
$$;

-- =====================================================================
-- TABLE NOTIFICATIONS
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
ON public.notifications(user_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;

CREATE POLICY notifications_select_own
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY notifications_update_own
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- USER PROFILES
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  city TEXT,
  country TEXT DEFAULT 'Cameroun',
  bio TEXT,
  cell_group TEXT,
  spiritual_level TEXT DEFAULT 'Nouveau croyant',
  is_premium BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id
ON public.user_profiles(user_id);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profiles_select_all ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_insert_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_update_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_delete_own ON public.user_profiles;

CREATE POLICY user_profiles_select_all
ON public.user_profiles
FOR SELECT
USING (true);

CREATE POLICY user_profiles_insert_own
ON public.user_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_profiles_update_own
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_profiles_delete_own
ON public.user_profiles
FOR DELETE
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at
ON public.user_profiles;

CREATE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- =====================================================================
-- AUTO CREATE PROFILE
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  INSERT INTO public.user_profiles (
    user_id,
    full_name,
    avatar_url
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile
ON auth.users;

CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_profile();

-- =====================================================================
-- USER ROLES
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('member','leader','moderator','admin')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user
ON public.user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role
ON public.user_roles(role);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_roles_select_all ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_manage ON public.user_roles;

CREATE POLICY user_roles_select_all
ON public.user_roles
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY user_roles_admin_manage
ON public.user_roles
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- =====================================================================
-- POST CATEGORIES
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.post_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  emoji TEXT,
  color TEXT DEFAULT 'var(--violet)',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS post_categories_public
ON public.post_categories;

CREATE POLICY post_categories_public
ON public.post_categories
FOR SELECT
USING (true);

INSERT INTO public.post_categories (slug, label, emoji)
VALUES
  ('general', 'General', '💬'),
  ('testimony', 'Temoignage', '✨'),
  ('prayer', 'Priere', '🙏'),
  ('encouragement', 'Encouragement', '💪'),
  ('question', 'Question', '❓'),
  ('praise', 'Louange', '🎉'),
  ('announcement', 'Annonce', '📢')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================================
-- POSTS
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.post_categories(id),
  content TEXT NOT NULL,
  image_url TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user
ON public.posts(user_id);

CREATE INDEX IF NOT EXISTS idx_posts_created
ON public.posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_category
ON public.posts(category_id);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS posts_select_approved ON public.posts;
DROP POLICY IF EXISTS posts_insert_auth ON public.posts;
DROP POLICY IF EXISTS posts_update_own ON public.posts;
DROP POLICY IF EXISTS posts_delete_own ON public.posts;

CREATE POLICY posts_select_approved
ON public.posts
FOR SELECT
USING (
  is_approved = true
  OR auth.uid() = user_id
);

CREATE POLICY posts_insert_auth
ON public.posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY posts_update_own
ON public.posts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY posts_delete_own
ON public.posts
FOR DELETE
USING (
  auth.uid() = user_id
  OR public.is_admin()
);

DROP TRIGGER IF EXISTS trg_posts_updated_at
ON public.posts;

CREATE TRIGGER trg_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- =====================================================================
-- POST COMMENTS
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post
ON public.post_comments(post_id, created_at);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS post_comments_select ON public.post_comments;
DROP POLICY IF EXISTS post_comments_insert ON public.post_comments;
DROP POLICY IF EXISTS post_comments_delete ON public.post_comments;

CREATE POLICY post_comments_select
ON public.post_comments
FOR SELECT
USING (true);

CREATE POLICY post_comments_insert
ON public.post_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY post_comments_delete
ON public.post_comments
FOR DELETE
USING (
  auth.uid() = user_id
  OR public.is_admin()
);

-- =====================================================================
-- POST LIKES
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post
ON public.post_likes(post_id);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS post_likes_select ON public.post_likes;
DROP POLICY IF EXISTS post_likes_insert ON public.post_likes;
DROP POLICY IF EXISTS post_likes_delete ON public.post_likes;

CREATE POLICY post_likes_select
ON public.post_likes
FOR SELECT
USING (true);

CREATE POLICY post_likes_insert
ON public.post_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY post_likes_delete
ON public.post_likes
FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================================
-- LIKE COUNTER
-- =====================================================================

CREATE OR REPLACE FUNCTION public.sync_post_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  IF TG_OP = 'INSERT' THEN

    UPDATE public.posts
    SET like_count = like_count + 1
    WHERE id = NEW.post_id;

  ELSIF TG_OP = 'DELETE' THEN

    UPDATE public.posts
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.post_id;

  END IF;

  RETURN NULL;

END;
$$;

DROP TRIGGER IF EXISTS trg_post_likes_sync
ON public.post_likes;

CREATE TRIGGER trg_post_likes_sync
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.sync_post_like_count();

-- =====================================================================
-- COMMENT COUNTER
-- =====================================================================

CREATE OR REPLACE FUNCTION public.sync_post_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  IF TG_OP = 'INSERT' THEN

    UPDATE public.posts
    SET comment_count = comment_count + 1
    WHERE id = NEW.post_id;

  ELSIF TG_OP = 'DELETE' THEN

    UPDATE public.posts
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE id = OLD.post_id;

  END IF;

  RETURN NULL;

END;
$$;

DROP TRIGGER IF EXISTS trg_post_comments_sync
ON public.post_comments;

CREATE TRIGGER trg_post_comments_sync
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.sync_post_comment_count();

-- =====================================================================
-- INSERT NOTIFICATION
-- =====================================================================

CREATE OR REPLACE FUNCTION public.insert_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_link_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    link_url
  )
  VALUES (
    p_user_id,
    p_type,
    p_title,
    p_body,
    p_link_url
  );

END;
$$;

-- =====================================================================
-- NOTIFY ON LIKE
-- =====================================================================

CREATE OR REPLACE FUNCTION public.notify_on_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author UUID;
BEGIN

  SELECT user_id
  INTO v_author
  FROM public.posts
  WHERE id = NEW.post_id;

  IF v_author IS NOT NULL
     AND v_author <> NEW.user_id THEN

    PERFORM public.insert_notification(
      v_author,
      'like',
      'Quelqu''un a aimé votre publication',
      NULL,
      '/community'
    );

  END IF;

  RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_like
ON public.post_likes;

CREATE TRIGGER trg_notify_post_like
AFTER INSERT ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_post_like();

-- =====================================================================
-- NOTIFY ON COMMENT
-- =====================================================================

CREATE OR REPLACE FUNCTION public.notify_on_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author UUID;
BEGIN

  SELECT user_id
  INTO v_author
  FROM public.posts
  WHERE id = NEW.post_id;

  IF v_author IS NOT NULL
     AND v_author <> NEW.user_id THEN

    PERFORM public.insert_notification(
      v_author,
      'comment',
      'Nouveau commentaire sur votre publication',
      NULL,
      '/community'
    );

  END IF;

  RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_comment
ON public.post_comments;

CREATE TRIGGER trg_notify_post_comment
AFTER INSERT ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_post_comment();

-- =====================================================================
-- REALTIME
-- =====================================================================

DO $$
BEGIN

  BEGIN
    ALTER PUBLICATION supabase_realtime
    ADD TABLE public.posts;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime
    ADD TABLE public.post_comments;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime
    ADD TABLE public.post_likes;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime
    ADD TABLE public.notifications;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

END;
$$;