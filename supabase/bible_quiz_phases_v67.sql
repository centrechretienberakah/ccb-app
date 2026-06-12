-- =====================================================================
-- CCB — BIBLE QUIZ : CHAMPIONNAT 4 PHASES + STATS ADMIN  v67  (P1)
--
--   1. Table quiz_phases : Qualifications / Quarts / Demi / Finale,
--      chacune ouvrable/fermable par l'admin.
--   2. Verrouillage serveur : quiz_submit_answer refuse une réponse si
--      la phase du quiz est fermée (les quiz 'libre' restent toujours
--      ouverts : Kahoot, Pièges).
--   3. RPC quiz_admin_stats() : agrégats pour le dashboard admin.
--
-- Idempotent. À exécuter dans Supabase SQL Editor. Dépend de v66.
-- =====================================================================

-- ─── Table quiz_phases ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_phases (
  key        TEXT PRIMARY KEY,        -- qualifications / quarts / demi / finale
  label      TEXT NOT NULL,
  is_open    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.quiz_phases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quiz_phases_read ON public.quiz_phases;
CREATE POLICY quiz_phases_read ON public.quiz_phases FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS quiz_phases_admin ON public.quiz_phases;
CREATE POLICY quiz_phases_admin ON public.quiz_phases FOR ALL
  USING (public.is_moderator_or_above()) WITH CHECK (public.is_moderator_or_above());

-- Seed (idempotent) : qualifications ouverte par défaut, le reste fermé.
INSERT INTO public.quiz_phases (key, label, is_open, sort_order) VALUES
  ('qualifications', 'Qualifications',   TRUE,  1),
  ('quarts',         'Quarts de finale', FALSE, 2),
  ('demi',           'Demi-finales',     FALSE, 3),
  ('finale',         'Grande finale',    FALSE, 4)
ON CONFLICT (key) DO NOTHING;

-- ─── quiz_submit_answer : ajoute le verrouillage par phase ───────────
CREATE OR REPLACE FUNCTION public.quiz_submit_answer(
  p_quiz_id     UUID,
  p_question_id UUID,
  p_selected    TEXT,
  p_free        TEXT,
  p_time_taken  INTEGER
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_q       public.quiz_questions;
  v_team    UUID;
  v_phase   TEXT;
  v_correct BOOLEAN := FALSE;
  v_points  INTEGER := 0;
  v_in      TEXT;
  v_exp     TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  -- Verrouillage par phase : un quiz non-'libre' n'est jouable que si sa
  -- phase est ouverte par l'admin.
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
      OR (length(v_in) > 1 AND position(v_in IN v_exp) > 0)
    );
  ELSE
    v_correct := upper(btrim(COALESCE(p_selected, ''))) = upper(btrim(COALESCE(v_q.correct_option, '')));
  END IF;

  v_points := CASE WHEN v_correct
                   THEN COALESCE(v_q.points, CASE WHEN v_q.is_difficult THEN 2 ELSE 1 END)
                   ELSE 0 END;

  INSERT INTO public.quiz_answers
    (user_id, team_id, quiz_id, question_id, selected_option, selected_free_answer, is_correct, points, time_taken)
  VALUES
    (auth.uid(), v_team, p_quiz_id, p_question_id, p_selected, p_free, v_correct, v_points, p_time_taken)
  ON CONFLICT (user_id, question_id) DO UPDATE
    SET selected_option = EXCLUDED.selected_option,
        selected_free_answer = EXCLUDED.selected_free_answer,
        is_correct = EXCLUDED.is_correct,
        points = EXCLUDED.points,
        time_taken = EXCLUDED.time_taken,
        answered_at = NOW();

  RETURN jsonb_build_object(
    'is_correct', v_correct,
    'points', v_points,
    'correct_option', v_q.correct_option,
    'free_answer', CASE WHEN lower(btrim(COALESCE(v_q.correct_option,''))) = 'free' THEN v_q.free_answer ELSE NULL END,
    'reference', v_q.reference
  );
END $$;

-- ─── Stats pour le dashboard admin ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.quiz_admin_stats()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
      'expert',        (SELECT count(*) FROM public.quiz_profiles WHERE level = 'expert')
    )
  ) INTO v;
  RETURN v;
END $$;

GRANT EXECUTE ON FUNCTION public.quiz_admin_stats() TO authenticated;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v67 — Championnat 4 phases + stats admin
-- =====================================================================
