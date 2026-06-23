-- =====================================================================
-- CCB — Notifications nominatives : types de réaction v71
--
-- Autorise les notifications « Amen » / « 🔥 » sur un post (en plus du
-- « j'aime » déjà géré). Sans cette migration, l'insert in-app de ces
-- deux types est rejeté par le CHECK (le code reste robuste : le push
-- nominatif part quand même, seule la ligne in-app manque).
--
-- Idempotent. À exécuter dans Supabase → SQL Editor.
-- =====================================================================

ALTER TABLE public.user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_type_check;

ALTER TABLE public.user_notifications
  ADD CONSTRAINT user_notifications_type_check CHECK (type IN (
    'mention_post', 'mention_comment',
    'reply_to_comment', 'like_post',
    'reaction_amen', 'reaction_fire',
    'admin_announce', 'system'
  ));

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v71
-- =====================================================================
