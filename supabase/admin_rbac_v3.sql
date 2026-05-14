-- =====================================================================
-- CCB ADMIN PANEL v3 — RBAC complet (OWNER / ADMIN / MODERATOR / MEMBER / PREMIUM_MEMBER)
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. user_roles : étendre les valeurs autorisées
-- ---------------------------------------------------------------------

-- Supprime l'ancien check constraint s'il existe (peu importe son nom)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.user_roles'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.user_roles DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- Ajoute le nouveau check avec les 5 rôles
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('owner', 'admin', 'moderator', 'member', 'premium_member', 'leader'));
-- (on garde 'leader' temporairement pour ne pas casser les data existantes)

-- ---------------------------------------------------------------------
-- 2. Table owner_emails (liste éditable des emails OWNER)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.owner_emails (
  email      TEXT PRIMARY KEY,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by   UUID REFERENCES auth.users(id)
);

ALTER TABLE public.owner_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owner_emails_owner_only ON public.owner_emails;
CREATE POLICY owner_emails_owner_only ON public.owner_emails
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'owner')
  );

-- ---------------------------------------------------------------------
-- 3. Helpers SECURITY DEFINER (évite récursion RLS)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r TEXT;
BEGIN
  SELECT role INTO r FROM public.user_roles WHERE user_id = auth.uid();
  RETURN COALESCE(r, 'member');
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = auth.uid()
       AND role = 'owner'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_above()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = auth.uid()
       AND role IN ('owner', 'admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_moderator_or_above()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = auth.uid()
       AND role IN ('owner', 'admin', 'moderator', 'leader')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_above() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_moderator_or_above() TO authenticated;

-- Met à jour la fonction is_admin() existante pour inclure owner
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = auth.uid()
       AND role IN ('owner', 'admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_leader_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = auth.uid()
       AND role IN ('owner', 'admin', 'moderator', 'leader')
  );
END;
$$;

-- ---------------------------------------------------------------------
-- 4. Trigger : auto-attribution du rôle OWNER si email dans owner_emails
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auto_assign_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Pour INSERT sur auth.users : NEW.email est disponible
  IF TG_TABLE_NAME = 'users' THEN
    user_email := NEW.email;
    IF EXISTS (SELECT 1 FROM public.owner_emails WHERE email = user_email) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'owner')
      ON CONFLICT (user_id) DO UPDATE SET role = 'owner';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_owner ON auth.users;
CREATE TRIGGER trg_auto_assign_owner
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_owner();

-- ---------------------------------------------------------------------
-- 5. RPC : promote_owner_if_matched
--    Appelé côté serveur (proxy/route) : si l'email courant est dans
--    owner_emails et que role != owner, upsert role=owner.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.promote_owner_if_matched()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
  uemail TEXT;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RETURN false; END IF;

  SELECT email INTO uemail FROM auth.users WHERE id = uid;
  IF uemail IS NULL THEN RETURN false; END IF;

  IF EXISTS (SELECT 1 FROM public.owner_emails WHERE email = uemail) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (uid, 'owner')
    ON CONFLICT (user_id) DO UPDATE SET role = 'owner'
    WHERE user_roles.role <> 'owner';
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_owner_if_matched() TO authenticated;

-- ---------------------------------------------------------------------
-- 6. admin_logs : audit trail des actions admin
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role   TEXT,
  action       TEXT NOT NULL,        -- ex: 'user.disable', 'post.delete', 'role.change'
  target_type  TEXT,                  -- ex: 'user', 'post', 'event'
  target_id    TEXT,
  details      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON public.admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_actor   ON public.admin_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action  ON public.admin_logs(action);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_logs_admin_read  ON public.admin_logs;
DROP POLICY IF EXISTS admin_logs_admin_write ON public.admin_logs;
CREATE POLICY admin_logs_admin_read  ON public.admin_logs FOR SELECT
  USING (public.is_admin_or_above());
CREATE POLICY admin_logs_admin_write ON public.admin_logs FOR INSERT
  WITH CHECK (public.is_moderator_or_above());

-- RPC helper pour logger côté client de manière sûre
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
  role_txt TEXT;
BEGIN
  IF NOT public.is_moderator_or_above() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT role INTO role_txt FROM public.user_roles WHERE user_id = auth.uid();
  INSERT INTO public.admin_logs (actor_id, actor_role, action, target_type, target_id, details)
  VALUES (auth.uid(), role_txt, p_action, p_target_type, p_target_id, p_details)
  RETURNING id INTO log_id;
  RETURN log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_action(TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ---------------------------------------------------------------------
-- 7. Réinitialisation choisie par l'utilisateur :
--    Tout le monde → 'member', sauf ceux dans owner_emails → 'owner'.
--    DÉCOMMENTE le bloc suivant pour exécuter ce reset.
-- ---------------------------------------------------------------------

-- UPDATE public.user_roles SET role = 'member' WHERE role NOT IN ('owner');
-- UPDATE public.user_roles ur
--    SET role = 'owner'
--   FROM auth.users u
--  WHERE ur.user_id = u.id
--    AND u.email IN (SELECT email FROM public.owner_emails);

-- =====================================================================
-- FIN
-- =====================================================================
