-- =====================================================================
-- CCB INSTITUT BERAKAH PHASE 1 v24 — hiérarchie 5 niveaux + progression
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================
-- Hiérarchie : Categories → Subcategories → Courses → Modules → Lessons

-- ─── 1) Categories ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.institut_categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  description  TEXT,
  icon         TEXT,                          -- emoji ou nom d'icône
  cover_url    TEXT,
  order_index  INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_institut_categories_order
  ON public.institut_categories(order_index, name);


-- ─── 2) Subcategories ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.institut_subcategories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  UUID NOT NULL REFERENCES public.institut_categories(id) ON DELETE CASCADE,
  slug         TEXT NOT NULL,
  name         TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  description  TEXT,
  icon         TEXT,
  order_index  INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_institut_subcat_cat
  ON public.institut_subcategories(category_id, order_index);


-- ─── 3) Courses (formations) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.institut_courses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id    UUID NOT NULL REFERENCES public.institut_categories(id) ON DELETE RESTRICT,
  subcategory_id UUID REFERENCES public.institut_subcategories(id) ON DELETE SET NULL,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  subtitle       TEXT,
  description    TEXT,
  thumbnail_url  TEXT,
  trailer_url    TEXT,                                 -- vidéo intro YouTube/Vimeo
  level          TEXT DEFAULT 'beginner'
    CHECK (level IN ('beginner','intermediate','advanced')),
  duration_mins  INT,                                  -- durée totale estimée
  instructor     TEXT,                                 -- nom du formateur
  is_published   BOOLEAN NOT NULL DEFAULT FALSE,
  is_premium     BOOLEAN NOT NULL DEFAULT FALSE,
  order_index    INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_institut_courses_cat
  ON public.institut_courses(category_id, order_index);
CREATE INDEX IF NOT EXISTS idx_institut_courses_subcat
  ON public.institut_courses(subcategory_id, order_index);
CREATE INDEX IF NOT EXISTS idx_institut_courses_published
  ON public.institut_courses(is_published, created_at DESC);


-- ─── 4) Modules ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.institut_modules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES public.institut_courses(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_institut_modules_course
  ON public.institut_modules(course_id, order_index);


-- ─── 5) Lessons ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.institut_lessons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id    UUID NOT NULL REFERENCES public.institut_modules(id) ON DELETE CASCADE,
  course_id    UUID NOT NULL REFERENCES public.institut_courses(id) ON DELETE CASCADE,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  description  TEXT,
  content_md   TEXT,                                   -- contenu markdown
  video_url    TEXT,                                   -- YouTube / Vimeo / mp4
  audio_url    TEXT,
  pdf_url      TEXT,
  duration_secs INT,
  order_index  INT NOT NULL DEFAULT 0,
  is_premium   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_institut_lessons_module
  ON public.institut_lessons(module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_institut_lessons_course
  ON public.institut_lessons(course_id);


-- ─── 6) User progress par leçon ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.institut_user_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id     UUID NOT NULL REFERENCES public.institut_lessons(id) ON DELETE CASCADE,
  course_id     UUID NOT NULL REFERENCES public.institut_courses(id) ON DELETE CASCADE,
  is_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  watched_secs  INT NOT NULL DEFAULT 0,
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_institut_progress_user
  ON public.institut_user_progress(user_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_institut_progress_course
  ON public.institut_user_progress(user_id, course_id);


-- =====================================================================
-- RLS — lecture publique, écriture moderator+
-- =====================================================================

ALTER TABLE public.institut_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS institut_cat_read_all ON public.institut_categories;
CREATE POLICY institut_cat_read_all ON public.institut_categories
  FOR SELECT USING (is_published = true OR public.is_moderator_or_above());
DROP POLICY IF EXISTS institut_cat_write_admin ON public.institut_categories;
CREATE POLICY institut_cat_write_admin ON public.institut_categories
  FOR ALL USING (public.is_moderator_or_above())
  WITH CHECK (public.is_moderator_or_above());

ALTER TABLE public.institut_subcategories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS institut_subcat_read_all ON public.institut_subcategories;
CREATE POLICY institut_subcat_read_all ON public.institut_subcategories
  FOR SELECT USING (is_published = true OR public.is_moderator_or_above());
DROP POLICY IF EXISTS institut_subcat_write_admin ON public.institut_subcategories;
CREATE POLICY institut_subcat_write_admin ON public.institut_subcategories
  FOR ALL USING (public.is_moderator_or_above())
  WITH CHECK (public.is_moderator_or_above());

ALTER TABLE public.institut_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS institut_courses_read ON public.institut_courses;
CREATE POLICY institut_courses_read ON public.institut_courses
  FOR SELECT USING (is_published = true OR public.is_moderator_or_above());
DROP POLICY IF EXISTS institut_courses_write_admin ON public.institut_courses;
CREATE POLICY institut_courses_write_admin ON public.institut_courses
  FOR ALL USING (public.is_moderator_or_above())
  WITH CHECK (public.is_moderator_or_above());

ALTER TABLE public.institut_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS institut_modules_read ON public.institut_modules;
CREATE POLICY institut_modules_read ON public.institut_modules
  FOR SELECT USING (true);
DROP POLICY IF EXISTS institut_modules_write_admin ON public.institut_modules;
CREATE POLICY institut_modules_write_admin ON public.institut_modules
  FOR ALL USING (public.is_moderator_or_above())
  WITH CHECK (public.is_moderator_or_above());

ALTER TABLE public.institut_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS institut_lessons_read ON public.institut_lessons;
CREATE POLICY institut_lessons_read ON public.institut_lessons
  FOR SELECT USING (true);
DROP POLICY IF EXISTS institut_lessons_write_admin ON public.institut_lessons;
CREATE POLICY institut_lessons_write_admin ON public.institut_lessons
  FOR ALL USING (public.is_moderator_or_above())
  WITH CHECK (public.is_moderator_or_above());

ALTER TABLE public.institut_user_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS institut_progress_read_own ON public.institut_user_progress;
CREATE POLICY institut_progress_read_own ON public.institut_user_progress
  FOR SELECT USING (auth.uid() = user_id OR public.is_moderator_or_above());
DROP POLICY IF EXISTS institut_progress_insert_own ON public.institut_user_progress;
CREATE POLICY institut_progress_insert_own ON public.institut_user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS institut_progress_update_own ON public.institut_user_progress;
CREATE POLICY institut_progress_update_own ON public.institut_user_progress
  FOR UPDATE USING (auth.uid() = user_id);


-- =====================================================================
-- Seed initial : 3 catégories d'exemple (idempotent)
-- =====================================================================
INSERT INTO public.institut_categories (slug, name, description, icon, order_index)
SELECT * FROM (VALUES
  ('fondations-chretiennes', 'Fondations Chrétiennes', 'Les bases de la foi chrétienne', '✝️', 1),
  ('leadership',             'Leadership',             'Devenir un leader serviteur',    '👑', 2),
  ('vie-spirituelle',        'Vie Spirituelle',        'Approfondir sa marche avec Dieu', '🕊️', 3)
) AS v(slug, name, description, icon, order_index)
WHERE NOT EXISTS (
  SELECT 1 FROM public.institut_categories ic WHERE ic.slug = v.slug
);


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Institut Berakah Phase 1 v24
-- =====================================================================
