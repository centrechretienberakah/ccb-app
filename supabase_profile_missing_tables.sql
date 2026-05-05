-- ─── Tables manquantes pour la page Profil ───────────────────────────────────
-- Exécute ce fichier dans Supabase SQL Editor
-- https://supabase.com/dashboard/project/sqwchzohgdzjinomxcng/sql/new

-- 1. spiritual_milestones (si pas encore créée)
CREATE TABLE IF NOT EXISTS public.spiritual_milestones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone   TEXT NOT NULL,
  achieved_at DATE DEFAULT CURRENT_DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, milestone)
);
ALTER TABLE public.spiritual_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "milestones_select" ON public.spiritual_milestones
  FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "milestones_all" ON public.spiritual_milestones
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. user_reading_progress (pour le streak et les stats lecture)
CREATE TABLE IF NOT EXISTS public.user_reading_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book         TEXT NOT NULL,
  chapter      INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book, chapter)
);
ALTER TABLE public.user_reading_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "reading_progress_own" ON public.user_reading_progress
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. user_saved_verses (pour les versets sauvegardés)
CREATE TABLE IF NOT EXISTS public.user_saved_verses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book        TEXT NOT NULL,
  chapter     INTEGER NOT NULL,
  verse       INTEGER NOT NULL,
  verse_text  TEXT,
  saved_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book, chapter, verse)
);
ALTER TABLE public.user_saved_verses ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "saved_verses_own" ON public.user_saved_verses
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. user_roles (admin, moderateur, membre)
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role    TEXT NOT NULL DEFAULT 'membre'
  -- valeurs : 'admin' | 'moderateur' | 'membre'
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "roles_select_own" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
-- Seuls les admins peuvent modifier les rôles (via le dashboard Supabase directement)

-- ─── Storage bucket avatars ───────────────────────────────────────────────────
-- À créer depuis le dashboard Supabase (une seule fois) :
-- 1. Storage → New Bucket → Nom: avatars → Public: ✅ ON → Create
-- 2. Storage → avatars → Policies → Add policies:
--
-- Policy SELECT (lecture publique pour afficher les avatars) :
--   FOR SELECT — USING: true
--
-- Policy INSERT (upload par le propriétaire) :
--   FOR INSERT — WITH CHECK: auth.uid()::text = (storage.foldername(name))[1]
--
-- Policy UPDATE (remplacement par le propriétaire) :
--   FOR UPDATE — USING: auth.uid()::text = (storage.foldername(name))[1]
