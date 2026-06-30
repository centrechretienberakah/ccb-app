-- =====================================================================
-- CCB — GROUPES : autoriser les longs messages  v86
--
--   Bug : impossible de publier un long texte dans un groupe. Cause : la
--   contrainte `group_messages_content_check` limitait le contenu à
--   2000 caractères (v19/v20) → l'envoi d'un texte plus long échouait.
--
--   Fix : on relève la limite à 20 000 caractères (≈ plusieurs pages, de
--   quoi publier un enseignement complet), tout en gardant la règle
--   « contenu vide autorisé si pièce jointe ».
--
--   (Le chat privé `dm_messages` n'a aucune limite → rien à changer.)
--
-- Idempotent. À exécuter dans Supabase → SQL Editor. Dépend de v19/v20.
-- =====================================================================

ALTER TABLE public.group_messages
  DROP CONSTRAINT IF EXISTS group_messages_content_check;

ALTER TABLE public.group_messages
  ADD CONSTRAINT group_messages_content_check
    CHECK (
      (content IS NOT NULL AND char_length(content) BETWEEN 0 AND 20000)
      OR attachment_url IS NOT NULL
    );

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v86 — Longs messages de groupe (limite 2000 → 20000)
-- =====================================================================
