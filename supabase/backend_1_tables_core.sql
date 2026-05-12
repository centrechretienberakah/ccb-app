-- CCB BACKEND — PARTIE 1/3 : Migration + User profiles + Communauté
-- Executer en premier

-- =====================================================================
-- CCB APP — BACKEND COMPLET v5
-- Adapte aux tables existantes dans Supabase
-- Idempotent — safe to run multiple times
-- Run and enable RLS
-- =====================================================================

-- =====================================================================
-- 0. MIGRATION GLOBALE — created_at pour tables existantes sans cette colonne
-- =====================================================================
DO $$
BEGIN
  BEGIN ALTER TABLE public.posts              ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.post_comments      ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.post_likes         ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.post_categories    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.prayer_request     ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.prayer_intercessions ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.prayer_comments    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.events             ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.events_rsvp        ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.user_profiles      ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.user_roles         ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.spiritual_milestones ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.user_saved_verses  ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.user_bible_notes   ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.user_reading_progress ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.user_roles         ADD COLUMN granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.courses            ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.notifications      ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

-- =====================================================================
-- 1. PROFILS UTILISATEUR — migration colonnes manquantes
--    (table user_profiles existe deja)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ajouter les colonnes manquantes
DO $$
BEGIN
  BEGIN ALTER TABLE public.user_profiles ADD COLUMN phone           TEXT;                              EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.user_profiles ADD COLUMN city            TEXT;                              EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.user_profiles ADD COLUMN country         TEXT DEFAULT 'Cameroun';           EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.user_profiles ADD COLUMN bio             TEXT;                              EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.user_profiles ADD COLUMN cell_group      TEXT;                              EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.user_profiles ADD COLUMN spiritual_level TEXT DEFAULT 'Nouveau croyant';   EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.user_profiles ADD COLUMN is_premium      BOOLEAN NOT NULL DEFAULT false;    EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.user_profiles ADD COLUMN updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select_all" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_own" ON public.user_profiles;
CREATE POLICY "user_profiles_select_all" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "user_profiles_insert_own" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_profiles_update_own" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_profiles_delete_own" ON public.user_profiles FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================================
-- 2. ROLES UTILISATEUR
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','leader','moderator','admin')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  BEGIN ALTER TABLE public.user_roles ADD COLUMN granted_by UUID REFERENCES auth.users(id); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.user_roles ADD COLUMN granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(); EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_all"   ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
CREATE POLICY "user_roles_select_all"   ON public.user_roles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- =====================================================================
-- 3. JALONS SPIRITUELS
--    (table spiritual_milestones existe deja)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.spiritual_milestones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone   TEXT NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_user ON public.spiritual_milestones(user_id);
ALTER TABLE public.spiritual_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "milestones_select_own" ON public.spiritual_milestones;
DROP POLICY IF EXISTS "milestones_insert_own" ON public.spiritual_milestones;
DROP POLICY IF EXISTS "milestones_delete_own" ON public.spiritual_milestones;
DROP POLICY IF EXISTS "milestones_select_all" ON public.spiritual_milestones;
CREATE POLICY "milestones_select_own" ON public.spiritual_milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "milestones_insert_own" ON public.spiritual_milestones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "milestones_delete_own" ON public.spiritual_milestones FOR DELETE USING (auth.uid() = user_id);

-- =====================================================================
-- 4. COMMUNAUTE — POST CATEGORIES
--    (table post_categories existe deja)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.post_categories (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug  TEXT NOT NULL,
  label TEXT NOT NULL,
  emoji TEXT,
  color TEXT DEFAULT 'var(--violet)'
);

DO $$
BEGIN
  BEGIN ALTER TABLE public.post_categories ALTER COLUMN name DROP NOT NULL; EXCEPTION WHEN undefined_column THEN NULL; WHEN others THEN NULL; END;
  BEGIN ALTER TABLE public.post_categories ADD COLUMN slug  TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.post_categories ADD COLUMN label TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.post_categories ADD COLUMN emoji TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.post_categories ADD COLUMN color TEXT DEFAULT 'var(--violet)'; EXCEPTION WHEN duplicate_column THEN NULL; END;
  DELETE FROM public.post_categories WHERE slug IS NULL;
  BEGIN
    ALTER TABLE public.post_categories ADD CONSTRAINT post_categories_slug_key UNIQUE (slug);
  EXCEPTION WHEN duplicate_table THEN NULL; WHEN others THEN NULL;
  END;
END $$;

ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "post_categories_public" ON public.post_categories;
CREATE POLICY "post_categories_public" ON public.post_categories FOR SELECT USING (true);

INSERT INTO public.post_categories (slug, label, emoji) VALUES
  ('general',       'General',      '💬'),
  ('testimony',     'Temoignage',   '✨'),
  ('prayer',        'Priere',       '🙏'),
  ('encouragement', 'Encouragement','💪'),
  ('question',      'Question',     '❓'),
  ('praise',        'Louange',      '🎉'),
  ('announcement',  'Annonce',      '📢')
ON CONFLICT DO NOTHING;

-- =====================================================================
-- 4b. POSTS — migration colonnes manquantes
--     (table posts existe deja)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.posts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  BEGIN ALTER TABLE public.posts ADD COLUMN category_id   UUID REFERENCES public.post_categories(id); EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.posts ADD COLUMN image_url     TEXT;                                        EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.posts ADD COLUMN is_pinned     BOOLEAN NOT NULL DEFAULT false;              EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.posts ADD COLUMN is_approved   BOOLEAN NOT NULL DEFAULT true;               EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.posts ADD COLUMN like_count    INTEGER NOT NULL DEFAULT 0;                  EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.posts ADD COLUMN comment_count INTEGER NOT NULL DEFAULT 0;                  EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.posts ADD COLUMN updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();          EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

CREATE INDEX IF NOT EXISTS idx_posts_user     ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created  ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category_id);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_select_approved" ON public.posts;
DROP POLICY IF EXISTS "posts_insert_auth"     ON public.posts;
DROP POLICY IF EXISTS "posts_update_own"      ON public.posts;
DROP POLICY IF EXISTS "posts_delete_own"      ON public.posts;
CREATE POLICY "posts_select_approved" ON public.posts FOR SELECT USING (is_approved = true OR auth.uid() = user_id);
CREATE POLICY "posts_insert_auth"     ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update_own"      ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "posts_delete_own"      ON public.posts FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','moderator'))
);

DROP TRIGGER IF EXISTS posts_updated_at ON public.posts;
CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================================
-- 4c. POST COMMENTS & LIKES
--     (tables existent deja)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.post_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id, created_at); EXCEPTION WHEN undefined_column THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_post_comments_user ON public.post_comments(user_id);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_comments_select" ON public.post_comments;
DROP POLICY IF EXISTS "post_comments_insert" ON public.post_comments;
DROP POLICY IF EXISTS "post_comments_delete" ON public.post_comments;
CREATE POLICY "post_comments_select" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "post_comments_insert" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_comments_delete" ON public.post_comments FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','moderator'))
);

CREATE TABLE IF NOT EXISTS public.post_likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON public.post_likes(user_id);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_likes_select" ON public.post_likes;
DROP POLICY IF EXISTS "post_likes_insert" ON public.post_likes;
DROP POLICY IF EXISTS "post_likes_delete" ON public.post_likes;
CREATE POLICY "post_likes_select" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "post_likes_insert" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_likes_delete" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_post_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF; RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS post_likes_sync_count ON public.post_likes;
CREATE TRIGGER post_likes_sync_count
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_like_count();

CREATE OR REPLACE FUNCTION public.sync_post_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF; RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS post_comments_sync_count ON public.post_comments;
CREATE TRIGGER post_comments_sync_count
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_comment_count();

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;         EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;    EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
