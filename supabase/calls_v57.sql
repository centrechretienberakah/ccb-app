-- =====================================================================
-- CCB — Système d'appel temps réel (CCB Meet) v57
--
-- Table de signalisation `calls` diffusée via Supabase Realtime : permet
-- de faire SONNER le destinataire (écran appel entrant + accepter/refuser)
-- AVANT d'ouvrir la room LiveKit. N'altère pas l'infra d'appel existante
-- (LiveKit / CallContext / rooms ccb-dm-* et ccb-*) — couche additive.
--
-- Idempotent. À exécuter dans Supabase SQL Editor.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.calls (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,   -- DM 1-1
  conversation_id UUID,                                                -- DM / mini-groupe
  group_id        UUID,                                                -- appel de groupe
  room_id         TEXT NOT NULL,
  call_type       TEXT NOT NULL DEFAULT 'video' CHECK (call_type IN ('audio','video')),
  status          TEXT NOT NULL DEFAULT 'ringing'
                    CHECK (status IN ('ringing','accepted','declined','missed','ended')),
  caller_name     TEXT,
  caller_avatar   TEXT,
  group_name      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at     TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_calls_receiver ON public.calls(receiver_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_caller   ON public.calls(caller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_conv     ON public.calls(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_group    ON public.calls(group_id, created_at DESC);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
-- payload realtime complet (utile au filtrage RLS sur UPDATE)
ALTER TABLE public.calls REPLICA IDENTITY FULL;

-- ─── RLS : visible/éditable par l'appelant, le destinataire, ou un membre
--           de la conversation / du groupe concerné ────────────────────
DROP POLICY IF EXISTS calls_select ON public.calls;
CREATE POLICY calls_select ON public.calls FOR SELECT USING (
  caller_id = auth.uid()
  OR receiver_id = auth.uid()
  OR (conversation_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.conversation_members cm
         WHERE cm.conversation_id = calls.conversation_id AND cm.user_id = auth.uid()))
  OR (group_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.group_members gm
         WHERE gm.group_id = calls.group_id AND gm.user_id = auth.uid()))
);

DROP POLICY IF EXISTS calls_insert ON public.calls;
CREATE POLICY calls_insert ON public.calls FOR INSERT WITH CHECK (caller_id = auth.uid());

DROP POLICY IF EXISTS calls_update ON public.calls;
CREATE POLICY calls_update ON public.calls FOR UPDATE USING (
  caller_id = auth.uid()
  OR receiver_id = auth.uid()
  OR (conversation_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.conversation_members cm
         WHERE cm.conversation_id = calls.conversation_id AND cm.user_id = auth.uid()))
  OR (group_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.group_members gm
         WHERE gm.group_id = calls.group_id AND gm.user_id = auth.uid()))
);

-- ─── Realtime : diffuse les INSERT/UPDATE aux abonnés autorisés ────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

-- ─── RPC : créer un appel (sonnerie) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.call_ring(
  p_conversation_id UUID, p_group_id UUID, p_type TEXT
) RETURNS public.calls
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_room  TEXT;
  v_recv  UUID;
  v_name  TEXT;
  v_avatar TEXT;
  v_gname TEXT;
  v_row   public.calls;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF p_type NOT IN ('audio','video') THEN p_type := 'video'; END IF;

  SELECT display_name, avatar_url INTO v_name, v_avatar
    FROM public.user_profiles WHERE user_id = v_uid;

  IF p_conversation_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.conversation_members
                    WHERE conversation_id = p_conversation_id AND user_id = v_uid) THEN
      RAISE EXCEPTION 'Accès refusé à cette conversation';
    END IF;
    v_room := 'ccb-dm-' || p_conversation_id::text;
    SELECT user_id INTO v_recv FROM public.conversation_members
      WHERE conversation_id = p_conversation_id AND user_id <> v_uid
      ORDER BY user_id LIMIT 1;
  ELSIF p_group_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.group_members
                    WHERE group_id = p_group_id AND user_id = v_uid) THEN
      RAISE EXCEPTION 'Accès refusé à ce groupe';
    END IF;
    v_room := 'ccb-group-' || p_group_id::text;
    SELECT name INTO v_gname FROM public.groups WHERE id = p_group_id;
  ELSE
    RAISE EXCEPTION 'conversation_id ou group_id requis';
  END IF;

  INSERT INTO public.calls (
    caller_id, receiver_id, conversation_id, group_id, room_id,
    call_type, status, caller_name, caller_avatar, group_name
  ) VALUES (
    v_uid, v_recv, p_conversation_id, p_group_id, v_room,
    p_type, 'ringing', v_name, v_avatar, v_gname
  ) RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.call_ring(UUID, UUID, TEXT) TO authenticated;

-- ─── RPC : changer le statut (accepter / refuser / manqué / terminé) ──
CREATE OR REPLACE FUNCTION public.call_update_status(p_call_id UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_call public.calls;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF p_status NOT IN ('accepted','declined','missed','ended') THEN
    RAISE EXCEPTION 'Statut invalide';
  END IF;
  SELECT * INTO v_call FROM public.calls WHERE id = p_call_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF NOT (
    v_call.caller_id = v_uid OR v_call.receiver_id = v_uid
    OR (v_call.conversation_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.conversation_members cm
           WHERE cm.conversation_id = v_call.conversation_id AND cm.user_id = v_uid))
    OR (v_call.group_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.group_members gm
           WHERE gm.group_id = v_call.group_id AND gm.user_id = v_uid))
  ) THEN RAISE EXCEPTION 'Accès refusé'; END IF;

  -- Ne pas écraser un statut terminal ; "missed" seulement si encore en sonnerie
  IF v_call.status IN ('declined','missed','ended') THEN RETURN; END IF;
  IF p_status = 'missed' AND v_call.status <> 'ringing' THEN RETURN; END IF;

  UPDATE public.calls SET
    status      = p_status,
    answered_at = CASE WHEN p_status = 'accepted' THEN NOW() ELSE answered_at END,
    ended_at    = CASE WHEN p_status IN ('declined','missed','ended') THEN NOW() ELSE ended_at END
  WHERE id = p_call_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.call_update_status(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v57 — Système d'appel temps réel CCB Meet
-- =====================================================================
