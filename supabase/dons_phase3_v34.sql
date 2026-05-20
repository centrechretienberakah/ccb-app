-- =====================================================================
-- CCB DONS PHASE 3 v34 — Records + workflow intention/confirmation + analytics
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- ─── Table : records de dons (intentions + confirmations) ────────────
CREATE TABLE IF NOT EXISTS public.donations_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  campaign_id     UUID REFERENCES public.donations_campaigns(id) ON DELETE SET NULL,
  kind            TEXT NOT NULL DEFAULT 'offering'
                    CHECK (kind IN ('tithe','offering','missions','project','social')),
  -- Montants
  amount_native   NUMERIC(14,2) NOT NULL CHECK (amount_native > 0),
  currency        TEXT NOT NULL CHECK (currency IN ('XAF','EUR','USD','CDF')),
  amount_xaf      BIGINT NOT NULL CHECK (amount_xaf >= 0),
  -- Workflow
  payment_mode    TEXT,                                   -- ex: "mtn-momo", "iban-be", "paypal"
  reference       TEXT,                                   -- référence à mentionner au virement
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','cancelled')),
  -- Informations donateur (si non connecté ou pour reçu)
  donor_name      TEXT,
  donor_email     TEXT,
  is_anonymous    BOOLEAN NOT NULL DEFAULT FALSE,
  notes           TEXT,
  -- Dates
  paid_at         TIMESTAMPTZ,                            -- date effective du paiement
  confirmed_at    TIMESTAMPTZ,                            -- quand on a marqué confirmed
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dons_records_user
  ON public.donations_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dons_records_campaign
  ON public.donations_records(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_dons_records_status
  ON public.donations_records(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dons_records_paid_at
  ON public.donations_records(paid_at DESC) WHERE status = 'confirmed';

DROP TRIGGER IF EXISTS trg_dons_records_updated_at ON public.donations_records;
CREATE TRIGGER trg_dons_records_updated_at
  BEFORE UPDATE ON public.donations_records
  FOR EACH ROW EXECUTE FUNCTION public.dons_touch_updated_at();


-- =====================================================================
-- TRIGGER : sync automatique des compteurs campagne quand confirmed
-- =====================================================================
CREATE OR REPLACE FUNCTION public.dons_sync_campaign_counters()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Helper inline pour recalculer une campagne à partir des records confirmed
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
    -- Old campaign (UPDATE / DELETE)
    IF TG_OP IN ('UPDATE','DELETE') AND OLD.campaign_id IS NOT NULL THEN
      UPDATE public.donations_campaigns dc SET
        current_amount_xaf = COALESCE((
          SELECT SUM(amount_xaf) FROM public.donations_records
          WHERE campaign_id = OLD.campaign_id AND status = 'confirmed'
        ), 0),
        donors_count = COALESCE((
          SELECT COUNT(DISTINCT COALESCE(user_id::TEXT, donor_email, id::TEXT))
          FROM public.donations_records
          WHERE campaign_id = OLD.campaign_id AND status = 'confirmed'
        ), 0)
      WHERE dc.id = OLD.campaign_id;
    END IF;
    -- New campaign (INSERT / UPDATE)
    IF TG_OP IN ('INSERT','UPDATE') AND NEW.campaign_id IS NOT NULL
       AND (TG_OP = 'INSERT' OR NEW.campaign_id IS DISTINCT FROM OLD.campaign_id
            OR NEW.status IS DISTINCT FROM OLD.status
            OR NEW.amount_xaf IS DISTINCT FROM OLD.amount_xaf) THEN
      UPDATE public.donations_campaigns dc SET
        current_amount_xaf = COALESCE((
          SELECT SUM(amount_xaf) FROM public.donations_records
          WHERE campaign_id = NEW.campaign_id AND status = 'confirmed'
        ), 0),
        donors_count = COALESCE((
          SELECT COUNT(DISTINCT COALESCE(user_id::TEXT, donor_email, id::TEXT))
          FROM public.donations_records
          WHERE campaign_id = NEW.campaign_id AND status = 'confirmed'
        ), 0)
      WHERE dc.id = NEW.campaign_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_dons_records_sync ON public.donations_records;
CREATE TRIGGER trg_dons_records_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.donations_records
  FOR EACH ROW EXECUTE FUNCTION public.dons_sync_campaign_counters();

-- Trigger pour set confirmed_at / cancelled_at automatiquement
CREATE OR REPLACE FUNCTION public.dons_set_status_dates()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
    NEW.confirmed_at := COALESCE(NEW.confirmed_at, NOW());
    NEW.paid_at := COALESCE(NEW.paid_at, NOW());
  END IF;
  IF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') THEN
    NEW.cancelled_at := COALESCE(NEW.cancelled_at, NOW());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dons_records_status_dates ON public.donations_records;
CREATE TRIGGER trg_dons_records_status_dates
  BEFORE UPDATE ON public.donations_records
  FOR EACH ROW EXECUTE FUNCTION public.dons_set_status_dates();


-- =====================================================================
-- RLS
-- =====================================================================
ALTER TABLE public.donations_records ENABLE ROW LEVEL SECURITY;

-- Lecture : user voit ses propres records, admin voit tout
DROP POLICY IF EXISTS dons_records_read_own ON public.donations_records;
CREATE POLICY dons_records_read_own ON public.donations_records
  FOR SELECT USING (
    auth.uid() = user_id OR public.is_moderator_or_above()
  );

-- Insert : user authentifié peut créer un record pour lui-même (pending)
DROP POLICY IF EXISTS dons_records_insert_own ON public.donations_records;
CREATE POLICY dons_records_insert_own ON public.donations_records
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id AND status = 'pending')
    OR public.is_moderator_or_above()
  );

-- Update : user peut annuler son pending ; admin peut tout
DROP POLICY IF EXISTS dons_records_update_own ON public.donations_records;
CREATE POLICY dons_records_update_own ON public.donations_records
  FOR UPDATE USING (
    (auth.uid() = user_id AND status = 'pending')
    OR public.is_moderator_or_above()
  );

-- Delete : admin uniquement
DROP POLICY IF EXISTS dons_records_delete_admin ON public.donations_records;
CREATE POLICY dons_records_delete_admin ON public.donations_records
  FOR DELETE USING (public.is_moderator_or_above());


-- =====================================================================
-- VUES ANALYTICS
-- =====================================================================

-- KPIs globaux
CREATE OR REPLACE VIEW public.donations_global_kpis AS
SELECT
  (SELECT COUNT(*) FROM public.donations_records WHERE status = 'confirmed')::INT          AS confirmed_count,
  (SELECT COALESCE(SUM(amount_xaf), 0) FROM public.donations_records WHERE status = 'confirmed')::BIGINT AS total_xaf_confirmed,
  (SELECT COUNT(*) FROM public.donations_records WHERE status = 'pending')::INT            AS pending_count,
  (SELECT COALESCE(SUM(amount_xaf), 0) FROM public.donations_records WHERE status = 'pending')::BIGINT  AS total_xaf_pending,
  (SELECT COUNT(DISTINCT COALESCE(user_id::TEXT, donor_email))
     FROM public.donations_records WHERE status = 'confirmed')::INT                        AS unique_donors,
  (SELECT COUNT(*) FROM public.donations_campaigns WHERE is_active = true)::INT            AS active_campaigns,
  (SELECT COALESCE(AVG(amount_xaf), 0)::BIGINT
     FROM public.donations_records WHERE status = 'confirmed')                             AS avg_xaf_per_donation;

GRANT SELECT ON public.donations_global_kpis TO authenticated, service_role;


-- Évolution mensuelle sur les 12 derniers mois
CREATE OR REPLACE VIEW public.donations_monthly_12m AS
WITH months AS (
  SELECT date_trunc('month', NOW() - (n || ' months')::INTERVAL)::DATE AS month
  FROM generate_series(0, 11) AS n
),
agg AS (
  SELECT
    date_trunc('month', COALESCE(paid_at, confirmed_at, created_at))::DATE AS month,
    COUNT(*)::INT                          AS donations_count,
    COALESCE(SUM(amount_xaf), 0)::BIGINT   AS total_xaf,
    COUNT(DISTINCT COALESCE(user_id::TEXT, donor_email))::INT AS unique_donors
  FROM public.donations_records
  WHERE status = 'confirmed'
    AND COALESCE(paid_at, confirmed_at, created_at) >= NOW() - INTERVAL '12 months'
  GROUP BY date_trunc('month', COALESCE(paid_at, confirmed_at, created_at))::DATE
)
SELECT m.month,
       COALESCE(a.donations_count, 0) AS donations_count,
       COALESCE(a.total_xaf, 0)       AS total_xaf,
       COALESCE(a.unique_donors, 0)   AS unique_donors
FROM months m
LEFT JOIN agg a USING (month)
ORDER BY m.month ASC;

GRANT SELECT ON public.donations_monthly_12m TO authenticated, service_role;


-- Répartition par type de don (kind)
CREATE OR REPLACE VIEW public.donations_by_kind AS
SELECT
  kind,
  COUNT(*)::INT                          AS count,
  COALESCE(SUM(amount_xaf), 0)::BIGINT   AS total_xaf
FROM public.donations_records
WHERE status = 'confirmed'
GROUP BY kind
ORDER BY total_xaf DESC;

GRANT SELECT ON public.donations_by_kind TO authenticated, service_role;


-- Top donateurs (anonymisable côté UI : on n'expose pas le nom direct)
CREATE OR REPLACE VIEW public.donations_top_donors AS
SELECT
  COALESCE(user_id::TEXT, donor_email, 'anonyme')               AS donor_key,
  bool_or(is_anonymous)                                          AS is_anonymous,
  MAX(donor_name)                                                AS donor_name,
  COUNT(*)::INT                                                  AS donations_count,
  COALESCE(SUM(amount_xaf), 0)::BIGINT                           AS total_xaf,
  MAX(COALESCE(paid_at, confirmed_at, created_at))               AS last_donation_at
FROM public.donations_records
WHERE status = 'confirmed'
GROUP BY COALESCE(user_id::TEXT, donor_email, 'anonyme')
ORDER BY total_xaf DESC
LIMIT 50;

GRANT SELECT ON public.donations_top_donors TO authenticated, service_role;


-- Conversion par campagne
CREATE OR REPLACE VIEW public.donations_campaign_stats AS
SELECT
  c.id              AS campaign_id,
  c.slug,
  c.title,
  c.kind,
  c.target_amount_xaf,
  c.current_amount_xaf,
  CASE WHEN c.target_amount_xaf > 0
       THEN ROUND(100.0 * c.current_amount_xaf / c.target_amount_xaf)::INT
       ELSE 0 END AS progress_pct,
  COALESCE(r.confirmed_count, 0)::INT  AS confirmed_count,
  COALESCE(r.pending_count, 0)::INT    AS pending_count,
  COALESCE(r.pending_xaf, 0)::BIGINT   AS pending_xaf
FROM public.donations_campaigns c
LEFT JOIN (
  SELECT campaign_id,
         COUNT(*) FILTER (WHERE status = 'confirmed')::INT AS confirmed_count,
         COUNT(*) FILTER (WHERE status = 'pending')::INT AS pending_count,
         COALESCE(SUM(amount_xaf) FILTER (WHERE status = 'pending'), 0)::BIGINT AS pending_xaf
  FROM public.donations_records
  GROUP BY campaign_id
) r ON r.campaign_id = c.id
ORDER BY c.is_featured DESC, c.order_index ASC, c.starts_at DESC;

GRANT SELECT ON public.donations_campaign_stats TO authenticated, service_role;


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Dons Phase 3 v34
-- =====================================================================
