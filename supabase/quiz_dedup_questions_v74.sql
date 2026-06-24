-- =====================================================================
-- CCB — BIBLE QUIZ : nettoyage des questions en double  v74
--
-- Supprime les questions DUPLIQUÉES (même texte dans la même manche) en
-- gardant la 1re occurrence (par sort_order, puis date de création).
-- Renumérote sort_order proprement, puis pose un index UNIQUE pour
-- empêcher tout futur doublon. Concerne TOUTES les manches — dont
-- « La vie de Jésus » et « Les héros de la foi » (créées via l'admin).
--
-- NB : la FK quiz_answers.question_id est ON DELETE CASCADE → les réponses
-- liées aux questions retirées sont supprimées automatiquement. Pense à
-- cliquer « Recalculer les scores » dans l'admin ensuite.
--
-- Idempotent. À exécuter dans Supabase → SQL Editor.
-- =====================================================================

-- Aperçu : nombre de doublons à supprimer (lis le NOTICE)
DO $$
DECLARE v_dups INTEGER;
BEGIN
  SELECT COALESCE(sum(c - 1), 0) INTO v_dups FROM (
    SELECT count(*) AS c
      FROM public.quiz_questions
     GROUP BY quiz_id, lower(btrim(text))
    HAVING count(*) > 1
  ) d;
  RAISE NOTICE 'Questions en double a supprimer : %', v_dups;
END $$;

-- 1) Suppression des doublons (garde la 1re occurrence par manche + texte)
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY quiz_id, lower(btrim(text))
           ORDER BY sort_order, created_at, id
         ) AS rn
    FROM public.quiz_questions
)
DELETE FROM public.quiz_questions q
USING ranked r
WHERE q.id = r.id AND r.rn > 1;

-- 2) Renumérotation propre de sort_order, par manche
WITH seq AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY quiz_id ORDER BY sort_order, created_at, id
         ) AS rn
    FROM public.quiz_questions
)
UPDATE public.quiz_questions q
   SET sort_order = s.rn
  FROM seq s
 WHERE q.id = s.id AND q.sort_order <> s.rn;

-- 3) Garde-fou : empêche d'ajouter deux fois le même texte dans une manche
CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_questions_quiz_text
  ON public.quiz_questions (quiz_id, lower(btrim(text)));

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v74 — Dédoublonnage des questions
-- =====================================================================
