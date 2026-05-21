-- =====================================================================
-- CCB GROUPES — REFONTE PHASE 3 v41
--
-- Dashboard admin (mod+) :
--   1) Colonne is_archived (soft-archive) sur groups + archived_at + archived_by
--   2) RLS : groupes archivés invisibles aux non-admins (mais préservés)
--   3) VIEW groups_admin_stats : statistiques par groupe pour le dashboard
--   4) VIEW groups_admin_activity_30d : courbe d'activité globale (30 jours)
--
-- Idempotent. À exécuter dans Supabase SQL Editor.
-- =====================================================================

-- ─── 1) Colonnes soft-archive ────────────────────────────────────────
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_groups_archived
  ON public.groups(is_archived, created_at DESC) WHERE is_archived = true;


-- ─── 2) RLS : masquer archivés aux non-admins ────────────────────────
-- On remplace la policy de lecture v19 pour exclure les archivés
-- (sauf pour les mod+ qui voient tout).
DROP POLICY IF EXISTS groups_read_visible ON public.groups;
CREATE POLICY groups_read_visible ON public.groups
  FOR SELECT USING (
    (
      is_archived = false
      AND (
        type = 'public'
        OR public.is_group_member(id, auth.uid())
      )
    )
    OR public.is_moderator_or_above()
  );


-- ─── 3) VIEW groups_admin_stats ──────────────────────────────────────
-- Statistiques agrégées par groupe (un seul SELECT côté admin)
DROP VIEW IF EXISTS public.groups_admin_stats CASCADE;
CREATE VIEW public.groups_admin_stats AS
SELECT
  g.id,
  g.name,
  g.description,
  g.cover_url,
  g.type,
  g.category,
  g.created_by,
  g.created_at,
  g.is_archived,
  g.archived_at,
  -- Membres
  (SELECT COUNT(*) FROM public.group_members gm WHERE gm.group_id = g.id)::INT AS member_count,
  -- Messages cumulés
  (SELECT COUNT(*) FROM public.group_messages m WHERE m.group_id = g.id)::INT AS total_messages,
  -- Messages 7 derniers jours
  (SELECT COUNT(*) FROM public.group_messages m
     WHERE m.group_id = g.id AND m.created_at >= NOW() - INTERVAL '7 days')::INT AS messages_7d,
  -- Messages 30 derniers jours
  (SELECT COUNT(*) FROM public.group_messages m
     WHERE m.group_id = g.id AND m.created_at >= NOW() - INTERVAL '30 days')::INT AS messages_30d,
  -- Dernière activité (dernier message)
  (SELECT MAX(created_at) FROM public.group_messages m WHERE m.group_id = g.id) AS last_activity_at
FROM public.groups g;

GRANT SELECT ON public.groups_admin_stats TO authenticated, service_role;


-- ─── 4) VIEW activité globale 30 jours ───────────────────────────────
-- 1 ligne par jour avec : nouveaux groupes, messages, nouveaux membres
DROP VIEW IF EXISTS public.groups_admin_activity_30d CASCADE;
CREATE VIEW public.groups_admin_activity_30d AS
WITH days AS (
  SELECT generate_series(
    (NOW() - INTERVAL '29 days')::DATE,
    NOW()::DATE,
    INTERVAL '1 day'
  )::DATE AS day
),
new_groups AS (
  SELECT DATE(created_at) AS day, COUNT(*)::INT AS n_groups
  FROM public.groups
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)
),
msg_per_day AS (
  SELECT DATE(created_at) AS day, COUNT(*)::INT AS n_messages
  FROM public.group_messages
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)
),
new_members AS (
  SELECT DATE(joined_at) AS day, COUNT(*)::INT AS n_members
  FROM public.group_members
  WHERE joined_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(joined_at)
)
SELECT
  d.day,
  COALESCE(ng.n_groups, 0)  AS new_groups,
  COALESCE(mp.n_messages, 0) AS messages,
  COALESCE(nm.n_members, 0) AS new_members
FROM days d
LEFT JOIN new_groups   ng ON ng.day = d.day
LEFT JOIN msg_per_day  mp ON mp.day = d.day
LEFT JOIN new_members  nm ON nm.day = d.day
ORDER BY d.day ASC;

GRANT SELECT ON public.groups_admin_activity_30d TO authenticated, service_role;


-- ─── 5) RPC : archive / restore (sécurisé mod+) ──────────────────────
CREATE OR REPLACE FUNCTION public.groups_admin_set_archived(
  p_group_id UUID,
  p_archived BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NOT public.is_moderator_or_above() THEN
    RAISE EXCEPTION 'Permission refusée — moderator+ requis';
  END IF;
  UPDATE public.groups
  SET is_archived = p_archived,
      archived_at = CASE WHEN p_archived THEN NOW() ELSE NULL END,
      archived_by = CASE WHEN p_archived THEN auth.uid() ELSE NULL END
  WHERE id = p_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.groups_admin_set_archived(UUID, BOOLEAN) TO authenticated;


NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v41 — Dashboard admin groupes
-- =====================================================================
