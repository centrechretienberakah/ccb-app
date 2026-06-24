-- =====================================================================
-- CCB — Notifications nominatives : types de réaction v71
--
-- Autorise les notifications « Amen » / « 🔥 » sur un post (en plus du
-- « j'aime » déjà géré). Sans cette migration, l'insert in-app de ces
-- deux types est rejeté par le CHECK (le code reste robuste : le push
-- nominatif part quand même, seule la ligne in-app manque).
--
-- ⚠️ PRÉREQUIS : la table public.user_notifications doit exister. Elle est
-- créée par community_phase4_v13.sql — exécute-le AVANT ce script si tu
-- obtiens « relation user_notifications does not exist ». Ce script ne
-- plante plus si la table manque (il affiche un NOTICE).
--
-- Idempotent. À exécuter dans Supabase → SQL Editor.
-- =====================================================================

DO $$
BEGIN
  IF to_regclass('public.user_notifications') IS NULL THEN
    RAISE NOTICE '⚠️  Table public.user_notifications absente. Exécute d''abord community_phase4_v13.sql (qui la cree + active les notifications in-app), puis ré-exécute ce script.';
    RETURN;
  END IF;

  ALTER TABLE public.user_notifications
    DROP CONSTRAINT IF EXISTS user_notifications_type_check;

  ALTER TABLE public.user_notifications
    ADD CONSTRAINT user_notifications_type_check CHECK (type IN (
      'mention_post', 'mention_comment',
      'reply_to_comment', 'like_post',
      'reaction_amen', 'reaction_fire',
      'admin_announce', 'system'
    ));

  RAISE NOTICE '✅ Types de notification de réaction (amen/fire) autorisés.';
END $$;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v71
-- =====================================================================
