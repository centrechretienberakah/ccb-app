-- CCB BACKEND — PARTIE 3/3 : Galerie + Bibliothèque + Rendez-vous + Sermons + Groupes + Classes + Contact + Triggers
-- Executer en dernier

-- =====================================================================
-- 10. RENDEZ-VOUS PASTORAL — NOUVELLE TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.pastoral_appointments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      TEXT NOT NULL,
  phone          TEXT NOT NULL,
  email          TEXT,
  subject        TEXT NOT NULL,
  message        TEXT,
  preferred_date DATE NOT NULL,
  preferred_time TEXT,
  modality       TEXT DEFAULT 'presentiel' CHECK (modality IN ('presentiel','visio','telephone')),
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed')),
  admin_notes    TEXT,
  scheduled_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_user   ON public.pastoral_appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.pastoral_appointments(status, preferred_date);
ALTER TABLE public.pastoral_appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "appointments_own"       ON public.pastoral_appointments;
DROP POLICY IF EXISTS "appointments_insert"    ON public.pastoral_appointments;
DROP POLICY IF EXISTS "appointments_admin_all" ON public.pastoral_appointments;
CREATE POLICY "appointments_own"       ON public.pastoral_appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "appointments_insert"    ON public.pastoral_appointments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "appointments_admin_all" ON public.pastoral_appointments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','leader'))
);

-- =====================================================================
-- 11. SERMONS / ENSEIGNEMENTS — NOUVELLE TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.sermons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  speaker       TEXT DEFAULT 'Rev. Elvis NGUIFFO',
  series        TEXT,
  scripture_ref TEXT,
  video_url     TEXT,
  audio_url     TEXT,
  thumbnail_url TEXT,
  duration_secs INTEGER,
  is_published  BOOLEAN NOT NULL DEFAULT false,
  is_premium    BOOLEAN NOT NULL DEFAULT false,
  view_count    INTEGER NOT NULL DEFAULT 0,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sermons_published ON public.sermons(is_published, published_at DESC);
ALTER TABLE public.sermons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sermons_public_read" ON public.sermons;
DROP POLICY IF EXISTS "sermons_admin_write" ON public.sermons;
CREATE POLICY "sermons_public_read" ON public.sermons FOR SELECT USING (is_published = true);
CREATE POLICY "sermons_admin_write" ON public.sermons FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- =====================================================================
-- 12. GROUPES / CELLULES — NOUVELLES TABLES
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  type        TEXT DEFAULT 'cell' CHECK (type IN ('cell','prayer','study','mentoring','team')),
  cover_url   TEXT,
  is_private  BOOLEAN NOT NULL DEFAULT true,
  max_members INTEGER DEFAULT 20,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "groups_public_read" ON public.groups;
DROP POLICY IF EXISTS "groups_member_read" ON public.groups;
DROP POLICY IF EXISTS "groups_admin_write" ON public.groups;
CREATE POLICY "groups_public_read" ON public.groups FOR SELECT USING (is_private = false);
CREATE POLICY "groups_member_read" ON public.groups FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = groups.id AND user_id = auth.uid())
);
CREATE POLICY "groups_admin_write" ON public.groups FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','leader'))
);

CREATE TABLE IF NOT EXISTS public.group_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id  UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      TEXT DEFAULT 'member' CHECK (role IN ('member','leader','admin')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user  ON public.group_members(user_id);
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_members_select" ON public.group_members;
DROP POLICY IF EXISTS "group_members_admin"  ON public.group_members;
CREATE POLICY "group_members_select" ON public.group_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "group_members_admin"  ON public.group_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','leader'))
);

-- =====================================================================
-- 13. SALLE DE CLASSE — LECONS & PROGRESSION
--     (table courses existe deja)
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
DROP POLICY IF EXISTS "lessons_admin_write" ON public.course_lessons;
CREATE POLICY "lessons_public_read" ON public.course_lessons FOR SELECT USING (
  is_free = true OR
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND is_premium = true)
);
CREATE POLICY "lessons_admin_write" ON public.course_lessons FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE TABLE IF NOT EXISTS public.user_course_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id    UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id    UUID REFERENCES public.course_lessons(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_course_progress_user ON public.user_course_progress(user_id, course_id);
ALTER TABLE public.user_course_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "course_progress_own" ON public.user_course_progress;
CREATE POLICY "course_progress_own" ON public.user_course_progress FOR ALL USING (auth.uid() = user_id);

-- =====================================================================
-- 14. CONTACT — NOUVELLE TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name  TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 2000),
  is_read    BOOLEAN NOT NULL DEFAULT false,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_contact_created ON public.contact_messages(created_at DESC); EXCEPTION WHEN undefined_column THEN NULL; WHEN duplicate_table THEN NULL; WHEN others THEN NULL; END $$;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_insert_all" ON public.contact_messages;
DROP POLICY IF EXISTS "contact_own_select" ON public.contact_messages;
DROP POLICY IF EXISTS "contact_admin_all"  ON public.contact_messages;
CREATE POLICY "contact_insert_all" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "contact_own_select" ON public.contact_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "contact_admin_all"  ON public.contact_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- =====================================================================
-- 15. NOTIFICATIONS — TRIGGERS
--     NOTE: prayer_request (sans 's') = nom reel de la table
-- =====================================================================

CREATE OR REPLACE FUNCTION public.insert_notification(
  p_user_id UUID, p_type TEXT, p_title TEXT,
  p_body TEXT DEFAULT NULL, p_link_url TEXT DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link_url)
  VALUES (p_user_id, p_type, p_title, p_body, p_link_url);
END; $$;

CREATE OR REPLACE FUNCTION public.notify_on_post_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_author UUID;
BEGIN
  SELECT user_id INTO v_author FROM public.posts WHERE id = NEW.post_id;
  IF v_author IS NOT NULL AND v_author <> NEW.user_id THEN
    PERFORM public.insert_notification(v_author, 'like', 'Quelqu''un a aime votre publication', NULL, '/community');
  END IF; RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_post_like ON public.post_likes;
CREATE TRIGGER trg_notify_post_like
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_like();

CREATE OR REPLACE FUNCTION public.notify_on_post_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_author UUID;
BEGIN
  SELECT user_id INTO v_author FROM public.posts WHERE id = NEW.post_id;
  IF v_author IS NOT NULL AND v_author <> NEW.user_id THEN
    PERFORM public.insert_notification(v_author, 'comment', 'Nouveau commentaire sur votre publication', NULL, '/community');
  END IF; RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_post_comment ON public.post_comments;
CREATE TRIGGER trg_notify_post_comment
  AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_comment();

CREATE OR REPLACE FUNCTION public.notify_on_intercession()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_author UUID;
BEGIN
  SELECT user_id INTO v_author FROM public.prayer_request WHERE id = NEW.prayer_id;
  IF v_author IS NOT NULL AND v_author <> NEW.user_id THEN
    PERFORM public.insert_notification(v_author, 'intercession', 'Quelqu''un prie pour vous', NULL, '/prayer');
  END IF; RETURN NEW;
E
