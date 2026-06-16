-- =====================================================================
-- CCB — BIBLE QUIZ : CONSOLIDATION SCORING + PHASES + ÉQUIPES  v69
--
-- Fichier UNIQUE et idempotent qui (re)pose tout ce qui touche au score,
-- aux phases et aux équipes. À exécuter après v66. Il REMPLACE le besoin
-- d'avoir réussi v67 et v68 (il inclut leur contenu).
--
-- Nouveauté clé : le score est désormais mis à jour À CHAQUE RÉPONSE
-- (plus besoin de terminer la manche pour qu'il compte) → corrige
-- « les scores ne s'affichent pas / restent à 0 ».
--
-- À exécuter dans Supabase SQL Editor.
-- =====================================================================

-- ─── 0. Colonnes défensives (si tables préexistantes) ────────────────
ALTER TABLE public.quiz_answers   ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS points INTEGER;
ALTER TABLE public.quiz_quizzes   ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'libre';
ALTER TABLE public.quiz_profiles  ADD COLUMN IF NOT EXISTS team_id UUID;
ALTER TABLE public.quiz_profiles  ADD COLUMN IF NOT EXISTS total_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.quiz_profiles  ADD COLUMN IF NOT EXISTS level TEXT NOT NULL DEFAULT 'debutant';

-- ─── 1. Unicité (user_id, question_id) → nécessaire à ON CONFLICT ─────
DO $uniq$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_answers_user_question_uniq') THEN
    DELETE FROM public.quiz_answers a USING public.quiz_answers b
      WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.question_id = b.question_id;
    ALTER TABLE public.quiz_answers
      ADD CONSTRAINT quiz_answers_user_question_uniq UNIQUE (user_id, question_id);
  END IF;
END $uniq$;

-- ─── 2. Phases du championnat (archive ancienne table incompatible) ──
DO $compat$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = 'quiz_phases')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'quiz_phases' AND column_name = 'key') THEN
    EXECUTE 'ALTER TABLE public.quiz_phases RENAME TO quiz_phases_legacy_' || to_char(now(), 'YYYYMMDDHH24MISS');
  END IF;
END $compat$;

CREATE TABLE IF NOT EXISTS public.quiz_phases (
  key TEXT PRIMARY KEY, label TEXT NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT FALSE, sort_order INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.quiz_phases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quiz_phases_read ON public.quiz_phases;
CREATE POLICY quiz_phases_read ON public.quiz_phases FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS quiz_phases_admin ON public.quiz_phases;
CREATE POLICY quiz_phases_admin ON public.quiz_phases FOR ALL
  USING (public.is_moderator_or_above()) WITH CHECK (public.is_moderator_or_above());
INSERT INTO public.quiz_phases (key, label, is_open, sort_order) VALUES
  ('qualifications', 'Qualifications', TRUE, 1),
  ('quarts', 'Quarts de finale', FALSE, 2),
  ('demi', 'Demi-finales', FALSE, 3),
  ('finale', 'Grande finale', FALSE, 4)
ON CONFLICT (key) DO NOTHING;

-- ─── 3. FK quiz_profiles.team_id → quiz_teams (ON DELETE SET NULL) ────
DO $fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
     WHERE tc.table_schema = 'public' AND tc.table_name = 'quiz_profiles'
       AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'team_id'
  ) THEN
    UPDATE public.quiz_profiles SET team_id = NULL
     WHERE team_id IS NOT NULL AND team_id NOT IN (SELECT id FROM public.quiz_teams);
    ALTER TABLE public.quiz_profiles
      ADD CONSTRAINT quiz_profiles_team_id_fkey
      FOREIGN KEY (team_id) REFERENCES public.quiz_teams(id) ON DELETE SET NULL;
  END IF;
END $fk$;

-- ─── 4. Fonctions (SECURITY DEFINER) ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.quiz_ensure_profile()
RETURNS public.quiz_profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.quiz_profiles;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO public.quiz_profiles (id, name, email)
  SELECT auth.uid(),
         COALESCE((SELECT display_name FROM public.user_profiles WHERE user_id = auth.uid()),
                  (SELECT full_name   FROM public.user_profiles WHERE user_id = auth.uid()), 'Joueur'),
         (SELECT email FROM auth.users WHERE id = auth.uid())
  ON CONFLICT (id) DO NOTHING;
  SELECT * INTO v_row FROM public.quiz_profiles WHERE id = auth.uid();
  RETURN v_row;
END $$;

-- Niveau dérivé d'un total
CREATE OR REPLACE FUNCTION public.quiz_level_of(p_total INTEGER)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p_total >= 500 THEN 'expert'
              WHEN p_total >= 300 THEN 'avancé'
              WHEN p_total >= 100 THEN 'intermediaire'
              ELSE 'debutant' END;
$$;

-- Validation d'une réponse + MISE À JOUR LIVE du score.
CREATE OR REPLACE FUNCTION public.quiz_submit_answer(
  p_quiz_id UUID, p_question_id UUID, p_selected TEXT, p_free TEXT, p_time_taken INTEGER
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_q public.quiz_questions; v_team UUID; v_phase TEXT;
  v_correct BOOLEAN := FALSE; v_points INTEGER := 0;
  v_in TEXT; v_exp TEXT; v_total INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT phase INTO v_phase FROM public.quiz_quizzes WHERE id = p_quiz_id;
  IF v_phase IS NOT NULL AND v_phase <> 'libre'
     AND NOT EXISTS (SELECT 1 FROM public.quiz_phases WHERE key = v_phase AND is_open) THEN
    RAISE EXCEPTION 'phase fermée';
  END IF;

  PERFORM public.quiz_ensure_profile();
  SELECT team_id INTO v_team FROM public.quiz_profiles WHERE id = auth.uid();

  SELECT * INTO v_q FROM public.quiz_questions WHERE id = p_question_id AND quiz_id = p_quiz_id;
  IF v_q.id IS NULL THEN RAISE EXCEPTION 'question introuvable'; END IF;

  IF lower(btrim(COALESCE(v_q.correct_option, ''))) = 'free' THEN
    v_in  := lower(btrim(COALESCE(p_free, '')));
    v_exp := lower(btrim(COALESCE(v_q.free_answer, '')));
    v_correct := v_in <> '' AND (
         v_in = v_exp
      OR (length(v_exp) > 1 AND position(v_exp IN v_in) > 0)
      OR (length(v_in) > 1 AND position(v_in IN v_exp) > 0));
  ELSE
    v_correct := upper(btrim(COALESCE(p_selected, ''))) = upper(btrim(COALESCE(v_q.correct_option, '')));
  END IF;

  v_points := CASE WHEN v_correct
                   THEN COALESCE(v_q.points, CASE WHEN v_q.is_difficult THEN 2 ELSE 1 END) ELSE 0 END;

  INSERT INTO public.quiz_answers
    (user_id, team_id, quiz_id, question_id, selected_option, selected_free_answer, is_correct, points, time_taken)
  VALUES
    (auth.uid(), v_team, p_quiz_id, p_question_id, p_selected, p_free, v_correct, v_points, p_time_taken)
  ON CONFLICT (user_id, question_id) DO UPDATE
    SET selected_option = EXCLUDED.selected_option, selected_free_answer = EXCLUDED.selected_free_answer,
        is_correct = EXCLUDED.is_correct, points = EXCLUDED.points,
        time_taken = EXCLUDED.time_taken, answered_at = NOW();

  -- MISE À JOUR LIVE : le total + niveau du joueur, et le score de l'équipe.
  SELECT COALESCE(SUM(points), 0) INTO v_total FROM public.quiz_answers WHERE user_id = auth.uid();
  UPDATE public.quiz_profiles
     SET total_score = v_total, level = public.quiz_level_of(v_total)
   WHERE id = auth.uid();
  IF v_team IS NOT NULL THEN
    UPDATE public.quiz_teams
       SET total_score = (SELECT COALESCE(SUM(total_score), 0) FROM public.quiz_profiles WHERE team_id = v_team)
     WHERE id = v_team;
  END IF;

  RETURN jsonb_build_object(
    'is_correct', v_correct, 'points', v_points,
    'correct_option', v_q.correct_option,
    'free_answer', CASE WHEN lower(btrim(COALESCE(v_q.correct_option,''))) = 'free' THEN v_q.free_answer ELSE NULL END,
    'reference', v_q.reference);
END $$;

-- Clôture de manche (enregistre la tentative + resynchronise).
CREATE OR REPLACE FUNCTION public.quiz_finish_attempt(p_quiz_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_team UUID; v_score INTEGER; v_total_q INTEGER; v_total INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  PERFORM public.quiz_ensure_profile();
  SELECT team_id INTO v_team FROM public.quiz_profiles WHERE id = auth.uid();

  SELECT COALESCE(SUM(points), 0) INTO v_score FROM public.quiz_answers WHERE user_id = auth.uid() AND quiz_id = p_quiz_id;
  SELECT COUNT(*) INTO v_total_q FROM public.quiz_questions WHERE quiz_id = p_quiz_id;

  INSERT INTO public.quiz_attempts (user_id, team_id, quiz_id, score, total_questions)
  VALUES (auth.uid(), v_team, p_quiz_id, v_score, v_total_q);

  SELECT COALESCE(SUM(points), 0) INTO v_total FROM public.quiz_answers WHERE user_id = auth.uid();
  UPDATE public.quiz_profiles SET total_score = v_total, level = public.quiz_level_of(v_total) WHERE id = auth.uid();
  IF v_team IS NOT NULL THEN
    UPDATE public.quiz_teams SET total_score = (SELECT COALESCE(SUM(total_score),0) FROM public.quiz_profiles WHERE team_id = v_team) WHERE id = v_team;
  END IF;

  RETURN jsonb_build_object('score', v_score, 'total_score', v_total, 'level', public.quiz_level_of(v_total), 'total_questions', v_total_q);
END $$;

CREATE OR REPLACE FUNCTION public.quiz_join_team(p_team_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  PERFORM public.quiz_ensure_profile();
  UPDATE public.quiz_profiles SET team_id = p_team_id WHERE id = auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.quiz_create_or_join_team(p_name TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_team UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF btrim(COALESCE(p_name, '')) = '' THEN RAISE EXCEPTION 'nom requis'; END IF;
  SELECT id INTO v_team FROM public.quiz_teams WHERE lower(name) = lower(btrim(p_name)) LIMIT 1;
  IF v_team IS NULL THEN INSERT INTO public.quiz_teams (name) VALUES (btrim(p_name)) RETURNING id INTO v_team; END IF;
  PERFORM public.quiz_ensure_profile();
  UPDATE public.quiz_profiles SET team_id = v_team WHERE id = auth.uid();
  RETURN v_team;
END $$;

CREATE OR REPLACE FUNCTION public.quiz_leave_team()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  UPDATE public.quiz_profiles SET team_id = NULL WHERE id = auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.quiz_recompute_scores()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_players INT; v_teams INT;
BEGIN
  IF NOT public.is_moderator_or_above() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.quiz_profiles p
     SET total_score = COALESCE((SELECT SUM(a.points) FROM public.quiz_answers a WHERE a.user_id = p.id), 0);
  UPDATE public.quiz_profiles SET level = public.quiz_level_of(total_score);
  UPDATE public.quiz_teams t
     SET total_score = COALESCE((SELECT SUM(p.total_score) FROM public.quiz_profiles p WHERE p.team_id = t.id), 0);
  SELECT count(*) INTO v_players FROM public.quiz_profiles;
  SELECT count(*) INTO v_teams   FROM public.quiz_teams;
  RETURN jsonb_build_object('players', v_players, 'teams', v_teams);
END $$;

CREATE OR REPLACE FUNCTION public.quiz_admin_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  IF NOT public.is_moderator_or_above() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'players',   (SELECT count(*) FROM public.quiz_profiles),
    'teams',     (SELECT count(*) FROM public.quiz_teams),
    'attempts',  (SELECT count(*) FROM public.quiz_attempts),
    'answers',   (SELECT count(*) FROM public.quiz_answers),
    'avg_score', (SELECT COALESCE(round(avg(total_score))::int, 0) FROM public.quiz_profiles),
    'levels', jsonb_build_object(
      'debutant',      (SELECT count(*) FROM public.quiz_profiles WHERE level = 'debutant'),
      'intermediaire', (SELECT count(*) FROM public.quiz_profiles WHERE level = 'intermediaire'),
      'avance',        (SELECT count(*) FROM public.quiz_profiles WHERE level = 'avancé'),
      'expert',        (SELECT count(*) FROM public.quiz_profiles WHERE level = 'expert'))
  ) INTO v;
  RETURN v;
END $$;

GRANT EXECUTE ON FUNCTION public.quiz_ensure_profile()                              TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_submit_answer(UUID, UUID, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_finish_attempt(UUID)                           TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_join_team(UUID)                                TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_create_or_join_team(TEXT)                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_leave_team()                                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_recompute_scores()                             TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_admin_stats()                                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_level_of(INTEGER)                              TO authenticated;

-- ─── 5. Resynchronise immédiatement les scores existants ─────────────
UPDATE public.quiz_profiles p
   SET total_score = COALESCE((SELECT SUM(a.points) FROM public.quiz_answers a WHERE a.user_id = p.id), 0);
UPDATE public.quiz_profiles SET level = public.quiz_level_of(total_score);
UPDATE public.quiz_teams t
   SET total_score = COALESCE((SELECT SUM(p.total_score) FROM public.quiz_profiles p WHERE p.team_id = t.id), 0);

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v69 — Consolidation scoring + phases + équipes
-- =====================================================================
