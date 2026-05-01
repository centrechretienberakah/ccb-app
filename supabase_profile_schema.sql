-- ─── Étape 14 : Profil membre + Communauté ───────────────────────────────────
-- Exécute ce fichier dans Supabase SQL Editor
-- https://supabase.com/dashboard/project/sqwchzohgdzjinomxcng/sql/new

-- 1. Table user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url   TEXT,
  bio          TEXT,
  testimony    TEXT,
  cell_group   TEXT,
  is_public    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table spiritual_milestones
CREATE TABLE IF NOT EXISTS public.spiritual_milestones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone    TEXT NOT NULL,
  -- valeurs : 'baptism' | 'consecration' | 'cell_group' | 'ministry'
  achieved_at  DATE DEFAULT CURRENT_DATE,
  notes        TEXT,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, milestone)
);

-- 3. RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spiritual_milestones ENABLE ROW LEVEL SECURITY;

-- Profils : visible par tous les membres connectés si is_public = true
CREATE POLICY "profiles_select" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "profiles_insert" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_update" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Jalons : lecture par tous membres authentifiés, écriture par le propriétaire
CREATE POLICY "milestones_select" ON public.spiritual_milestones
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "milestones_all" ON public.spiritual_milestones
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Trigger updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.user_profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Storage bucket avatars ───────────────────────────────────────────────────
-- À créer depuis le dashboard Supabase :
-- Storage → New Bucket → Nom: avatars → Public: ✅ ON → Create
-- Puis ajouter ces policies RLS sur le bucket :

-- Policy 1 : lecture publique (pour afficher les avatars)
-- (dans le dashboard : Storage → avatars → Policies → New Policy → For SELECT)
-- USING: true

-- Policy 2 : upload par le propriétaire
-- (dans le dashboard : Storage → avatars → Policies → New Policy → For INSERT)
-- WITH CHECK: auth.uid()::text = (storage.foldername(name))[1]

-- Policy 3 : mise à jour par le propriétaire
-- (dans le dashboard : Storage → avatars → Policies → New Policy → For UPDATE)
-- USING: auth.uid()::text = (storage.foldername(name))[1]
