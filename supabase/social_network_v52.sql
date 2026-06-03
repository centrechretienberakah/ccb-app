-- =====================================================================
-- CCB RÉSEAU SOCIAL v52 — Abonnements + Messagerie privée + Appels
--
-- Fondation complète (6 tables) du module réseau social. N'affecte AUCUN
-- module existant (community, prayer, groups, members, meet restent intacts).
--
-- Phase 1 (ce fichier active tout le schéma) :
--   - follows                (abonnements)
--   - conversations          (DM 1:1 + mini-groupes privés)
--   - conversation_members
--   - messages
--   - message_reactions
--   - calls                  (rooms CCB Meet privées)
--   + RLS + helpers + RPCs (toggle_follow, follow_stats, dm conversation)
--
-- Idempotent. À exécuter dans Supabase SQL Editor.
-- =====================================================================

-- ─────────────────────────── 1) FOLLOWS ───────────────────────────
CREATE TABLE IF NOT EXISTS public.follows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_follower  ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS follows_public_read ON public.follows;
CREATE POLICY follows_public_read ON public.follows
  FOR SELECT USING (true);

DROP POLICY IF EXISTS follows_insert_own ON public.follows;
CREATE POLICY follows_insert_own ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS follows_delete_own ON public.follows;
CREATE POLICY follows_delete_own ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);


-- ─────────────────────── 2) CONVERSATIONS ─────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT NOT NULL DEFAULT 'dm' CHECK (type IN ('dm','group')),
  title           TEXT,                       -- pour les mini-groupes
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON public.conversations(last_message_at DESC NULLS LAST);


-- ──────────────────── 3) CONVERSATION_MEMBERS ─────────────────────
CREATE TABLE IF NOT EXISTS public.conversation_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  last_read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_conv_members_conv ON public.conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_user ON public.conversation_members(user_id);


-- ─────────────────────────── 4) MESSAGES ──────────────────────────
CREATE TABLE IF NOT EXISTS public.dm_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         TEXT,
  attachment_url  TEXT,
  attachment_type TEXT,            -- image | pdf | audio | video | other
  attachment_name TEXT,
  reply_to_id     UUID REFERENCES public.dm_messages(id) ON DELETE SET NULL,
  is_pinned       BOOLEAN NOT NULL DEFAULT false,
  is_edited       BOOLEAN NOT NULL DEFAULT false,
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dm_messages_conv ON public.dm_messages(conversation_id, created_at);


-- ─────────────────────── 5) MESSAGE_REACTIONS ─────────────────────
CREATE TABLE IF NOT EXISTS public.dm_message_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL REFERENCES public.dm_messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_dm_reactions_msg ON public.dm_message_reactions(message_id);


-- ─────────────────────────── 6) CALLS ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.dm_calls (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  room_id         TEXT NOT NULL,
  started_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mode            TEXT NOT NULL DEFAULT 'video' CHECK (mode IN ('audio','video')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dm_calls_conv ON public.dm_calls(conversation_id, created_at DESC);


-- ──────────── Helper : appartenance à une conversation ────────────
-- SECURITY DEFINER pour éviter la récursion RLS.
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conv UUID, p_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = p_conv AND user_id = p_uid
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(UUID, UUID) TO authenticated;


-- ─────────────────────────── RLS Messagerie ───────────────────────
ALTER TABLE public.conversations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_message_reactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_calls               ENABLE ROW LEVEL SECURITY;

-- conversations : lecture si membre ; création via RPC (SECURITY DEFINER)
DROP POLICY IF EXISTS conversations_read_member ON public.conversations;
CREATE POLICY conversations_read_member ON public.conversations
  FOR SELECT USING (public.is_conversation_member(id, auth.uid()));

DROP POLICY IF EXISTS conversations_update_member ON public.conversations;
CREATE POLICY conversations_update_member ON public.conversations
  FOR UPDATE USING (public.is_conversation_member(id, auth.uid()));

-- conversation_members : un membre voit les membres de ses conversations
DROP POLICY IF EXISTS conv_members_read ON public.conversation_members;
CREATE POLICY conv_members_read ON public.conversation_members
  FOR SELECT USING (public.is_conversation_member(conversation_id, auth.uid()));

-- update de son propre last_read_at
DROP POLICY IF EXISTS conv_members_update_own ON public.conversation_members;
CREATE POLICY conv_members_update_own ON public.conversation_members
  FOR UPDATE USING (auth.uid() = user_id);

-- messages : lecture/écriture réservées aux membres de la conversation
DROP POLICY IF EXISTS dm_messages_read ON public.dm_messages;
CREATE POLICY dm_messages_read ON public.dm_messages
  FOR SELECT USING (public.is_conversation_member(conversation_id, auth.uid()));

DROP POLICY IF EXISTS dm_messages_insert ON public.dm_messages;
CREATE POLICY dm_messages_insert ON public.dm_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND public.is_conversation_member(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS dm_messages_update_own ON public.dm_messages;
CREATE POLICY dm_messages_update_own ON public.dm_messages
  FOR UPDATE USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS dm_messages_delete_own ON public.dm_messages;
CREATE POLICY dm_messages_delete_own ON public.dm_messages
  FOR DELETE USING (auth.uid() = sender_id);

-- réactions : membres de la conversation du message
DROP POLICY IF EXISTS dm_reactions_read ON public.dm_message_reactions;
CREATE POLICY dm_reactions_read ON public.dm_message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.dm_messages m
      WHERE m.id = dm_message_reactions.message_id
        AND public.is_conversation_member(m.conversation_id, auth.uid())
    )
  );
DROP POLICY IF EXISTS dm_reactions_insert_own ON public.dm_message_reactions;
CREATE POLICY dm_reactions_insert_own ON public.dm_message_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS dm_reactions_delete_own ON public.dm_message_reactions;
CREATE POLICY dm_reactions_delete_own ON public.dm_message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- calls : membres de la conversation
DROP POLICY IF EXISTS dm_calls_read ON public.dm_calls;
CREATE POLICY dm_calls_read ON public.dm_calls
  FOR SELECT USING (public.is_conversation_member(conversation_id, auth.uid()));
DROP POLICY IF EXISTS dm_calls_insert ON public.dm_calls;
CREATE POLICY dm_calls_insert ON public.dm_calls
  FOR INSERT WITH CHECK (
    auth.uid() = started_by
    AND public.is_conversation_member(conversation_id, auth.uid())
  );


-- ═══════════════════════════ RPCs FOLLOW ═══════════════════════════

-- Toggle abonnement. Renvoie true si l'on suit désormais, false sinon.
CREATE OR REPLACE FUNCTION public.toggle_follow(p_target UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_exists BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF v_uid = p_target THEN RAISE EXCEPTION 'On ne peut pas se suivre soi-même'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.follows WHERE follower_id = v_uid AND following_id = p_target
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.follows WHERE follower_id = v_uid AND following_id = p_target;
    RETURN false;
  ELSE
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (v_uid, p_target)
    ON CONFLICT (follower_id, following_id) DO NOTHING;

    -- Notification in-app "nouvel abonné" (best-effort, type system autorisé).
    -- N'échoue jamais le follow si la table/contrainte diffère.
    BEGIN
      INSERT INTO public.user_notifications (user_id, actor_id, type, source_type, source_id, payload)
      VALUES (
        p_target, v_uid, 'system', 'generic', v_uid,
        jsonb_build_object(
          'kind', 'new_follower',
          'message', 'Un membre s''est abonné à vous',
          'url', '/community/profil/' || v_uid::text
        )
      );
    EXCEPTION WHEN others THEN NULL;
    END;

    RETURN true;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.toggle_follow(UUID) TO authenticated;

-- Stats d'un profil : followers, following, is_following (par l'appelant)
CREATE OR REPLACE FUNCTION public.follow_stats(p_user UUID)
RETURNS TABLE(followers INT, following INT, is_following BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT
    (SELECT COUNT(*)::INT FROM public.follows WHERE following_id = p_user),
    (SELECT COUNT(*)::INT FROM public.follows WHERE follower_id  = p_user),
    EXISTS (SELECT 1 FROM public.follows WHERE follower_id = auth.uid() AND following_id = p_user);
$$;
GRANT EXECUTE ON FUNCTION public.follow_stats(UUID) TO authenticated;


-- ═════════════════════ RPC : conversation DM 1:1 ═══════════════════
-- Trouve la conversation DM existante entre l'appelant et p_other,
-- ou la crée. Renvoie l'id de la conversation. (Phase 2 l'utilisera.)
CREATE OR REPLACE FUNCTION public.get_or_create_dm(p_other UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_conv UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF v_uid = p_other THEN RAISE EXCEPTION 'Conversation impossible avec soi-même'; END IF;

  -- Cherche une conversation DM contenant exactement ces 2 membres
  SELECT c.id INTO v_conv
  FROM public.conversations c
  JOIN public.conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = v_uid
  JOIN public.conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = p_other
  WHERE c.type = 'dm'
  LIMIT 1;

  IF v_conv IS NOT NULL THEN
    RETURN v_conv;
  END IF;

  INSERT INTO public.conversations (type, created_by)
  VALUES ('dm', v_uid)
  RETURNING id INTO v_conv;

  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  VALUES (v_conv, v_uid, 'owner'), (v_conv, p_other, 'member');

  RETURN v_conv;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_or_create_dm(UUID) TO authenticated;


-- Realtime (best-effort) sur les messages privés
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_message_reactions;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v52 — Fondation réseau social (Phase 1 : abonnements actifs)
-- =====================================================================
