-- =====================================================================
-- CCB COMMUNAUTÉ PHASE 4 v13 — notifications in-app + mentions
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- ─── Notifications utilisateur (in-app) ───────────────────────────────
-- Stocke les notifications affichées dans /community/notifications.
-- Distinct des push notifications (qui passent par push_subscriptions).
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type          TEXT NOT NULL
    CHECK (type IN (
      'mention_post', 'mention_comment',
      'reply_to_comment', 'like_post',
      'admin_announce', 'system'
    )),
  source_type   TEXT NOT NULL
    CHECK (source_type IN ('post','comment','generic')),
  source_id     UUID,
  payload       JSONB DEFAULT '{}'::jsonb,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user
  ON public.user_notifications(user_id, read_at NULLS FIRST, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_unread
  ON public.user_notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_notif_select_own ON public.user_notifications;
CREATE POLICY user_notif_select_own ON public.user_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Insert : tout user authentifié peut créer une notif POUR un autre user
-- (typiquement : système de mentions, l'auteur d'un post mentionne quelqu'un)
DROP POLICY IF EXISTS user_notif_insert ON public.user_notifications;
CREATE POLICY user_notif_insert ON public.user_notifications
  FOR INSERT WITH CHECK (
    auth.uid() = actor_id
    OR auth.uid() = user_id
    OR public.is_moderator_or_above()
  );

-- Update : seul le destinataire peut marquer comme lu
DROP POLICY IF EXISTS user_notif_update_own ON public.user_notifications;
CREATE POLICY user_notif_update_own ON public.user_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Delete : destinataire peut supprimer
DROP POLICY IF EXISTS user_notif_delete_own ON public.user_notifications;
CREATE POLICY user_notif_delete_own ON public.user_notifications
  FOR DELETE USING (auth.uid() = user_id);


-- ─── Reload PostgREST cache ───────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Communauté Phase 4 v13
-- =====================================================================
