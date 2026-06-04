-- =====================================================================
-- CCB — Supprimer une discussion (pour soi) v59
--
-- Permet à un membre de RETIRER une discussion de SA liste, façon WhatsApp :
--   • suppression "pour moi" uniquement (l'autre garde la conversation)
--   • on reste membre → on continue de RECEVOIR les messages
--   • la discussion RÉAPPARAÎT automatiquement si un nouveau message arrive
--     (filtrage : visible si last_message_at > deleted_at)
--
-- Implémentation : une simple colonne `deleted_at` sur conversation_members.
-- La policy UPDATE existante (conv_members_update_own : auth.uid() = user_id)
-- autorise déjà chaque membre à positionner cette colonne sur SA ligne —
-- aucune nouvelle policy ni RPC nécessaire.
--
-- Idempotent. Additif (ne casse rien). À exécuter dans Supabase SQL Editor.
-- =====================================================================

ALTER TABLE public.conversation_members
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v59 — après exécution, le bouton 🗑️ de la liste des discussions
-- masque la conversation (réversible : un nouveau message la fait revenir).
-- =====================================================================
