-- =====================================================================
-- CCB DONS PHASE 2 v33 — Campagnes ciblées avec jauges de progression
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- ─── Table : campagnes de dons ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.donations_campaigns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  subtitle            TEXT,
  description         TEXT,
  cover_url           TEXT,
  kind                TEXT NOT NULL DEFAULT 'project'
                        CHECK (kind IN ('tithe','offering','missions','project','social')),
  -- Montants comptabilisés en XAF (référence unique pour cumul multi-devises)
  target_amount_xaf   BIGINT NOT NULL CHECK (target_amount_xaf > 0),
  current_amount_xaf  BIGINT NOT NULL DEFAULT 0 CHECK (current_amount_xaf >= 0),
  donors_count        INT    NOT NULL DEFAULT 0,
  starts_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at             TIMESTAMPTZ,                          -- NULL = pas de date limite
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured         BOOLEAN NOT NULL DEFAULT FALSE,       -- mise en avant sur /dons
  order_index         INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dons_campaigns_active
  ON public.donations_campaigns(is_active, order_index, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_dons_campaigns_featured
  ON public.donations_campaigns(is_featured) WHERE is_featured = true;


-- ─── Trigger updated_at ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.dons_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dons_campaigns_updated_at ON public.donations_campaigns;
CREATE TRIGGER trg_dons_campaigns_updated_at
  BEFORE UPDATE ON public.donations_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.dons_touch_updated_at();


-- =====================================================================
-- RLS — lecture publique (campagnes actives), écriture moderator+
-- =====================================================================
ALTER TABLE public.donations_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dons_campaigns_read_public ON public.donations_campaigns;
CREATE POLICY dons_campaigns_read_public ON public.donations_campaigns
  FOR SELECT USING (is_active = true OR public.is_moderator_or_above());

DROP POLICY IF EXISTS dons_campaigns_write_admin ON public.donations_campaigns;
CREATE POLICY dons_campaigns_write_admin ON public.donations_campaigns
  FOR ALL USING (public.is_moderator_or_above())
  WITH CHECK (public.is_moderator_or_above());


-- =====================================================================
-- Seed : 2 campagnes d'exemple (idempotent)
-- =====================================================================
INSERT INTO public.donations_campaigns
  (slug, title, subtitle, description, kind, target_amount_xaf, current_amount_xaf, donors_count, is_active, is_featured, order_index)
SELECT * FROM (VALUES
  (
    'construction-temple-douala',
    'Construction du Temple Berakah Douala',
    'Bâtissons ensemble la maison du Seigneur',
    'Le terrain est acquis. Avec ta participation, nous pouvons démarrer les fondations et construire le sanctuaire qui accueillera des milliers d''âmes pour adorer Dieu.',
    'project',
    50000000::BIGINT,   -- 50 millions FCFA
    8500000::BIGINT,    -- déjà collecté
    127,
    true, true, 1
  ),
  (
    'bootcamp-jeunes-2026',
    'Bootcamp Jeunes CCB 2026',
    'Former la prochaine génération de leaders',
    'Sponsoriser la participation de 100 jeunes au Bootcamp de juin 2026 à Douala. Hébergement, restauration et matériel inclus.',
    'missions',
    5000000::BIGINT,    -- 5 millions FCFA
    1750000::BIGINT,
    42,
    true, false, 2
  )
) AS v(slug, title, subtitle, description, kind, target_amount_xaf, current_amount_xaf, donors_count, is_active, is_featured, order_index)
WHERE NOT EXISTS (
  SELECT 1 FROM public.donations_campaigns dc WHERE dc.slug = v.slug
);


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Dons Phase 2 v33
-- =====================================================================
