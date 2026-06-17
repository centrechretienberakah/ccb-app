-- =====================================================================
-- CCB — Réparation appels temps réel (CCB Meet) v70
--
-- Symptôme corrigé : « quand un appel est lancé, les participants ne
-- reçoivent ni sonnerie ni notification ».
--
-- Cause la plus fréquente : la table `calls` n'est pas (ou plus) dans la
-- publication `supabase_realtime`, donc Supabase ne diffuse pas l'INSERT
-- aux destinataires → l'écran « Appel entrant » + la sonnerie ne se
-- déclenchent jamais. (Le script v57 ajoutait la table mais avalait toute
-- erreur via `WHEN others THEN NULL`, ce qui pouvait masquer un échec.)
--
-- Ce script est IDEMPOTENT et SÛR à ré-exécuter. Il :
--   1) s'assure que la table `calls` existe (sinon la crée),
--   2) (ré)active RLS + REPLICA IDENTITY FULL,
--   3) (ré)installe les policies SELECT/INSERT/UPDATE,
--   4) AJOUTE la table à la publication realtime de façon vérifiée + visible,
--   5) (ré)installe les RPC call_ring / call_update_status,
--   6) AFFICHE une vérification finale (NOTICE) pour confirmer le réglage.
--
-- À exécuter dans Supabase → SQL Editor. Lis les messages « NOTICE » à la fin.
-- =====================================================================

-- ─── 1. Table (idempotent) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calls (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  conversation_id UUID,
  group_id        UUID,
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

-- ─── 2. RLS + REPLICA IDENTITY (nécessaire au payload realtime) ───────
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls REPLICA IDENTITY FULL;

-- ─── 3. Policies (visible/éditable par appelant, destinataire, ou membre
--           de la conversation / du groupe concerné) ─────────────────────
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

-- ─── 4. Publication Realtime — ajout VÉRIFIÉ (ne masque plus l'échec) ──
DO $$
DECLARE
  v_in_pub BOOLEAN;
BEGIN
  -- La publication supabase_realtime doit exister (créée par Supabase).
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE '⚠️  La publication supabase_realtime est introuvable. Active Realtime depuis le Dashboard Supabase (Database → Replication) puis ré-exécute ce script.';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public' AND tablename = 'calls'
  ) INTO v_in_pub;

  IF v_in_pub THEN
    RAISE NOTICE '✅ La table public.calls est DÉJÀ dans la publication supabase_realtime.';
  ELSE
    ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
    RAISE NOTICE '✅ La table public.calls vient d''être AJOUTÉE à la publication supabase_realtime.';
  END IF;
END $$;

-- ─── 5. RPC : créer un appel (sonnerie) ───────────────────────────────
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

-- ─── 6. Vérification finale (lis ces NOTICE dans l'onglet « Messages ») ─
DO $$
DECLARE
  v_table   BOOLEAN;
  v_pub      BOOLEAN;
  v_ring     BOOLEAN;
  v_status   BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='calls') INTO v_table;
  SELECT EXISTS (SELECT 1 FROM pg_publication_tables
                  WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='calls') INTO v_pub;
  SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname='call_ring') INTO v_ring;
  SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname='call_update_status') INTO v_status;

  RAISE NOTICE '──────── CCB Meet — vérification ────────';
  RAISE NOTICE 'Table public.calls .................. %', CASE WHEN v_table  THEN 'OK ✅' ELSE 'MANQUANTE ❌' END;
  RAISE NOTICE 'Dans publication realtime .......... %', CASE WHEN v_pub    THEN 'OK ✅' ELSE 'MANQUANTE ❌' END;
  RAISE NOTICE 'RPC call_ring ...................... %', CASE WHEN v_ring   THEN 'OK ✅' ELSE 'MANQUANTE ❌' END;
  RAISE NOTICE 'RPC call_update_status ............. %', CASE WHEN v_status THEN 'OK ✅' ELSE 'MANQUANTE ❌' END;
  RAISE NOTICE 'Si tout est OK ✅, la sonnerie temps réel fonctionne pour les membres ayant l''app ouverte.';
END $$;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v70 — Réparation appels temps réel CCB Meet
-- =====================================================================
