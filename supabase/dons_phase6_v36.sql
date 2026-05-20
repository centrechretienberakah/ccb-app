-- =====================================================================
-- CCB DONS PHASE 6 v36 — Engagement mensuel + dédicace + RPC milestones
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- ─── Colonne dedication sur records ──────────────────────────────────
ALTER TABLE public.donations_records
  ADD COLUMN IF NOT EXISTS dedication TEXT;
  -- ex: "En mémoire de Jean Dupont", "Pour la guérison de Marie"


-- ─── Table : engagements mensuels (récurrents) ───────────────────────
CREATE TABLE IF NOT EXISTS public.donations_recurring (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL DEFAULT 'tithe'
                    CHECK (kind IN ('tithe','offering','missions','project','social')),
  campaign_id     UUID REFERENCES public.donations_campaigns(id) ON DELETE SET NULL,
  amount_native   NUMERIC(14,2) NOT NULL CHECK (amount_native > 0),
  currency        TEXT NOT NULL CHECK (currency IN ('XAF','EUR','USD','CDF')),
  amount_xaf      BIGINT NOT NULL CHECK (amount_xaf >= 0),
  day_of_month    INT NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  preferred_mode  TEXT,                                  -- ex: "mtn-momo"
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_paid_at    TIMESTAMPTZ,                           -- dernier paiement effectif
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dons_recurring_user
  ON public.donations_recurring(user_id, is_active);

DROP TRIGGER IF EXISTS trg_dons_recurring_updated_at ON public.donations_recurring;
CREATE TRIGGER trg_dons_recurring_updated_at
  BEFORE UPDATE ON public.donations_recurring
  FOR EACH ROW EXECUTE FUNCTION public.dons_touch_updated_at();


-- =====================================================================
-- RLS engagements
-- =====================================================================
ALTER TABLE public.donations_recurring ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dons_recurring_read_own ON public.donations_recurring;
CREATE POLICY dons_recurring_read_own ON public.donations_recurring
  FOR SELECT USING (auth.uid() = user_id OR public.is_moderator_or_above());

DROP POLICY IF EXISTS dons_recurring_insert_own ON public.donations_recurring;
CREATE POLICY dons_recurring_insert_own ON public.donations_recurring
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS dons_recurring_update_own ON public.donations_recurring;
CREATE POLICY dons_recurring_update_own ON public.donations_recurring
  FOR UPDATE USING (auth.uid() = user_id OR public.is_moderator_or_above())
  WITH CHECK (auth.uid() = user_id OR public.is_moderator_or_above());

DROP POLICY IF EXISTS dons_recurring_delete_own ON public.donations_recurring;
CREATE POLICY dons_recurring_delete_own ON public.donations_recurring
  FOR DELETE USING (auth.uid() = user_id OR public.is_moderator_or_above());


-- =====================================================================
-- RPC : crée un don pending depuis un engagement (button "Don du mois")
-- =====================================================================
CREATE OR REPLACE FUNCTION public.dons_create_record_from_recurring(p_recurring_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_rec     RECORD;
  v_new_id  UUID;
  v_ref     TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT * INTO v_rec
  FROM public.donations_recurring
  WHERE id = p_recurring_id AND user_id = v_user_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Engagement introuvable ou inactif';
  END IF;

  v_ref := 'Don récurrent ' || v_rec.kind || ' — '
           || v_rec.amount_native::TEXT || ' ' || v_rec.currency
           || ' — ' || to_char(NOW(), 'YYYY-MM');

  INSERT INTO public.donations_records (
    user_id, campaign_id, kind, amount_native, currency, amount_xaf,
    payment_mode, reference, status, notes
  )
  VALUES (
    v_user_id, v_rec.campaign_id, v_rec.kind,
    v_rec.amount_native, v_rec.currency, v_rec.amount_xaf,
    v_rec.preferred_mode, v_ref, 'pending',
    'Engagement mensuel #' || p_recurring_id::TEXT
  )
  RETURNING id INTO v_new_id;

  -- Met à jour last_paid_at sur l'engagement (intention enregistrée ce mois-ci)
  UPDATE public.donations_recurring
  SET last_paid_at = NOW() WHERE id = p_recurring_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dons_create_record_from_recurring(UUID) TO authenticated;


-- =====================================================================
-- RPC : check la progression d'une campagne (pour milestones)
-- Retourne le palier franchi (25/50/75/100) ou NULL
-- =====================================================================
CREATE OR REPLACE FUNCTION public.dons_check_milestone(
  p_campaign_id UUID,
  p_previous_xaf BIGINT
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target BIGINT;
  v_current BIGINT;
  v_old_pct INT;
  v_new_pct INT;
  v_milestone INT;
BEGIN
  SELECT target_amount_xaf, current_amount_xaf
  INTO v_target, v_current
  FROM public.donations_campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND OR v_target IS NULL OR v_target = 0 THEN RETURN NULL; END IF;

  v_old_pct := FLOOR(100.0 * p_previous_xaf / v_target);
  v_new_pct := FLOOR(100.0 * v_current / v_target);

  -- Retourne le plus haut palier franchi : 25 / 50 / 75 / 100
  FOR v_milestone IN SELECT unnest(ARRAY[100, 75, 50, 25]) LOOP
    IF v_old_pct < v_milestone AND v_new_pct >= v_milestone THEN
      RETURN v_milestone;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dons_check_milestone(UUID, BIGINT) TO authenticated;


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Dons Phase 6 v36
-- =====================================================================
