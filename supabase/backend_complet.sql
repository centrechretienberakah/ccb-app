-- =====================================================================
-- CCB APP — BACKEND COMPLET
-- Tables manquantes identifiées par analyse du code source
-- À exécuter dans : Supabase Dashboard → SQL Editor
-- Ordre : respecte les dépendances entre tables
-- =====================================================================

-- =====================================================================
-- 1. PROFILS UTILISATEUR ÉTENDUS
--    Utilisé par ProfileClient, CommunityClient (cell_group, etc.)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  avatar_url    TEXT,
  phone         TEXT,
  city          TEXT,
  country       TEXT DEFAULT 'Cameroun',
  bio           TEXT,
  cell_group    TEXT,
  spiritual_level TEXT DEFAULT 'Nouveau croyant',
  is_premium    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select_all" ON public.user_profiles;
CREATE POLICY "user_profiles_select_all"  ON public.user_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
CREATE POLICY "user_profiles_insert_own"  ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
CREATE POLICY "user_profiles_update_own"  ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_profiles_delete_own" ON public.user_profiles;
CREATE POLICY "user_profiles_delete_own"  ON public.user_profiles FOR DELETE USING (auth.uid() = user_id);

-- Trigger updated_at
DROP TRIGGER IF EXISTS user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-créer un user_profile à l'inscription (complète handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- =====================================================================
-- 2. RÔLES UTILISATEUR
--    Utilisé par CommunityClient, ProfileClient, admin checks
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'leader', 'moderator', 'admin')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role  ON public.user_roles(role);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_all" ON public.user_roles;
CREATE POLICY "user_roles_select_all"    ON public.user_roles FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
CREATE POLICY "user_roles_admin_manage"  ON public.user_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- =====================================================================
-- 3. JALONS SPIRITUELS
--    Utilisé par ProfileClient, CommunityClient
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.spiritual_milestones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone  TEXT NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_user ON public.spiritual_milestones(user_id);

ALTER TABLE public.spiritual_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "milestones_select_own" ON public.spiritual_milestones;
CREATE POLICY "milestones_select_own"  ON public.spiritual_milestones FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "milestones_insert_own" ON public.spiritual_milestones;
CREATE POLICY "milestones_insert_own"  ON public.spiritual_milestones FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "milestones_delete_own" ON public.spiritual_milestones;
CREATE POLICY "milestones_delete_own"  ON public.spiritual_milestones FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "milestones_select_all" ON public.spiritual_milestones;
CREATE POLICY "milestones_select_all"  ON public.spiritual_milestones FOR SELECT USING (true);

-- =====================================================================
-- 4. COMMUNAUTÉ — POSTS, COMMENTAIRES, LIKES
--    Réseau social interne CCB
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.post_categories (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug  TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  emoji TEXT,
  color TEXT DEFAULT 'var(--violet)'
);

INSERT INTO public.post_categories (slug, label, emoji) VALUES
  ('general',       'Général',         '💬'),
  ('testimony',     'Témoignage',       '✨'),
  ('prayer',        'Prière',           '🙏'),
  ('encouragement', 'Encouragement',    '💪'),
  ('question',      'Question',         '❓'),
  ('praise',        'Louange',          '🎉'),
  ('announcement',  'Annonce',          '📢')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "post_categories_public" ON public.post_categories;
CREATE POLICY "post_categories_public" ON public.post_categories FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  category_id UUID REFERENCES public.post_categories(id),
  image_url   TEXT,
  is_pinned   BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  like_count  INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user      ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created   ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category  ON public.posts(category_id);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_select_approved" ON public.posts;
CREATE POLICY "posts_select_approved" ON public.posts FOR SELECT USING (is_approved = true OR auth.uid() = user_id);
DROP POLICY IF EXISTS "posts_insert_auth" ON public.posts;
CREATE POLICY "posts_insert_auth"     ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "posts_update_own" ON public.posts;
CREATE POLICY "posts_update_own"      ON public.posts FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "posts_delete_own" ON public.posts;
CREATE POLICY "posts_delete_own"      ON public.posts FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','moderator'))
);

DROP TRIGGER IF EXISTS posts_updated_at ON public.posts;
CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.post_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_post_comments_user ON public.post_comments(user_id);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_comments_select" ON public.post_comments;
CREATE POLICY "post_comments_select"  ON public.post_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "post_comments_insert" ON public.post_comments;
CREATE POLICY "post_comments_insert"  ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "post_comments_delete" ON public.post_comments;
CREATE POLICY "post_comments_delete"  ON public.post_comments FOR DELETE USING (
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
CREATE POLICY "post_likes_select" ON public.post_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "post_likes_insert" ON public.post_likes;
CREATE POLICY "post_likes_insert" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "post_likes_delete" ON public.post_likes;
CREATE POLICY "post_likes_delete" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- Trigger: sync like_count sur posts
CREATE OR REPLACE FUNCTION public.sync_post_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS post_likes_sync_count ON public.post_likes;
CREATE TRIGGER post_likes_sync_count
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_like_count();

-- Trigger: sync comment_count sur posts
CREATE OR REPLACE FUNCTION public.sync_post_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS post_comments_sync_count ON public.post_comments;
CREATE TRIGGER post_comments_sync_count
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_comment_count();

-- Sondages (polls dans les posts)
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_idx INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "poll_votes_select" ON public.poll_votes;
CREATE POLICY "poll_votes_select" ON public.poll_votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "poll_votes_insert" ON public.poll_votes;
CREATE POLICY "poll_votes_insert" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "poll_votes_delete" ON public.poll_votes;
CREATE POLICY "poll_votes_delete" ON public.poll_votes FOR DELETE USING (auth.uid() = user_id);

-- Realtime pour posts
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.posts; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- 5. PRIÈRE — INTERCESSIONS & COMMENTAIRES
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.prayer_intercessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id  UUID NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (prayer_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_intercessions_prayer ON public.prayer_intercessions(prayer_id);
CREATE INDEX IF NOT EXISTS idx_intercessions_user   ON public.prayer_intercessions(user_id);

ALTER TABLE public.prayer_intercessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "intercessions_select" ON public.prayer_intercessions;
CREATE POLICY "intercessions_select" ON public.prayer_intercessions FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "intercessions_insert" ON public.prayer_intercessions;
CREATE POLICY "intercessions_insert" ON public.prayer_intercessions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "intercessions_delete" ON public.prayer_intercessions;
CREATE POLICY "intercessions_delete" ON public.prayer_intercessions FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.prayer_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id  UUID NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prayer_comments_prayer ON public.prayer_comments(prayer_id, created_at);

ALTER TABLE public.prayer_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prayer_comments_select" ON public.prayer_comments;
CREATE POLICY "prayer_comments_select" ON public.prayer_comments FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "prayer_comments_insert" ON public.prayer_comments;
CREATE POLICY "prayer_comments_insert" ON public.prayer_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "prayer_comments_delete" ON public.prayer_comments;
CREATE POLICY "prayer_comments_delete" ON public.prayer_comments FOR DELETE USING (auth.uid() = user_id);

-- =====================================================================
-- 6. ÉVÉNEMENTS — RSVP / INSCRIPTIONS
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.event_rsvp (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'maybe', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvp_event ON public.event_rsvp(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvp_user  ON public.event_rsvp(user_id);

ALTER TABLE public.event_rsvp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_rsvp_select" ON public.event_rsvp;
CREATE POLICY "event_rsvp_select"     ON public.event_rsvp FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "event_rsvp_insert" ON public.event_rsvp;
CREATE POLICY "event_rsvp_insert"     ON public.event_rsvp FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "event_rsvp_update_own" ON public.event_rsvp;
CREATE POLICY "event_rsvp_update_own" ON public.event_rsvp FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "event_rsvp_delete_own" ON public.event_rsvp;
CREATE POLICY "event_rsvp_delete_own" ON public.event_rsvp FOR DELETE USING (auth.uid() = user_id);

-- =====================================================================
-- 7. BIBLE — NOTES, VERSETS SAUVEGARDÉS, PROGRESSION
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.user_saved_verses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book        TEXT NOT NULL,
  chapter     INTEGER NOT NULL,
  verse       INTEGER NOT NULL,
  verse_text  TEXT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, book, chapter, verse)
);

CREATE INDEX IF NOT EXISTS idx_saved_verses_user ON public.user_saved_verses(user_id, created_at DESC);

ALTER TABLE public.user_saved_verses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_verses_own" ON public.user_saved_verses;
CREATE POLICY "saved_verses_own" ON public.user_saved_verses FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_bible_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book       TEXT NOT NULL,
  chapter    INTEGER NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, book, chapter)
);

CREATE INDEX IF NOT EXISTS idx_bible_notes_user ON public.user_bible_notes(user_id);

ALTER TABLE public.user_bible_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bible_notes_own" ON public.user_bible_notes;
CREATE POLICY "bible_notes_own" ON public.user_bible_notes FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS bible_notes_updated_at ON public.user_bible_notes;
CREATE TRIGGER bible_notes_updated_at
  BEFORE UPDATE ON public.user_bible_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.user_reading_progress (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book        TEXT NOT NULL,
  chapter     INTEGER NOT NULL,
  read_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, book, chapter)
);

CREATE INDEX IF NOT EXISTS idx_reading_progress_user ON public.user_reading_progress(user_id);

ALTER TABLE public.user_reading_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reading_progress_own" ON public.user_reading_progress;
CREATE POLICY "reading_progress_own" ON public.user_reading_progress FOR ALL USING (auth.uid() = user_id);

-- =====================================================================
-- 8. GALERIE PHOTOS
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.photo_albums (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  cover_url   TEXT,
  event_id    UUID REFERENCES public.events(id) ON DELETE SET NULL,
  is_public   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_albums_created ON public.photo_albums(created_at DESC);

ALTER TABLE public.photo_albums ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "albums_public_read" ON public.photo_albums;
CREATE POLICY "albums_public_read"  ON public.photo_albums FOR SELECT USING (is_public = true);
DROP POLICY IF EXISTS "albums_admin_write" ON public.photo_albums;
CREATE POLICY "albums_admin_write"  ON public.photo_albums FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','leader'))
);

CREATE TABLE IF NOT EXISTS public.photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id    UUID NOT NULL REFERENCES public.photo_albums(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  caption     TEXT,
  like_count  INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_album ON public.photos(album_id, created_at DESC);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "photos_public_read" ON public.photos;
CREATE POLICY "photos_public_read"  ON public.photos FOR SELECT USING (true);
DROP POLICY IF EXISTS "photos_admin_write" ON public.photos;
CREATE POLICY "photos_admin_write"  ON public.photos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','leader'))
);

-- =====================================================================
-- 9. BIBLIOTHÈQUE DIGITALE
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.media_library (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  type         TEXT NOT NULL CHECK (type IN ('pdf', 'audio', 'video', 'ebook', 'document')),
  category     TEXT DEFAULT 'general',
  file_url     TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size_mb DECIMAL(10,2),
  duration_secs INTEGER,
  is_premium   BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_type     ON public.media_library(type);
CREATE INDEX IF NOT EXISTS idx_media_created  ON public.media_library(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_published ON public.media_library(is_published);

ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "media_public_read" ON public.media_library;
CREATE POLICY "media_public_read"   ON public.media_library FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS "media_premium_read" ON public.media_library;
CREATE POLICY "media_premium_read"  ON public.media_library FOR SELECT USING (
  is_premium = false OR
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND is_premium = true)
);
DROP POLICY IF EXISTS "media_admin_write" ON public.media_library;
CREATE POLICY "media_admin_write"   ON public.media_library FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- =====================================================================
-- 10. RENDEZ-VOUS PASTORAL
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.pastoral_appointments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  phone        TEXT NOT NULL,
  email        TEXT,
  subject      TEXT NOT NULL,
  message      TEXT,
  preferred_date DATE NOT NULL,
  preferred_time TEXT,
  modality     TEXT DEFAULT 'presentiel' CHECK (modality IN ('presentiel', 'visio', 'telephone')),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  admin_notes  TEXT,
  scheduled_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_user   ON public.pastoral_appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.pastoral_appointments(status, preferred_date);

ALTER TABLE public.pastoral_appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "appointments_own" ON public.pastoral_appointments;
CREATE POLICY "appointments_own"       ON public.pastoral_appointments FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "appointments_insert" ON public.pastoral_appointments;
CREATE POLICY "appointments_insert"    ON public.pastoral_appointments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "appointments_admin_all" ON public.pastoral_appointments;
CREATE POLICY "appointments_admin_all" ON public.pastoral_appointments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','leader'))
);

-- =====================================================================
-- 11. ENSEIGNEMENTS / SERMONS
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.sermons (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  description    TEXT,
  speaker        TEXT DEFAULT 'Rév. Elvis NGUIFFO',
  series         TEXT,
  scripture_ref  TEXT,
  video_url      TEXT,
  audio_url      TEXT,
  thumbnail_url  TEXT,
  duration_secs  INTEGER,
  is_published   BOOLEAN NOT NULL DEFAULT false,
  is_premium     BOOLEAN NOT NULL DEFAULT false,
  view_count     INTEGER NOT NULL DEFAULT 0,
  published_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sermons_published ON public.sermons(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_sermons_series    ON public.sermons(series);

ALTER TABLE public.sermons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sermons_public_read" ON public.sermons;
CREATE POLICY "sermons_public_read" ON public.sermons FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS "sermons_admin_write" ON public.sermons;
CREATE POLICY "sermons_admin_write" ON public.sermons FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- =====================================================================
-- 12. GROUPES DE TRAVAIL PRIVÉS / CELLULES
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  type        TEXT DEFAULT 'cell' CHECK (type IN ('cell', 'prayer', 'study', 'mentoring', 'team')),
  cover_url   TEXT,
  is_private  BOOLEAN NOT NULL DEFAULT true,
  max_members INTEGER DEFAULT 20,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "groups_public_read" ON public.groups;
CREATE POLICY "groups_public_read" ON public.groups FOR SELECT USING (is_private = false);
DROP POLICY IF EXISTS "groups_member_read" ON public.groups;
CREATE POLICY "groups_member_read" ON public.groups FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = groups.id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "groups_admin_write" ON public.groups;
CREATE POLICY "groups_admin_write" ON public.groups FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','leader'))
);

CREATE TABLE IF NOT EXISTS public.group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT DEFAULT 'member' CHECK (role IN ('member', 'leader', 'admin')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user  ON public.group_members(user_id);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_members_select" ON public.group_members;
CREATE POLICY "group_members_select" ON public.group_members FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "group_members_admin" ON public.group_members;
CREATE POLICY "group_members_admin"  ON public.group_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','leader'))
);

-- =====================================================================
-- 13. SALLE DE CLASSE — LEÇONS & PROGRESSION
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.course_lessons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  video_url     TEXT,
  pdf_url       TEXT,
  duration_mins INTEGER DEFAULT 0,
  order_index   INTEGER DEFAULT 0,
  is_free       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_course ON public.course_lessons(course_id, order_index);

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lessons_public_read" ON public.course_lessons;
CREATE POLICY "lessons_public_read" ON public.course_lessons FOR SELECT USING (
  is_free = true OR
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND is_premium = true)
);
DROP POLICY IF EXISTS "lessons_admin_write" ON public.course_lessons;
CREATE POLICY "lessons_admin_write" ON public.course_lessons FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE TABLE IF NOT EXISTS public.user_course_progress (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id   UUID REFERENCES public.course_lessons(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_course_progress_user ON public.user_course_progress(user_id, course_id);

ALTER TABLE public.user_course_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "course_progress_own" ON public.user_course_progress;
CREATE POLICY "course_progress_own" ON public.user_course_progress FOR ALL USING (auth.uid() = user_id);

-- =====================================================================
-- 14. FORMULAIRE DE CONTACT
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 2000),
  is_read     BOOLEAN NOT NULL DEFAULT false,
  replied_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_created ON public.contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_unread  ON public.contact_messages(is_read) WHERE is_read = false;

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_insert_all" ON public.contact_messages;
CREATE POLICY "contact_insert_all"  ON public.contact_messages FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "contact_own_select" ON public.contact_messages;
CREATE POLICY "contact_own_select"  ON public.contact_messages FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "contact_admin_all" ON public.contact_messages;
CREATE POLICY "contact_admin_all"   ON public.contact_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- =====================================================================
-- 15. NOTIFICATIONS — TRIGGERS AUTOMATIQUES
--     (table notifications déjà créée via notifications.sql)
-- =====================================================================

-- Fonction générique pour insérer une notification
CREATE OR REPLACE FUNCTION public.insert_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_link_url TEXT DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link_url)
  VALUES (p_user_id, p_type, p_title, p_body, p_link_url);
END;
$$;

-- Notifier l'auteur d'un post quand quelqu'un aime
CREATE OR REPLACE FUNCTION public.notify_on_post_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_author UUID;
BEGIN
  SELECT user_id INTO v_author FROM public.posts WHERE id = NEW.post_id;
  IF v_author IS NOT NULL AND v_author <> NEW.user_id THEN
    PERFORM public.insert_notification(
      v_author, 'like', 'Quelqu''un a aimé votre publication',
      NULL, '/community'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_like ON public.post_likes;
CREATE TRIGGER trg_notify_post_like
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_like();

-- Notifier l'auteur d'un post sur nouveau commentaire
CREATE OR REPLACE FUNCTION public.notify_on_post_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_author UUID;
BEGIN
  SELECT user_id INTO v_author FROM public.posts WHERE id = NEW.post_id;
  IF v_author IS NOT NULL AND v_author <> NEW.user_id THEN
    PERFORM public.insert_notification(
      v_author, 'comment', 'Nouveau commentaire sur votre publication',
      NULL, '/community'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_comment ON public.post_comments;
CREATE TRIGGER trg_notify_post_comment
  AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_comment();

-- Notifier sur intercession de prière
CREATE OR REPLACE FUNCTION public.notify_on_intercession()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_author UUID;
BEGIN
  SELECT user_id INTO v_author FROM public.prayer_requests WHERE id = NEW.prayer_id;
  IF v_author IS NOT NULL AND v_author <> NEW.user_id THEN
    PERFORM public.insert_notification(
      v_author, 'intercession', 'Quelqu''un prie pour vous 🙏',
      NULL, '/prayer'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_intercession ON public.prayer_intercessions;
CREATE TRIGGER trg_notify_intercession
  AFTER INSERT ON public.prayer_intercessions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_intercession();

-- =====================================================================
-- 16. STORAGE BUCKETS
--     À configurer aussi dans Supabase Dashboard → Storage
-- =====================================================================

-- Note: Les buckets doivent être créés via l'interface Supabase ou l'API.
-- Voici les configurations à appliquer :
--
-- Bucket: "avatars"        → Public: true  | Allowed MIME: image/*
-- Bucket: "post-images"   → Public: true  | Allowed MIME: image/*
-- Bucket: "media"         → Public: false | Allowed MIME: application/pdf, audio/*, video/*
-- Bucket: "photos"        → Public: true  | Allowed MIME: image/*
-- Bucket: "documents"     → Public: false | Allowed MIME: application/pdf, application/msword

-- Politiques storage (à appliquer sur chaque bucket):
-- INSERT: auth.role() = 'authenticated'
-- SELECT: (bucket = 'avatars' OR bucket = 'post-images' OR bucket = 'photos') → public
--         (bucket = 'media' OR bucket = 'documents') → is_premium = true OR role = 'admin'
-- DELETE: auth.uid()::text = (storage.foldername(name))[1]

-- =====================================================================
-- 17. REALTIME — ACTIVER LES TABLES MANQUANTES
-- =====================================================================

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_requests; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_comments; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.events; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.event_rsvp; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- FIN DU FICHIER — BACKEND CCB COMPLET
-- =====================================================================
-- Tables créées : 24
-- Triggers automatiques : 6
-- Politiques RLS : 60+
-- Index de performance : 25+
-- =====================================================================
