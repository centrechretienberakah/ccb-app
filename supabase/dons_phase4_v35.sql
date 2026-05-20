-- =====================================================================
-- CCB DONS PHASE 4 v35 — N° de reçu auto + (helpers déclaration fiscale)
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- ─── Colonne receipt_number ──────────────────────────────────────────
ALTER TABLE public.donations_records
  ADD COLUMN IF NOT EXISTS receipt_number TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_dons_records_receipt
  ON public.donations_records(receipt_number) WHERE receipt_number IS NOT NULL;


-- ─── Sequence dédiée ─────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.dons_receipt_seq START 1;


-- ─── Trigger : génère receipt_number quand status devient confirmed ─
CREATE OR REPLACE FUNCTION public.dons_set_receipt_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_year INT;
  v_seq  BIGINT;
BEGIN
  IF NEW.status = 'confirmed'
     AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'confirmed')
     AND NEW.receipt_number IS NULL THEN
    v_year := EXTRACT(YEAR FROM COALESCE(NEW.paid_at, NEW.confirmed_at, NOW()));
    v_seq  := nextval('public.dons_receipt_seq');
    NEW.receipt_number := 'CCB-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- IMPORTANT : ce trigger doit s'exécuter AVANT trg_dons_records_status_dates
-- (les deux sont BEFORE UPDATE, l'ordre alphabétique du nom décide → on préfixe "01_")
DROP TRIGGER IF EXISTS "01_trg_dons_records_receipt" ON public.donations_records;
CREATE TRIGGER "01_trg_dons_records_receipt"
  BEFORE INSERT OR UPDATE ON public.donations_records
  FOR EACH ROW EXECUTE FUNCTION public.dons_set_receipt_number();


-- =====================================================================
-- Vue helper : récap annuel par user (utilisée par la déclaration fiscale)
-- =====================================================================
CREATE OR REPLACE VIEW public.donations_yearly_per_user AS
SELECT
  user_id,
  EXTRACT(YEAR FROM COALESCE(paid_at, confirmed_at, created_at))::INT AS year,
  COUNT(*)::INT                                                       AS donations_count,
  COALESCE(SUM(amount_xaf), 0)::BIGINT                                AS total_xaf,
  -- Conversion approximative EUR (656 XAF = 1 EUR)
  ROUND(COALESCE(SUM(amount_xaf), 0)::NUMERIC / 656.0, 2)             AS approx_total_eur
FROM public.donations_records
WHERE status = 'confirmed' AND user_id IS NOT NULL
GROUP BY user_id, EXTRACT(YEAR FROM COALESCE(paid_at, confirmed_at, created_at))
ORDER BY year DESC;

GRANT SELECT ON public.donations_yearly_per_user TO authenticated, service_role;


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Dons Phase 4 v35
-- =====================================================================
