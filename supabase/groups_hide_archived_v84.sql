-- =====================================================================
-- CCB — GROUPES : un groupe archivé n'est visible par PERSONNE  v84
--
--   Bug : un groupe archivé restait visible des autres membres dans la
--   liste « Discussions ». Cause : la vue `group_summary` (source de la
--   liste) s'exécute SANS security_invoker → elle contourne la RLS des
--   groupes ET ne filtrait pas les archivés.
--
--   Fix : la vue exclut désormais les groupes archivés (WHERE is_archived
--   = false). On réaffirme aussi la policy de lecture (idempotent) : un
--   non-modérateur ne voit jamais un groupe archivé via la table groups.
--   (Le dashboard admin passe par groups_admin_stats / RPC SECURITY
--   DEFINER → il continue de voir/restaurer les archivés.)
--
-- Idempotent. À exécuter dans Supabase → SQL Editor. Dépend de v41
-- (colonne is_archived) + v39/MEGA (vue group_summary).
-- =====================================================================

-- ─── 1) Vue group_summary SANS les groupes archivés ──────────────────
DROP VIEW IF EXISTS public.group_summary CASCADE;
CREATE VIEW public.group_summary AS
SELECT
  g.id,
  g.name,
  g.description,
  g.cover_url,
  g.type,
  g.category,
  g.created_by,
  g.created_at,
  (SELECT COUNT(*) FROM public.group_members gm WHERE gm.group_id = g.id)::INT AS member_count,
  lm.id        AS last_message_id,
  lm.user_id   AS last_message_user_id,
  lm.content   AS last_message_content,
  lm.attachment_type AS last_message_attachment_type,
  lm.created_at AS last_message_at
FROM public.groups g
LEFT JOIN LATERAL (
  SELECT id, user_id, content, attachment_type, created_at
  FROM public.group_messages
  WHERE group_id = g.id
  ORDER BY created_at DESC
  LIMIT 1
) lm ON true
WHERE g.is_archived = false;   -- ← un groupe archivé disparaît de la liste

GRANT SELECT ON public.group_summary TO authenticated, service_role;

-- ─── 2) RLS (réaffirmée) : non-modérateur ne voit pas les archivés ───
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

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v84 — Groupes archivés invisibles
-- =====================================================================
