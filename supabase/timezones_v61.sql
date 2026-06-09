-- =====================================================================
-- CCB — Fuseaux horaires automatiques v61
--
-- Les instants sont déjà stockés en UTC (colonnes TIMESTAMPTZ), donc
-- l'affichage se convertit déjà vers le fuseau du visiteur côté client.
-- Cette migration ajoute le FUSEAU D'ORIGINE de l'événement (pour afficher
-- « heure d'origine : 12h00 Paris ») et le fuseau préféré du membre.
--
-- Idempotent. Additif (aucune donnée existante modifiée).
-- À exécuter dans Supabase SQL Editor.
-- =====================================================================

-- Fuseau d'origine de l'événement (ex. "Europe/Paris")
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Fuseau préféré du membre (auto-détecté, modifiable manuellement)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v61
-- =====================================================================
