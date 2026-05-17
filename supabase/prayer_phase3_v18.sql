-- =====================================================================
-- CCB PRIONS ENSEMBLE PHASE 3 v18 — signalements + compteur partages
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- ─── Compteur partages sur prayer_requests ───────────────────────────
ALTER TABLE public.prayer_requests
  ADD COLUMN IF NOT EXISTS share_count INT NOT NULL DEFAULT 0;

-- ─── Table prayer_reports ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prayer_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id    UUID REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  comment_id   UUID REFERENCES public.prayer_comments(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','reviewed','dismissed','actioned')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ,
  CONSTRAINT prayer_report_target_xor CHECK (
    (prayer_id IS NOT NULL AND comment_id IS NULL) OR
    (prayer_id IS NULL AND comment_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_prayer_reports_status
  ON public.prayer_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prayer_reports_user
  ON public.prayer_reports(user_id);

ALTER TABLE public.prayer_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prayer_reports_insert_own ON public.prayer_reports;
CREATE POLICY prayer_reports_insert_own ON public.prayer_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS prayer_reports_read_admin ON public.prayer_reports;
CREATE POLICY prayer_reports_read_admin ON public.prayer_reports
  FOR SELECT USING (public.is_moderator_or_above() OR auth.uid() = user_id);

DROP POLICY IF EXISTS prayer_reports_update_admin ON public.prayer_reports;
CREATE POLICY prayer_reports_update_admin ON public.prayer_reports
  FOR UPDATE USING (public.is_moderator_or_above());

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Phase 3 v18
-- =====================================================================
