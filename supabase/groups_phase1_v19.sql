-- =====================================================================
-- CCB GROUPES PHASE 1 v19 — restauration groupes + chat temps réel
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- ─── Table groups ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.groups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  description  TEXT,
  cover_url    TEXT,
  type         TEXT NOT NULL DEFAULT 'public'
    CHECK (type IN ('public','private')),
  category     TEXT,
  created_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_type ON public.groups(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_groups_creator ON public.groups(created_by);


-- ─── Table group_members ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner','admin','member')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);


-- ─── Table group_messages (chat temps réel) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.group_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  reply_to_id UUID REFERENCES public.group_messages(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group
  ON public.group_messages(group_id, created_at DESC);


-- ─── Helpers SECURITY DEFINER pour éviter RLS recursion ─────────────
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_public(p_group_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group_id AND type = 'public'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id AND role IN ('owner','admin')
  );
$$;


-- ─── RLS groups ─────────────────────────────────────────────────────
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS groups_read_visible ON public.groups;
CREATE POLICY groups_read_visible ON public.groups
  FOR SELECT USING (
    type = 'public'
    OR public.is_group_member(id, auth.uid())
    OR public.is_moderator_or_above()
  );

DROP POLICY IF EXISTS groups_insert_auth ON public.groups;
CREATE POLICY groups_insert_auth ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS groups_update_admin ON public.groups;
CREATE POLICY groups_update_admin ON public.groups
  FOR UPDATE USING (
    public.is_group_admin(id, auth.uid())
    OR public.is_moderator_or_above()
  );

DROP POLICY IF EXISTS groups_delete_owner ON public.groups;
CREATE POLICY groups_delete_owner ON public.groups
  FOR DELETE USING (
    auth.uid() = created_by
    OR public.is_moderator_or_above()
  );


-- ─── RLS group_members ───────────────────────────────────────────────
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS group_members_read ON public.group_members;
CREATE POLICY group_members_read ON public.group_members
  FOR SELECT USING (
    public.is_group_public(group_id)
    OR public.is_group_member(group_id, auth.uid())
    OR public.is_moderator_or_above()
  );

DROP POLICY IF EXISTS group_members_insert ON public.group_members;
CREATE POLICY group_members_insert ON public.group_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id  -- on ne peut joindre que soi-même
    AND (
      public.is_group_public(group_id)
      OR public.is_group_admin(group_id, auth.uid())  -- admin peut inviter
    )
  );

DROP POLICY IF EXISTS group_members_delete_own ON public.group_members;
CREATE POLICY group_members_delete_own ON public.group_members
  FOR DELETE USING (
    auth.uid() = user_id  -- quitter soi-même
    OR public.is_group_admin(group_id, auth.uid())  -- admin peut kicker
    OR public.is_moderator_or_above()
  );


-- ─── RLS group_messages ──────────────────────────────────────────────
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS group_messages_read ON public.group_messages;
CREATE POLICY group_messages_read ON public.group_messages
  FOR SELECT USING (
    public.is_group_member(group_id, auth.uid())
    OR (public.is_group_public(group_id) AND auth.uid() IS NOT NULL)
    OR public.is_moderator_or_above()
  );

DROP POLICY IF EXISTS group_messages_insert ON public.group_messages;
CREATE POLICY group_messages_insert ON public.group_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.is_group_member(group_id, auth.uid())
  );

DROP POLICY IF EXISTS group_messages_update_own ON public.group_messages;
CREATE POLICY group_messages_update_own ON public.group_messages
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS group_messages_delete ON public.group_messages;
CREATE POLICY group_messages_delete ON public.group_messages
  FOR DELETE USING (
    auth.uid() = user_id
    OR public.is_group_admin(group_id, auth.uid())
    OR public.is_moderator_or_above()
  );


-- ─── Realtime ────────────────────────────────────────────────────────
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Groupes Phase 1 v19
-- =====================================================================
