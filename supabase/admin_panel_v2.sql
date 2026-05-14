-- =====================================================================
-- CCB ADMIN PANEL v2 — Migration
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. user_profiles : is_disabled (soft delete) + last_sign_in_at
-- ---------------------------------------------------------------------

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen
  ON public.user_profiles(last_seen_at DESC NULLS LAST);

-- ---------------------------------------------------------------------
-- 2. Sync auth.users.last_sign_in_at → user_profiles.last_sign_in_at
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_last_sign_in()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.user_profiles
       SET last_sign_in_at = NEW.last_sign_in_at
     WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_last_sign_in ON auth.users;
CREATE TRIGGER trg_sync_last_sign_in
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_last_sign_in();

-- Backfill historique : copie l'existant
UPDATE public.user_profiles up
   SET last_sign_in_at = u.last_sign_in_at
  FROM auth.users u
 WHERE up.user_id = u.id
   AND up.last_sign_in_at IS NULL
   AND u.last_sign_in_at IS NOT NULL;

-- ---------------------------------------------------------------------
-- 3. RPC : heartbeat (last_seen_at update)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_profiles
     SET last_seen_at = NOW()
   WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;

-- ---------------------------------------------------------------------
-- 4. RLS : bloque les utilisateurs désactivés
-- ---------------------------------------------------------------------

-- Helper : utilisateur courant désactivé ?
CREATE OR REPLACE FUNCTION public.is_disabled()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
     WHERE user_id = auth.uid()
       AND is_disabled = true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_disabled() TO authenticated;

-- ---------------------------------------------------------------------
-- 5. Static CMS tables (a-propos / dons / jesus-daily / nous-suivre / live config)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.site_content (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key    TEXT NOT NULL UNIQUE,  -- 'a-propos', 'dons', 'jesus-daily', 'nous-suivre', 'live-config'
  title       TEXT,
  body_md     TEXT,                   -- contenu markdown
  data_json   JSONB,                  -- structure libre (links, items…)
  updated_by  UUID REFERENCES auth.users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_content_public_read ON public.site_content;
CREATE POLICY site_content_public_read ON public.site_content
  FOR SELECT USING (true);

DROP POLICY IF EXISTS site_content_admin_write ON public.site_content;
CREATE POLICY site_content_admin_write ON public.site_content
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','leader'))
  );

-- Seed des pages connues (idempotent)
INSERT INTO public.site_content (page_key, title, body_md, data_json)
VALUES
  ('a-propos',     'À propos du CCB',         NULL, '{}'::jsonb),
  ('dons',         'Soutenir le ministère',   NULL, '{}'::jsonb),
  ('jesus-daily',  'Jesus Daily',             NULL, '{}'::jsonb),
  ('nous-suivre',  'Nous suivre',             NULL, '{"links":[]}'::jsonb)
ON CONFLICT (page_key) DO NOTHING;

-- ---------------------------------------------------------------------
-- 6. Index utiles pour l'admin
-- ---------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_profiles_disabled  ON public.user_profiles(is_disabled);
CREATE INDEX IF NOT EXISTS idx_profiles_last_sign ON public.user_profiles(last_sign_in_at DESC NULLS LAST);

-- =====================================================================
-- FIN
-- =====================================================================
