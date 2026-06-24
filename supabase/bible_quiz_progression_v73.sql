-- =====================================================================
-- CCB — BIBLE QUIZ : PROGRESSION AUTOMATIQUE PAR JOUEUR (90%)  v73
--
--   Règle : la 1re phase (Qualifications) suit l'ouverture admin (is_open).
--   Chaque phase suivante se débloque AUTOMATIQUEMENT pour un joueur dès
--   qu'il atteint ≥ 90 % de bonnes réponses sur la phase précédente.
--   (L'admin peut toujours forcer l'ouverture d'une phase pour tous via
--   is_open = TRUE — override.)
--
--   Mesure : bonnes réponses du joueur / total des questions de la phase
--   (toutes les manches de la phase confondues).
--
-- Idempotent. À exécuter dans Supabase SQL Editor. Dépend de v66 + v67.
-- =====================================================================

-- ─── Seuil de progression (constante lisible) ────────────────────────
-- 0.90 = 90 %. Modifiable ici si besoin.

-- ─── Une phase est-elle débloquée pour le joueur courant ? ───────────
CREATE OR REPLACE FUNCTION public.quiz_phase_unlocked(p_phase TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_sort    INTEGER;
  v_is_open BOOLEAN;
  v_min     INTEGER;
  v_prev    TEXT;
  v_total   INTEGER;
  v_correct INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  IF p_phase IS NULL OR p_phase = 'libre' THEN RETURN TRUE; END IF;

  SELECT sort_order, is_open INTO v_sort, v_is_open
    FROM public.quiz_phases WHERE key = p_phase;
  IF v_sort IS NULL THEN RETURN TRUE; END IF;  -- phase hors championnat → libre

  SELECT min(sort_order) INTO v_min FROM public.quiz_phases;

  -- 1re phase : dépend de l'ouverture admin
  IF v_sort = v_min THEN
    RETURN COALESCE(v_is_open, FALSE);
  END IF;

  -- Override admin : phase forcée ouverte pour tous
  IF COALESCE(v_is_open, FALSE) THEN RETURN TRUE; END IF;

  -- Sinon : ≥ 90 % sur la phase immédiatement précédente
  SELECT key INTO v_prev
    FROM public.quiz_phases WHERE sort_order < v_sort
    ORDER BY sort_order DESC LIMIT 1;
  IF v_prev IS NULL THEN RETURN FALSE; END IF;

  SELECT count(qq.id),
         count(qa.id) FILTER (WHERE qa.is_correct)
    INTO v_total, v_correct
    FROM public.quiz_questions qq
    JOIN public.quiz_quizzes qz ON qz.id = qq.quiz_id AND qz.phase = v_prev
    LEFT JOIN public.quiz_answers qa
           ON qa.question_id = qq.id AND qa.user_id = auth.uid();

  IF COALESCE(v_total, 0) = 0 THEN RETURN FALSE; END IF;
  RETURN (v_correct::numeric / v_total) >= 0.90;
END $$;
GRANT EXECUTE ON FUNCTION public.quiz_phase_unlocked(TEXT) TO authenticated;

-- ─── Toutes les phases avec statut perso (pour le hub) ───────────────
CREATE OR REPLACE FUNCTION public.quiz_my_phases()
RETURNS TABLE(key TEXT, label TEXT, is_open BOOLEAN, sort_order INTEGER, unlocked BOOLEAN, score_pct INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.key, p.label, p.is_open, p.sort_order,
         public.quiz_phase_unlocked(p.key) AS unlocked,
         COALESCE((
           SELECT round( (count(qa.id) FILTER (WHERE qa.is_correct))::numeric
                         / NULLIF(count(qq.id), 0) * 100 )::int
           FROM public.quiz_questions qq
           JOIN public.quiz_quizzes qz ON qz.id = qq.quiz_id AND qz.phase = p.key
           LEFT JOIN public.quiz_answers qa
                  ON qa.question_id = qq.id AND qa.user_id = auth.uid()
         ), 0) AS score_pct
  FROM public.quiz_phases p
  ORDER BY p.sort_order;
END $$;
GRANT EXECUTE ON FUNCTION public.quiz_my_phases() TO authenticated;

-- ─── quiz_submit_answer : verrou par progression (remplace le verrou is_open) ─
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

  -- Verrouillage par PROGRESSION : 1re phase = ouverture admin ; phases
  -- suivantes = ≥90%% à la phase précédente (ou override admin). 'libre' libre.
  SELECT phase INTO v_phase FROM public.quiz_quizzes WHERE id = p_quiz_id;
  IF v_phase IS NOT NULL AND v_phase <> 'libre'
     AND NOT public.quiz_phase_unlocked(v_phase) THEN
    RAISE EXCEPTION 'phase verrouillee';
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

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v73 — Progression automatique 90%
-- =====================================================================
