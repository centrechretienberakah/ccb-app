-- =====================================================================
-- CCB GROUPES PHASE 4 v22 — réactions emoji sur messages
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.group_message_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL CHECK (emoji IN ('👍','❤️','🙏','🎉','😂','🔥')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_group_reactions_message
  ON public.group_message_reactions(message_id);

ALTER TABLE public.group_message_reactions ENABLE ROW LEVEL SECURITY;

-- Aide RLS : on peut réagir uniquement sur un message dont on peut voir
-- l'origine (group_messages RLS s'en charge déjà via le SELECT sous-jacent).

DROP POLICY IF EXISTS reactions_read_all_visible ON public.group_message_reactions;
CREATE POLICY reactions_read_all_visible ON public.group_message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_messages m
      WHERE m.id = group_message_reactions.message_id
    )
  );

DROP POLICY IF EXISTS reactions_insert_own ON public.group_message_reactions;
CREATE POLICY reactions_insert_own ON public.group_message_reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.group_messages m
      WHERE m.id = group_message_reactions.message_id
        AND public.is_group_member(m.group_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS reactions_delete_own ON public.group_message_reactions;
CREATE POLICY reactions_delete_own ON public.group_message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Realtime sur réactions
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.group_message_reactions; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Phase 4 v22
-- =====================================================================
