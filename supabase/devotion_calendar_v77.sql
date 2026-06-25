-- =====================================================================
-- CCB — MÉDITONS ENSEMBLE : CALENDRIER ÉDITORIAL  v77
--
--   Remplace la SOURCE des thèmes/versets de la méditation quotidienne :
--   au lieu d'une rotation « semi-aléatoire » (7 textes par jour de
--   semaine), la méditation suit désormais un PROGRAMME prédéfini :
--
--     MOIS (thème + verset principal)
--       └── SEMAINE (sous-thème)
--             └── JOUR (thème + verset du jour)
--
--   L'admin prépare plusieurs mois à l'avance. Le cron quotidien lit le
--   thème + verset du jour et l'IA rédige la méditation au format actuel.
--   Si aucun jour n'est défini pour la date → repli sur la rotation
--   statique existante (rien n'est cassé).
--
--   N'altère AUCUNE table existante (devotions, devotion_progress…).
--
-- Idempotent. À exécuter dans Supabase → SQL Editor. Dépend de v5 (RBAC :
-- fonctions is_moderator_or_above / is_admin_or_above).
-- =====================================================================

-- ─── 1. MOIS : thème mensuel + verset principal ──────────────────────
CREATE TABLE IF NOT EXISTS public.devotion_cal_months (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year       INTEGER NOT NULL,
  month      INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  label      TEXT NOT NULL,            -- ex. « Juillet 2026 »
  theme      TEXT NOT NULL DEFAULT '', -- ex. « Nouveau commencement »
  main_verse TEXT NOT NULL DEFAULT '', -- ex. « Ésaïe 43:18-19 »
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);

-- ─── 2. SEMAINES : sous-thèmes hebdomadaires (4 à 5 par mois) ─────────
CREATE TABLE IF NOT EXISTS public.devotion_cal_weeks (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_id UUID NOT NULL REFERENCES public.devotion_cal_months(id) ON DELETE CASCADE,
  week_no  INTEGER NOT NULL CHECK (week_no BETWEEN 1 AND 6),
  theme    TEXT NOT NULL DEFAULT '',
  UNIQUE (month_id, week_no)
);

-- ─── 3. JOURS : thème + verset du jour (1 par date calendaire) ────────
CREATE TABLE IF NOT EXISTS public.devotion_cal_days (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_id   UUID NOT NULL REFERENCES public.devotion_cal_months(id) ON DELETE CASCADE,
  cal_date   DATE NOT NULL UNIQUE,     -- la date réelle (sert au lookup du cron)
  day_no     INTEGER NOT NULL,         -- jour du mois (1..31)
  week_no    INTEGER NOT NULL DEFAULT 1 CHECK (week_no BETWEEN 1 AND 6),
  day_theme  TEXT NOT NULL DEFAULT '',
  day_verse  TEXT NOT NULL DEFAULT '', -- référence, ex. « Ésaïe 43:18 »
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_devotion_cal_days_month ON public.devotion_cal_days(month_id, day_no);

-- ─── 4. RLS : lecture + gestion réservées aux modérateurs et + ───────
ALTER TABLE public.devotion_cal_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devotion_cal_weeks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devotion_cal_days   ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- months
  DROP POLICY IF EXISTS devotion_cal_months_read  ON public.devotion_cal_months;
  DROP POLICY IF EXISTS devotion_cal_months_admin ON public.devotion_cal_months;
  CREATE POLICY devotion_cal_months_read  ON public.devotion_cal_months
    FOR SELECT USING (public.is_moderator_or_above());
  CREATE POLICY devotion_cal_months_admin ON public.devotion_cal_months
    FOR ALL USING (public.is_moderator_or_above()) WITH CHECK (public.is_moderator_or_above());
  -- weeks
  DROP POLICY IF EXISTS devotion_cal_weeks_read  ON public.devotion_cal_weeks;
  DROP POLICY IF EXISTS devotion_cal_weeks_admin ON public.devotion_cal_weeks;
  CREATE POLICY devotion_cal_weeks_read  ON public.devotion_cal_weeks
    FOR SELECT USING (public.is_moderator_or_above());
  CREATE POLICY devotion_cal_weeks_admin ON public.devotion_cal_weeks
    FOR ALL USING (public.is_moderator_or_above()) WITH CHECK (public.is_moderator_or_above());
  -- days
  DROP POLICY IF EXISTS devotion_cal_days_read  ON public.devotion_cal_days;
  DROP POLICY IF EXISTS devotion_cal_days_admin ON public.devotion_cal_days;
  CREATE POLICY devotion_cal_days_read  ON public.devotion_cal_days
    FOR SELECT USING (public.is_moderator_or_above());
  CREATE POLICY devotion_cal_days_admin ON public.devotion_cal_days
    FOR ALL USING (public.is_moderator_or_above()) WITH CHECK (public.is_moderator_or_above());
END $$;

-- ─── 5. Lookup serveur : la hiérarchie complète pour une date ────────
--   Renvoie une ligne (ou rien) avec mois/semaine/jour. Utilisable par le
--   cron (service_role) et par un éventuel pipeline externe.
CREATE OR REPLACE FUNCTION public.devotion_calendar_for_date(p_date DATE)
RETURNS TABLE(
  month_label TEXT, month_theme TEXT, main_verse TEXT,
  week_no INTEGER, week_theme TEXT,
  day_no INTEGER, day_theme TEXT, day_verse TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.label, m.theme, m.main_verse,
         d.week_no, COALESCE(w.theme, ''),
         d.day_no, d.day_theme, d.day_verse
    FROM public.devotion_cal_days d
    JOIN public.devotion_cal_months m ON m.id = d.month_id
    LEFT JOIN public.devotion_cal_weeks w ON w.month_id = d.month_id AND w.week_no = d.week_no
   WHERE d.cal_date = p_date
     AND btrim(d.day_theme) <> ''
     AND btrim(d.day_verse) <> ''
   LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.devotion_calendar_for_date(DATE) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v77 — Calendrier éditorial « Méditons ensemble »
-- =====================================================================
