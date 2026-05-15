-- =====================================================================
-- CCB PUSH NOTIFICATIONS v7
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Table push_subscriptions
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_enabled ON public.push_subscriptions(enabled);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies : un user voit/gère ses propres subscriptions, admins voient tout
DROP POLICY IF EXISTS push_sub_select_own ON public.push_subscriptions;
CREATE POLICY push_sub_select_own ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin_or_above());

DROP POLICY IF EXISTS push_sub_insert_own ON public.push_subscriptions;
CREATE POLICY push_sub_insert_own ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS push_sub_update_own ON public.push_subscriptions;
CREATE POLICY push_sub_update_own ON public.push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin_or_above())
  WITH CHECK (auth.uid() = user_id OR public.is_admin_or_above());

DROP POLICY IF EXISTS push_sub_delete_own ON public.push_subscriptions;
CREATE POLICY push_sub_delete_own ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin_or_above());

-- ---------------------------------------------------------------------
-- 2. Trigger : nettoie les subscriptions invalides après un certain temps
-- ---------------------------------------------------------------------

COMMENT ON TABLE public.push_subscriptions IS
  'Subscriptions Web Push. Un user peut avoir plusieurs (1 par device/browser). '
  'Le champ endpoint est unique. Désactivé via enabled=false en cas d''échec d''envoi.';

-- =====================================================================
-- FIN
-- =====================================================================
