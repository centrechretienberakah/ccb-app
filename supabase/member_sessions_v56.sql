-- =====================================================================
-- CCB — Journal de sessions membre v56
--
-- Capture IP / appareil / navigateur lors de la navigation, pour la vue
-- Admin du profil (identité technique). Insert par le membre lui-même
-- (ou service-role via beacon), lecture réservée OWNER/ADMIN.
-- Idempotent. À exécuter dans Supabase SQL Editor.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.member_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip          TEXT,
  user_agent  TEXT,
  device      TEXT,
  browser     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_sessions_user
  ON public.member_sessions(user_id, created_at DESC);

ALTER TABLE public.member_sessions ENABLE ROW LEVEL SECURITY;

-- Le membre peut enregistrer SA propre session
DROP POLICY IF EXISTS member_sessions_insert_self ON public.member_sessions;
CREATE POLICY member_sessions_insert_self ON public.member_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Lecture : le membre voit ses propres sessions, les admins voient tout
DROP POLICY IF EXISTS member_sessions_select ON public.member_sessions;
CREATE POLICY member_sessions_select ON public.member_sessions
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin_or_above());

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v56 — Journal de sessions membre
-- =====================================================================
