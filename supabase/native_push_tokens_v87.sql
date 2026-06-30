-- =====================================================================
-- CCB — PHASE 2 : tokens push NATIFS (FCM, multi-appareils)  v87
--
--   Stocke les jetons Firebase Cloud Messaging des appareils Android (et
--   iOS plus tard), À CÔTÉ des subscriptions web-push existantes (table
--   push_subscriptions, inchangée). Permet d'envoyer les notifications
--   AUSSI en natif quand l'app tourne dans la coquille Capacitor.
--
--   - 1 ligne par (appareil/token). Multi-appareils par user.
--   - Rafraîchissement : ON CONFLICT (token) met à jour user_id + last_seen.
--   - Nettoyage : les tokens invalides sont supprimés par le serveur d'envoi.
--
-- Idempotent. À exécuter dans Supabase → SQL Editor.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.native_push_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  platform     TEXT NOT NULL DEFAULT 'android' CHECK (platform IN ('android','ios')),
  device_info  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_native_push_tokens_user ON public.native_push_tokens(user_id);

ALTER TABLE public.native_push_tokens ENABLE ROW LEVEL SECURITY;

-- L'utilisateur gère SES propres tokens (enregistrement/suppression depuis l'app).
DROP POLICY IF EXISTS native_push_tokens_own ON public.native_push_tokens;
CREATE POLICY native_push_tokens_own ON public.native_push_tokens
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- (Le serveur d'envoi utilise le service_role → bypass RLS pour lire/supprimer.)

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v87 — Tokens push natifs (FCM)
-- =====================================================================
