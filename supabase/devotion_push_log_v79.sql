-- =====================================================================
-- CCB — MÉDITONS ENSEMBLE : journal anti-doublon des notifs push  v79
--
--   La notif « méditation du jour » est envoyée à TOUS les membres à
--   l'HEURE DE PARIS, quand la méditation est publiée (cron quotidien).
--   Ce journal garantit qu'un membre n'est notifié qu'UNE fois par date
--   (colonne local_date = date Paris), même si le cron tourne plusieurs fois.
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

-- ─── Indicateur admin : nb de membres notifiés pour une date ─────────
--   SECURITY DEFINER (contourne la RLS), mais ne répond qu'aux modérateurs.
CREATE OR REPLACE FUNCTION public.devotion_push_count(p_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v INTEGER;
BEGIN
  IF NOT public.is_moderator_or_above() THEN RETURN 0; END IF;
  SELECT count(*)::int INTO v FROM public.devotion_push_log WHERE local_date = p_date;
  RETURN COALESCE(v, 0);
END $$;
GRANT EXECUTE ON FUNCTION public.devotion_push_count(DATE) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v79 — Journal anti-doublon des notifs de méditation
-- =====================================================================
