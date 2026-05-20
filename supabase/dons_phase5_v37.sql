-- =====================================================================
-- CCB DONS PHASE 5 v37 — Colonnes paiement provider (PayPal / Notch Pay)
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

ALTER TABLE public.donations_records
  ADD COLUMN IF NOT EXISTS payment_provider TEXT
    CHECK (payment_provider IN ('paypal','notchpay','manual') OR payment_provider IS NULL),
  ADD COLUMN IF NOT EXISTS provider_ref     TEXT,    -- ID de transaction côté provider (PayPal order id, Notch Pay tx id)
  ADD COLUMN IF NOT EXISTS provider_status  TEXT,    -- état brut renvoyé par le provider
  ADD COLUMN IF NOT EXISTS provider_payload JSONB;   -- payload complet pour audit (webhook raw)

CREATE INDEX IF NOT EXISTS idx_dons_records_provider_ref
  ON public.donations_records(provider_ref) WHERE provider_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dons_records_provider
  ON public.donations_records(payment_provider, provider_status);


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Dons Phase 5 v37
-- =====================================================================
