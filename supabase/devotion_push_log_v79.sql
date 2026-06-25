-- =====================================================================
-- CCB — MÉDITONS ENSEMBLE : journal anti-doublon des notifs push  v79
--
--   La notif « méditation du jour » est envoyée à CHAQUE membre à SON
--   minuit local (endpoint /api/devotion/notify déclenché chaque heure).
--   Ce journal garantit qu'un membre n'est notifié qu'UNE fois par date
--   locale (idempotence, même si l'endpoint est appelé plusieurs fois).
--
--   Accès : service_role uniquement (le cron). RLS activée sans policy →
--   aucun accès pour les membres.
--
-- Idempotent. À exécuter dans Supabase → SQL Editor.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.devotion_push_log (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, local_date)
);

ALTER TABLE public.devotion_push_log ENABLE ROW LEVEL SECURITY;
-- Volontairement AUCUNE policy : seul le service_role (cron) y accède.

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v79 — Journal anti-doublon des notifs de méditation
-- =====================================================================
