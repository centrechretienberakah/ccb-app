-- =====================================================================
-- CCB — PRIÈRE DU JOUR (daily_prayers) v51
--
-- Réplique le modèle de la méditation du jour (table devotions) pour
-- "Prions Ensemble" : une prière auto-publiée chaque jour à 00:00 Paris.
--
-- 2 tables :
--   - daily_prayers           : 1 prière par jour (contenu)
--   - daily_prayer_intercessions : qui a prié cette prière (compteur)
--
-- N'AFFECTE PAS prayer_requests (le mur de prière communautaire reste
-- 100% inchangé). C'est un module additionnel, comme devotions l'est
-- pour les méditations.
--
-- Idempotent. À exécuter dans Supabase SQL Editor.
-- =====================================================================

-- ─── Table daily_prayers ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_prayers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_date     DATE NOT NULL UNIQUE,
  title           TEXT NOT NULL,                 -- thème de la prière
  verse_reference TEXT,
  verse_text      TEXT,
  content         TEXT NOT NULL,                 -- le texte de la prière
  author          TEXT DEFAULT 'Rév. Elvis NGUIFFO',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Colonne `date` (alias de prayer_date) au cas où du code la lirait
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='daily_prayers' AND column_name='date'
  ) THEN
    BEGIN
      EXECUTE 'ALTER TABLE public.daily_prayers ADD COLUMN date DATE GENERATED ALWAYS AS (prayer_date) STORED';
    EXCEPTION WHEN others THEN
      EXECUTE 'ALTER TABLE public.daily_prayers ADD COLUMN IF NOT EXISTS date DATE';
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_daily_prayers_date ON public.daily_prayers(prayer_date DESC);

ALTER TABLE public.daily_prayers ENABLE ROW LEVEL SECURITY;

-- Lecture publique (comme les méditations)
DROP POLICY IF EXISTS daily_prayers_public_read ON public.daily_prayers;
CREATE POLICY daily_prayers_public_read ON public.daily_prayers
  FOR SELECT USING (true);

-- Écriture réservée aux mod+ (le cron passe par service_role qui bypass RLS)
DROP POLICY IF EXISTS daily_prayers_admin_write ON public.daily_prayers;
CREATE POLICY daily_prayers_admin_write ON public.daily_prayers
  FOR ALL USING (public.is_moderator_or_above())
  WITH CHECK (public.is_moderator_or_above());


-- ─── Table daily_prayer_intercessions ("J'ai prié") ─────────────────
CREATE TABLE IF NOT EXISTS public.daily_prayer_intercessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_prayer_id  UUID NOT NULL REFERENCES public.daily_prayers(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (daily_prayer_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_prayer_inter_prayer
  ON public.daily_prayer_intercessions(daily_prayer_id);
CREATE INDEX IF NOT EXISTS idx_daily_prayer_inter_user
  ON public.daily_prayer_intercessions(user_id);

ALTER TABLE public.daily_prayer_intercessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_prayer_inter_public_read ON public.daily_prayer_intercessions;
CREATE POLICY daily_prayer_inter_public_read ON public.daily_prayer_intercessions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS daily_prayer_inter_insert_own ON public.daily_prayer_intercessions;
CREATE POLICY daily_prayer_inter_insert_own ON public.daily_prayer_intercessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS daily_prayer_inter_delete_own ON public.daily_prayer_intercessions;
CREATE POLICY daily_prayer_inter_delete_own ON public.daily_prayer_intercessions
  FOR DELETE USING (auth.uid() = user_id OR public.is_moderator_or_above());


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v51 — Prière du jour
-- =====================================================================
