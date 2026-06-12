-- =====================================================================
-- CCB — BIBLE QUIZ : FK équipe + recalcul des scores  v68
--
--   1. Ajoute la clé étrangère quiz_profiles.team_id → quiz_teams(id)
--      (ON DELETE SET NULL) si elle manque. Sur une base où quiz_profiles
--      préexistait, v66 n'avait ajouté que la colonne (sans FK), ce qui
--      cassait l'embed PostgREST du classement → scores invisibles.
--   2. RPC quiz_recompute_scores() : recalcule total_score + niveau de
--      chaque joueur (depuis ses réponses) et le score de chaque équipe
--      (somme des membres). Utile après une correction de données ou un
--      changement d'appartenance d'équipe.
--
-- Idempotent. À exécuter dans Supabase SQL Editor. Dépend de v66.
-- =====================================================================

-- ─── 1. Clé étrangère team_id ────────────────────────────────────────
DO $fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
     WHERE tc.table_schema = 'public'
       AND tc.table_name = 'quiz_profiles'
       AND tc.constraint_type = 'FOREIGN KEY'
       AND kcu.column_name = 'team_id'
  ) THEN
    -- Nettoie d'éventuelles références orphelines avant d'ajouter la contrainte.
    UPDATE public.quiz_profiles
       SET team_id = NULL
     WHERE team_id IS NOT NULL
       AND team_id NOT IN (SELECT id FROM public.quiz_teams);

    ALTER TABLE public.quiz_profiles
      ADD CONSTRAINT quiz_profiles_team_id_fkey
      FOREIGN KEY (team_id) REFERENCES public.quiz_teams(id) ON DELETE SET NULL;
  END IF;
END $fk$;

-- ─── 2. Recalcul des scores (réservé modérateur+) ────────────────────
CREATE OR REPLACE FUNCTION public.quiz_recompute_scores()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_players INT; v_teams INT;
BEGIN
  IF NOT public.is_moderator_or_above() THEN RAISE EXCEPTION 'forbidden'; END IF;

  UPDATE public.quiz_profiles p
     SET total_score = COALESCE((SELECT SUM(a.points) FROM public.quiz_answers a WHERE a.user_id = p.id), 0);

  UPDATE public.quiz_profiles
     SET level = CASE WHEN total_score >= 500 THEN 'expert'
                      WHEN total_score >= 300 THEN 'avancé'
                      WHEN total_score >= 100 THEN 'intermediaire'
                      ELSE 'debutant' END;

  UPDATE public.quiz_teams t
     SET total_score = COALESCE((SELECT SUM(p.total_score) FROM public.quiz_profiles p WHERE p.team_id = t.id), 0);

  SELECT count(*) INTO v_players FROM public.quiz_profiles;
  SELECT count(*) INTO v_teams   FROM public.quiz_teams;
  RETURN jsonb_build_object('players', v_players, 'teams', v_teams);
END $$;

GRANT EXECUTE ON FUNCTION public.quiz_recompute_scores() TO authenticated;

-- ─── 3. Quitter son équipe ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.quiz_leave_team()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  UPDATE public.quiz_profiles SET team_id = NULL WHERE id = auth.uid();
END $$;

GRANT EXECUTE ON FUNCTION public.quiz_leave_team() TO authenticated;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v68 — FK équipe + recalcul des scores
-- =====================================================================
