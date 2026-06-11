-- =====================================================================
-- CCB — BIBLE QUIZ CHAMPIONSHIP (Bootcamp Berakah) v66
--
-- P0 : RÉPARER + SÉCURISER + INJECTER LES 87 QUESTIONS.
--
-- Ce que fait cette migration :
--   1. Normalise les tables quiz_* (corrige le bug team_id vs quiz_team_id,
--      ajoute category / difficulty / phase / points / sort_order).
--   2. Unifie l'identité sur l'auth CCB : quiz_profiles.id = auth.users.id
--      (plus de système d'inscription parallèle).
--   3. Sécurise :
--        - vue quiz_questions_public SANS correct_option/free_answer
--          (le joueur ne peut plus lire la bonne réponse dans le navigateur)
--        - écriture du score uniquement via des fonctions SECURITY DEFINER
--          (le score n'est plus calculé/écrit côté client → infalsifiable)
--        - lecture du barème réservée aux modérateurs+
--   4. Injecte les 7 quiz du cahier des charges (87 questions).
--
-- Idempotent. À exécuter dans Supabase SQL Editor.
-- Dépend de public.is_moderator_or_above() (déjà présent, cf. v51).
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. TABLES (création idempotente)
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quiz_teams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  total_score   INTEGER NOT NULL DEFAULT 0,
  current_phase TEXT NOT NULL DEFAULT 'qualifications',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quiz_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT,
  email       TEXT,
  team_id     UUID REFERENCES public.quiz_teams(id) ON DELETE SET NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  level       TEXT NOT NULL DEFAULT 'debutant',
  role        TEXT NOT NULL DEFAULT 'user',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quiz_quizzes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  difficulty  TEXT,
  phase       TEXT NOT NULL DEFAULT 'libre',
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id        UUID NOT NULL REFERENCES public.quiz_quizzes(id) ON DELETE CASCADE,
  text           TEXT NOT NULL,
  option_a       TEXT,
  option_b       TEXT,
  option_c       TEXT,
  option_d       TEXT,
  correct_option TEXT,
  free_answer    TEXT,
  is_difficult   BOOLEAN NOT NULL DEFAULT FALSE,
  points         INTEGER,
  reference      TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id              UUID REFERENCES public.quiz_teams(id) ON DELETE SET NULL,
  quiz_id              UUID NOT NULL REFERENCES public.quiz_quizzes(id) ON DELETE CASCADE,
  question_id          UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_option      TEXT,
  selected_free_answer TEXT,
  is_correct           BOOLEAN NOT NULL DEFAULT FALSE,
  points               INTEGER NOT NULL DEFAULT 0,
  time_taken           INTEGER,
  answered_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id         UUID REFERENCES public.quiz_teams(id) ON DELETE SET NULL,
  quiz_id         UUID NOT NULL REFERENCES public.quiz_quizzes(id) ON DELETE CASCADE,
  score           INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Normalisation des colonnes (si les tables préexistaient) ─────────
ALTER TABLE public.quiz_teams      ADD COLUMN IF NOT EXISTS current_phase TEXT NOT NULL DEFAULT 'qualifications';
ALTER TABLE public.quiz_profiles   ADD COLUMN IF NOT EXISTS team_id UUID;
ALTER TABLE public.quiz_profiles   ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.quiz_profiles   ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.quiz_profiles   ADD COLUMN IF NOT EXISTS level TEXT NOT NULL DEFAULT 'debutant';
ALTER TABLE public.quiz_profiles   ADD COLUMN IF NOT EXISTS total_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.quiz_quizzes    ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.quiz_quizzes    ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.quiz_quizzes    ADD COLUMN IF NOT EXISTS difficulty TEXT;
ALTER TABLE public.quiz_quizzes    ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'libre';
ALTER TABLE public.quiz_quizzes    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.quiz_questions  ADD COLUMN IF NOT EXISTS points INTEGER;
ALTER TABLE public.quiz_questions  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.quiz_answers    ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;

-- Corrige le bug historique : certaines versions écrivaient quiz_team_id.
DO $fix_team$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='quiz_profiles' AND column_name='quiz_team_id') THEN
    EXECUTE 'UPDATE public.quiz_profiles SET team_id = COALESCE(team_id, quiz_team_id) WHERE quiz_team_id IS NOT NULL';
  END IF;
END $fix_team$;

-- Unicité d'une réponse par (utilisateur, question) → empêche le double-scoring.
DO $uniq$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_answers_user_question_uniq') THEN
    -- nettoie d'éventuels doublons avant d'ajouter la contrainte
    DELETE FROM public.quiz_answers a USING public.quiz_answers b
      WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.question_id = b.question_id;
    ALTER TABLE public.quiz_answers
      ADD CONSTRAINT quiz_answers_user_question_uniq UNIQUE (user_id, question_id);
  END IF;
END $uniq$;

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_user   ON public.quiz_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_quiz   ON public.quiz_answers(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_profiles_team  ON public.quiz_profiles(team_id);

-- ─────────────────────────────────────────────────────────────────────
-- 2. RLS
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.quiz_teams     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_quizzes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts  ENABLE ROW LEVEL SECURITY;

-- Équipes : lecture pour tous les connectés ; gestion par les modérateurs+.
DROP POLICY IF EXISTS quiz_teams_read ON public.quiz_teams;
CREATE POLICY quiz_teams_read ON public.quiz_teams FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS quiz_teams_admin ON public.quiz_teams;
CREATE POLICY quiz_teams_admin ON public.quiz_teams FOR ALL
  USING (public.is_moderator_or_above()) WITH CHECK (public.is_moderator_or_above());

-- Profils : lecture pour tous (classement) ; aucune écriture directe
-- (tout passe par les fonctions SECURITY DEFINER ci-dessous). Les modérateurs
-- gardent un accès complet pour l'administration.
DROP POLICY IF EXISTS quiz_profiles_read ON public.quiz_profiles;
CREATE POLICY quiz_profiles_read ON public.quiz_profiles FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS quiz_profiles_admin ON public.quiz_profiles;
CREATE POLICY quiz_profiles_admin ON public.quiz_profiles FOR ALL
  USING (public.is_moderator_or_above()) WITH CHECK (public.is_moderator_or_above());

-- Quiz : lecture pour tous les connectés ; gestion par les modérateurs+.
DROP POLICY IF EXISTS quiz_quizzes_read ON public.quiz_quizzes;
CREATE POLICY quiz_quizzes_read ON public.quiz_quizzes FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS quiz_quizzes_admin ON public.quiz_quizzes;
CREATE POLICY quiz_quizzes_admin ON public.quiz_quizzes FOR ALL
  USING (public.is_moderator_or_above()) WITH CHECK (public.is_moderator_or_above());

-- Questions : la table de base (qui contient les bonnes réponses) n'est
-- lisible QUE par les modérateurs+. Les joueurs passent par la vue publique.
DROP POLICY IF EXISTS quiz_questions_admin_read ON public.quiz_questions;
CREATE POLICY quiz_questions_admin_read ON public.quiz_questions FOR SELECT
  USING (public.is_moderator_or_above());
DROP POLICY IF EXISTS quiz_questions_admin_write ON public.quiz_questions;
CREATE POLICY quiz_questions_admin_write ON public.quiz_questions FOR ALL
  USING (public.is_moderator_or_above()) WITH CHECK (public.is_moderator_or_above());

-- Réponses / tentatives : le joueur lit les siennes ; aucune écriture directe
-- (les fonctions SECURITY DEFINER s'en chargent). Modérateurs : accès complet.
DROP POLICY IF EXISTS quiz_answers_read_own ON public.quiz_answers;
CREATE POLICY quiz_answers_read_own ON public.quiz_answers FOR SELECT
  USING (auth.uid() = user_id OR public.is_moderator_or_above());
DROP POLICY IF EXISTS quiz_answers_admin ON public.quiz_answers;
CREATE POLICY quiz_answers_admin ON public.quiz_answers FOR ALL
  USING (public.is_moderator_or_above()) WITH CHECK (public.is_moderator_or_above());

DROP POLICY IF EXISTS quiz_attempts_read_own ON public.quiz_attempts;
CREATE POLICY quiz_attempts_read_own ON public.quiz_attempts FOR SELECT
  USING (auth.uid() = user_id OR public.is_moderator_or_above());
DROP POLICY IF EXISTS quiz_attempts_admin ON public.quiz_attempts;
CREATE POLICY quiz_attempts_admin ON public.quiz_attempts FOR ALL
  USING (public.is_moderator_or_above()) WITH CHECK (public.is_moderator_or_above());

-- ─────────────────────────────────────────────────────────────────────
-- 3. VUE PUBLIQUE DES QUESTIONS (sans la bonne réponse)
-- ─────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.quiz_questions_public;
CREATE VIEW public.quiz_questions_public AS
  SELECT id, quiz_id, text, option_a, option_b, option_c, option_d,
         is_difficult, reference, sort_order
    FROM public.quiz_questions;
-- La vue n'est pas en security_invoker → elle s'exécute avec les droits de
-- son propriétaire et contourne le RLS restrictif de la table de base,
-- tout en n'exposant jamais correct_option / free_answer.
GRANT SELECT ON public.quiz_questions_public TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 4. FONCTIONS SECURITY DEFINER (logique de jeu sécurisée)
-- ─────────────────────────────────────────────────────────────────────

-- Crée (idempotent) le profil quiz du joueur connecté, à partir de son
-- identité CCB (user_profiles / auth.users).
CREATE OR REPLACE FUNCTION public.quiz_ensure_profile()
RETURNS public.quiz_profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.quiz_profiles;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO public.quiz_profiles (id, name, email)
  SELECT auth.uid(),
         COALESCE((SELECT display_name FROM public.user_profiles WHERE user_id = auth.uid()),
                  (SELECT full_name   FROM public.user_profiles WHERE user_id = auth.uid()),
                  'Joueur'),
         (SELECT email FROM auth.users WHERE id = auth.uid())
  ON CONFLICT (id) DO NOTHING;
  SELECT * INTO v_row FROM public.quiz_profiles WHERE id = auth.uid();
  RETURN v_row;
END $$;

-- Valide une réponse côté serveur, l'enregistre, et renvoie le verdict.
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
  v_q        public.quiz_questions;
  v_team     UUID;
  v_correct  BOOLEAN := FALSE;
  v_points   INTEGER := 0;
  v_in       TEXT;
  v_exp      TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
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

-- Clôture une manche : recalcule le score depuis la source de vérité
-- (les réponses), met à jour profil + niveau + score d'équipe.
CREATE OR REPLACE FUNCTION public.quiz_finish_attempt(p_quiz_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_team    UUID;
  v_score   INTEGER;
  v_total_q INTEGER;
  v_total   INTEGER;
  v_level   TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  PERFORM public.quiz_ensure_profile();
  SELECT team_id INTO v_team FROM public.quiz_profiles WHERE id = auth.uid();

  SELECT COALESCE(SUM(points), 0) INTO v_score
    FROM public.quiz_answers WHERE user_id = auth.uid() AND quiz_id = p_quiz_id;
  SELECT COUNT(*) INTO v_total_q FROM public.quiz_questions WHERE quiz_id = p_quiz_id;

  INSERT INTO public.quiz_attempts (user_id, team_id, quiz_id, score, total_questions)
  VALUES (auth.uid(), v_team, p_quiz_id, v_score, v_total_q);

  SELECT COALESCE(SUM(points), 0) INTO v_total
    FROM public.quiz_answers WHERE user_id = auth.uid();
  v_level := CASE WHEN v_total >= 500 THEN 'expert'
                  WHEN v_total >= 300 THEN 'avancé'
                  WHEN v_total >= 100 THEN 'intermediaire'
                  ELSE 'debutant' END;
  UPDATE public.quiz_profiles SET total_score = v_total, level = v_level WHERE id = auth.uid();

  IF v_team IS NOT NULL THEN
    UPDATE public.quiz_teams
       SET total_score = (SELECT COALESCE(SUM(total_score), 0) FROM public.quiz_profiles WHERE team_id = v_team)
     WHERE id = v_team;
  END IF;

  RETURN jsonb_build_object('score', v_score, 'total_score', v_total, 'level', v_level, 'total_questions', v_total_q);
END $$;

-- Rejoindre une équipe existante.
CREATE OR REPLACE FUNCTION public.quiz_join_team(p_team_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  PERFORM public.quiz_ensure_profile();
  UPDATE public.quiz_profiles SET team_id = p_team_id WHERE id = auth.uid();
END $$;

-- Rejoindre une équipe par son nom (la crée si elle n'existe pas).
CREATE OR REPLACE FUNCTION public.quiz_create_or_join_team(p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_team UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF btrim(COALESCE(p_name, '')) = '' THEN RAISE EXCEPTION 'nom requis'; END IF;
  SELECT id INTO v_team FROM public.quiz_teams WHERE lower(name) = lower(btrim(p_name)) LIMIT 1;
  IF v_team IS NULL THEN
    INSERT INTO public.quiz_teams (name) VALUES (btrim(p_name)) RETURNING id INTO v_team;
  END IF;
  PERFORM public.quiz_ensure_profile();
  UPDATE public.quiz_profiles SET team_id = v_team WHERE id = auth.uid();
  RETURN v_team;
END $$;

GRANT EXECUTE ON FUNCTION public.quiz_ensure_profile()                              TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_submit_answer(UUID, UUID, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_finish_attempt(UUID)                           TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_join_team(UUID)                                TO authenticated;
GRANT EXECUTE ON FUNCTION public.quiz_create_or_join_team(TEXT)                       TO authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- 5. SEED — 7 quiz / 87 questions (idempotent : par titre de quiz)
-- ─────────────────────────────────────────────────────────────────────
DO $seed$
DECLARE v UUID;
BEGIN
  -- ── MANCHE 1 — Découverte (facile / qualifications) ──────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_quizzes WHERE title = 'Manche 1 — Découverte') THEN
    INSERT INTO public.quiz_quizzes (title, description, category, difficulty, phase, sort_order, is_active)
    VALUES ('Manche 1 — Découverte', 'Questions bibliques faciles pour entrer dans le championnat.', 'decouverte', 'facile', 'qualifications', 1, TRUE)
    RETURNING id INTO v;
    INSERT INTO public.quiz_questions (quiz_id, text, option_a, option_b, option_c, option_d, correct_option, is_difficult, reference, sort_order) VALUES
      (v, 'Qui a construit l''arche selon l''ordre de Dieu ?', 'Abraham', 'Moïse', 'Noé', 'David', 'C', FALSE, 'Genèse 6:14', 1),
      (v, 'Qui était la mère de Jésus ?', 'Marthe', 'Marie', 'Élisabeth', 'Anne', 'B', FALSE, 'Luc 1:30-31', 2),
      (v, 'Dans quelle ville Jésus est-il né ?', 'Nazareth', 'Jérusalem', 'Bethléem', 'Capernaüm', 'C', FALSE, 'Luc 2:4-7', 3),
      (v, 'Qui a baptisé Jésus ?', 'Pierre', 'Jacques', 'Jean-Baptiste', 'André', 'C', FALSE, 'Matthieu 3:13-17', 4),
      (v, 'Combien d''apôtres Jésus a-t-il choisis ?', '10', '11', '12', '13', 'C', FALSE, 'Luc 6:13', 5),
      (v, 'Qui a vaincu Goliath ?', 'Samuel', 'David', 'Saül', 'Jonathan', 'B', FALSE, '1 Samuel 17', 6),
      (v, 'Qui a reçu les Dix Commandements ?', 'Josué', 'Aaron', 'Moïse', 'Abraham', 'C', FALSE, 'Exode 31:18', 7),
      (v, 'Qui a été jeté dans la fosse aux lions ?', 'Jérémie', 'Ézéchiel', 'Daniel', 'Ésaïe', 'C', FALSE, 'Daniel 6', 8),
      (v, 'Qui a trahi Jésus ?', 'Pierre', 'Judas Iscariot', 'Thomas', 'Philippe', 'B', FALSE, 'Matthieu 26:14-16', 9),
      (v, 'Quel disciple a marché sur l''eau vers Jésus ?', 'Jean', 'André', 'Pierre', 'Jacques', 'C', FALSE, 'Matthieu 14:29', 10),
      (v, 'Qui a interprété les rêves de Pharaon ?', 'Daniel', 'Joseph', 'Aaron', 'Élie', 'B', FALSE, 'Genèse 41', 11),
      (v, 'Qui était reine en Perse ?', 'Ruth', 'Déborah', 'Esther', 'Marie', 'C', FALSE, 'Esther 2:17', 12),
      (v, 'Quel prophète a été envoyé à Ninive ?', 'Amos', 'Jonas', 'Michée', 'Nahum', 'B', FALSE, 'Jonas 1:1-2', 13),
      (v, 'Qui a vu un buisson ardent sans qu''il se consume ?', 'Aaron', 'Josué', 'Moïse', 'Samuel', 'C', FALSE, 'Exode 3:2', 14),
      (v, 'Qui était le père d''Isaac ?', 'Jacob', 'Abraham', 'Lot', 'Joseph', 'B', FALSE, 'Genèse 21:1-3', 15);
  END IF;

  -- ── MANCHE 2 — Transformation (moyen / quarts) ──────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_quizzes WHERE title = 'Manche 2 — Transformation') THEN
    INSERT INTO public.quiz_quizzes (title, description, category, difficulty, phase, sort_order)
    VALUES ('Manche 2 — Transformation', 'Niveau intermédiaire.', 'transformation', 'moyen', 'quarts', 2)
    RETURNING id INTO v;
    INSERT INTO public.quiz_questions (quiz_id, text, option_a, option_b, option_c, option_d, correct_option, is_difficult, reference, sort_order) VALUES
      (v, 'Quel homme est devenu l''apôtre Paul après sa conversion ?', 'Barnabas', 'Saul de Tarse', 'Silas', 'Timothée', 'B', FALSE, 'Actes 9', 1),
      (v, 'Quel juge d''Israël a perdu sa force après avoir révélé son secret à Delila ?', 'Gédéon', 'Jephté', 'Samson', 'Éli', 'C', FALSE, 'Juges 16', 2),
      (v, 'Qui a déclaré : « Me voici, envoie-moi » ?', 'Jérémie', 'Élie', 'Ésaïe', 'Amos', 'C', FALSE, 'Ésaïe 6:8', 3),
      (v, 'Qui a interprété l''écriture apparue sur le mur du palais de Belshatsar ?', 'Ézéchiel', 'Daniel', 'Esdras', 'Néhémie', 'B', FALSE, 'Daniel 5', 4),
      (v, 'Quel roi a demandé la sagesse à Dieu ?', 'David', 'Ézéchias', 'Salomon', 'Josias', 'C', FALSE, '1 Rois 3:9', 5),
      (v, 'Quel prophète a entendu Dieu dans un murmure doux et léger ?', 'Jérémie', 'Ésaïe', 'Élie', 'Amos', 'C', FALSE, '1 Rois 19:12', 6),
      (v, 'Qui Jésus a-t-il ressuscité à Béthanie ?', 'Bartimée', 'Lazare', 'Jaïrus', 'Étienne', 'B', FALSE, 'Jean 11', 7),
      (v, 'Quel disciple était collecteur d''impôts avant de suivre Jésus ?', 'Pierre', 'Matthieu', 'Thomas', 'Philippe', 'B', FALSE, 'Matthieu 9:9', 8),
      (v, 'Qui a écrit l''Évangile selon Luc et le livre des Actes ?', 'Paul', 'Pierre', 'Luc', 'Jean', 'C', FALSE, NULL, 9),
      (v, 'Qui a remplacé Judas parmi les apôtres ?', 'Silas', 'Barnabas', 'Matthias', 'Marc', 'C', FALSE, 'Actes 1:26', 10),
      (v, 'Quel homme a demandé à Jésus : « Que faut-il que je fasse pour hériter la vie éternelle ? »', 'Nicodème', 'Le jeune homme riche', 'Zachée', 'Bartimée', 'B', FALSE, 'Marc 10:17', 11),
      (v, 'Qui était le père de Jean-Baptiste ?', 'Siméon', 'Zacharie', 'Joseph', 'Nicodème', 'B', FALSE, 'Luc 1:13', 12),
      (v, 'Qui a conduit les Israélites dans le pays de Canaan après Moïse ?', 'Caleb', 'Aaron', 'Josué', 'Samuel', 'C', FALSE, 'Josué 1', 13),
      (v, 'Qui a été vendu par ses frères puis est devenu gouverneur en Égypte ?', 'Benjamin', 'Ruben', 'Joseph', 'Juda', 'C', FALSE, 'Genèse 37-41', 14),
      (v, 'Quel disciple a douté de la résurrection avant de voir Jésus ?', 'André', 'Thomas', 'Philippe', 'Jacques', 'B', FALSE, 'Jean 20:24-29', 15);
  END IF;

  -- ── MANCHE 3 — Feu du Saint-Esprit (difficile / demi → 2 pts) ───────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_quizzes WHERE title = 'Manche 3 — Feu du Saint-Esprit') THEN
    INSERT INTO public.quiz_quizzes (title, description, category, difficulty, phase, sort_order)
    VALUES ('Manche 3 — Feu du Saint-Esprit', 'Niveau difficile : chaque bonne réponse vaut 2 points.', 'feu_saint_esprit', 'difficile', 'demi', 3)
    RETURNING id INTO v;
    INSERT INTO public.quiz_questions (quiz_id, text, option_a, option_b, option_c, option_d, correct_option, is_difficult, reference, sort_order) VALUES
      (v, 'À quelle fête le Saint-Esprit est-il descendu sur les disciples ?', 'Pâque', 'Pentecôte', 'Pourim', 'Hanoucca', 'B', TRUE, 'Actes 2', 1),
      (v, 'Sous quelle forme le Saint-Esprit est-il descendu sur Jésus lors de son baptême ?', 'Feu', 'Vent', 'Colombe', 'Nuée', 'C', TRUE, 'Matthieu 3:16', 2),
      (v, 'Dans quel chapitre trouve-t-on une liste importante des dons spirituels ?', 'Romains 3', 'Galates 2', '1 Corinthiens 12', 'Éphésiens 2', 'C', TRUE, '1 Corinthiens 12', 3),
      (v, 'Quel fruit de l''Esprit est cité en premier dans Galates 5:22 ?', 'Joie', 'Paix', 'Amour', 'Patience', 'C', TRUE, 'Galates 5:22', 4),
      (v, 'Qui fut le premier martyr chrétien ?', 'Pierre', 'Jacques', 'Étienne', 'Barnabas', 'C', TRUE, 'Actes 7', 5),
      (v, 'Quel prophète a vu une vallée d''ossements desséchés ?', 'Jérémie', 'Ézéchiel', 'Amos', 'Zacharie', 'B', TRUE, 'Ézéchiel 37', 6),
      (v, 'Quel apôtre a écrit aux Églises de Corinthe ?', 'Pierre', 'Jacques', 'Paul', 'Jean', 'C', TRUE, '1 Corinthiens 1', 7),
      (v, 'Qui était le compagnon missionnaire de Paul lors de son premier voyage missionnaire ?', 'Timothée', 'Barnabas', 'Luc', 'Tite', 'B', TRUE, 'Actes 13', 8),
      (v, 'Qui a reçu la vision de la nappe descendant du ciel ?', 'Jacques', 'Jean', 'Pierre', 'Philippe', 'C', TRUE, 'Actes 10', 9),
      (v, 'Quel livre de la Bible raconte principalement les débuts de l''Église ?', 'Romains', 'Actes', 'Hébreux', 'Jacques', 'B', TRUE, 'Actes', 10);
  END IF;

  -- ── GRANDE FINALE — Expert (réponses libres / finale → 2 pts) ───────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_quizzes WHERE title = 'Grande Finale — Expert') THEN
    INSERT INTO public.quiz_quizzes (title, description, category, difficulty, phase, sort_order)
    VALUES ('Grande Finale — Expert', 'Réponses courtes à saisir. Réservé aux finalistes.', 'grande_finale', 'expert', 'finale', 4)
    RETURNING id INTO v;
    INSERT INTO public.quiz_questions (quiz_id, text, correct_option, free_answer, is_difficult, reference, sort_order) VALUES
      (v, 'Combien de jours Jésus a-t-il jeûné dans le désert ?', 'free', '40 jours', TRUE, 'Matthieu 4:2', 1),
      (v, 'Qui est appelé le père des croyants ?', 'free', 'Abraham', TRUE, 'Romains 4:11', 2),
      (v, 'Selon Actes 1:8, les disciples devaient recevoir une puissance lorsque qui viendrait sur eux ?', 'free', 'Le Saint-Esprit', TRUE, 'Actes 1:8', 3),
      (v, 'Quel livre clôture le Nouveau Testament ?', 'free', 'Apocalypse', TRUE, NULL, 4),
      (v, 'Qui a écrit la majorité des épîtres du Nouveau Testament ?', 'free', 'Paul', TRUE, NULL, 5),
      (v, 'Quel prophète a annoncé que le Messie naîtrait d''une vierge ?', 'free', 'Ésaïe', TRUE, 'Ésaïe 7:14', 6),
      (v, 'Quel homme est resté fidèle à Dieu malgré la perte de ses biens et de ses enfants ?', 'free', 'Job', TRUE, 'Job 1', 7),
      (v, 'Qui a déclaré : « L''Éternel est mon berger » ?', 'free', 'David', TRUE, 'Psaume 23', 8),
      (v, 'Quel est le plus grand commandement selon Jésus ?', 'free', 'Aimer Dieu', TRUE, 'Matthieu 22:37', 9),
      (v, 'Complète : « Vous recevrez une puissance, le _______ survenant sur vous. »', 'free', 'Saint-Esprit', TRUE, 'Actes 1:8', 10);
  END IF;

  -- ── QUESTIONS PIÈGES (QCM, libre) ───────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_quizzes WHERE title = 'Questions Pièges') THEN
    INSERT INTO public.quiz_quizzes (title, description, category, difficulty, phase, sort_order)
    VALUES ('Questions Pièges', 'Attention aux pièges ! Lisez bien chaque question.', 'pieges', 'moyen', 'libre', 5)
    RETURNING id INTO v;
    INSERT INTO public.quiz_questions (quiz_id, text, option_a, option_b, option_c, option_d, correct_option, is_difficult, reference, sort_order) VALUES
      (v, 'Combien d''animaux Moïse a-t-il pris dans l''arche ?', 'Deux de chaque', 'Sept de chaque', 'Aucun', 'Quatorze', 'C', FALSE, 'Piège : c''était Noé, pas Moïse.', 1),
      (v, 'Jésus a-t-il écrit un livre de la Bible ?', 'Oui', 'Non', NULL, NULL, 'B', FALSE, 'Jésus n''a écrit aucun livre de la Bible.', 2),
      (v, 'La Bible dit-elle que le grand poisson était une baleine ?', 'Oui', 'Non', NULL, NULL, 'B', FALSE, 'La Bible dit « un grand poisson » (Jonas 1:17).', 3),
      (v, 'Adam avait-il une belle-mère ?', 'Oui', 'Non', NULL, NULL, 'B', FALSE, 'Adam n''avait pas de belle-mère.', 4),
      (v, 'David a-t-il tué Goliath avec une épée ?', 'Oui, dès le départ', 'Non, avec une fronde et une pierre', 'Avec un arc', 'Avec une lance', 'B', FALSE, '1 Samuel 17:50 — la fronde d''abord, puis l''épée de Goliath.', 5);
  END IF;

  -- ── KAHOOT BIBLIQUE (30 QCM faciles) ────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_quizzes WHERE title = 'Kahoot Biblique') THEN
    INSERT INTO public.quiz_quizzes (title, description, category, difficulty, phase, sort_order)
    VALUES ('Kahoot Biblique', '30 questions rapides pour toute l''assemblée.', 'kahoot', 'facile', 'libre', 6)
    RETURNING id INTO v;
    INSERT INTO public.quiz_questions (quiz_id, text, option_a, option_b, option_c, option_d, correct_option, is_difficult, sort_order) VALUES
      (v, 'Qui a construit l''arche ?', 'Moïse', 'Noé', 'David', 'Pierre', 'B', FALSE, 1),
      (v, 'Combien de disciples Jésus avait-il ?', '10', '11', '12', '13', 'C', FALSE, 2),
      (v, 'Qui a vaincu Goliath ?', 'Samuel', 'Saül', 'David', 'Josué', 'C', FALSE, 3),
      (v, 'Quel prophète a été avalé par un grand poisson ?', 'Élie', 'Jonas', 'Ésaïe', 'Daniel', 'B', FALSE, 4),
      (v, 'Qui a trahi Jésus ?', 'Pierre', 'Thomas', 'Judas', 'Jean', 'C', FALSE, 5),
      (v, 'Où Jésus est-il né ?', 'Nazareth', 'Bethléem', 'Jérusalem', 'Rome', 'B', FALSE, 6),
      (v, 'Qui était la mère de Jésus ?', 'Marthe', 'Marie', 'Sara', 'Ruth', 'B', FALSE, 7),
      (v, 'Quel disciple a marché sur l''eau avec Jésus ?', 'Jean', 'Paul', 'Pierre', 'André', 'C', FALSE, 8),
      (v, 'Qui a reçu les Dix Commandements ?', 'Abraham', 'Moïse', 'Aaron', 'Jacob', 'B', FALSE, 9),
      (v, 'Qui a interprété les rêves de Pharaon ?', 'Joseph', 'Daniel', 'David', 'Samuel', 'A', FALSE, 10),
      (v, 'Quel roi a écrit beaucoup de proverbes ?', 'David', 'Saül', 'Salomon', 'Josias', 'C', FALSE, 11),
      (v, 'Qui était dans la fosse aux lions ?', 'Élie', 'Daniel', 'Paul', 'Pierre', 'B', FALSE, 12),
      (v, 'Dans quel livre trouve-t-on le fruit de l''Esprit ?', 'Romains', 'Galates', 'Actes', 'Jean', 'B', FALSE, 13),
      (v, 'Qui a baptisé Jésus ?', 'Pierre', 'Paul', 'Jean-Baptiste', 'Thomas', 'C', FALSE, 14),
      (v, 'Quel miracle Jésus a-t-il accompli à Cana ?', 'Multiplication des pains', 'Marche sur l''eau', 'Eau changée en vin', 'Guérison d''un aveugle', 'C', FALSE, 15),
      (v, 'Combien de pains lors de la multiplication des pains ?', '3', '5', '7', '12', 'B', FALSE, 16),
      (v, 'Qui était reine en Perse ?', 'Déborah', 'Esther', 'Marie', 'Ruth', 'B', FALSE, 17),
      (v, 'Qui a renié Jésus trois fois ?', 'Thomas', 'Pierre', 'Jean', 'Judas', 'B', FALSE, 18),
      (v, 'Qui Jésus a-t-il ressuscité à Béthanie ?', 'Bartimée', 'Lazare', 'Étienne', 'Timothée', 'B', FALSE, 19),
      (v, 'Quel apôtre était collecteur d''impôts ?', 'Matthieu', 'Jean', 'André', 'Philippe', 'A', FALSE, 20),
      (v, 'Qui a vu le buisson ardent ?', 'Élie', 'Moïse', 'Aaron', 'Jacob', 'B', FALSE, 21),
      (v, 'Quel disciple doutait de la résurrection de Jésus ?', 'Pierre', 'Thomas', 'Jean', 'Matthieu', 'B', FALSE, 22),
      (v, 'Qui a écrit la majorité des épîtres du Nouveau Testament ?', 'Pierre', 'Jean', 'Paul', 'Luc', 'C', FALSE, 23),
      (v, 'Quel peuple a traversé la mer Rouge ?', 'Les Romains', 'Les Égyptiens', 'Les Israélites', 'Les Philistins', 'C', FALSE, 24),
      (v, 'Qui a été jeté dans la fournaise ardente ?', 'Shadrak, Méshak et Abed-Nego', 'Pierre et Jean', 'Paul et Silas', 'David et Jonathan', 'A', FALSE, 25),
      (v, 'Qui fut le premier martyr chrétien ?', 'Étienne', 'Paul', 'Barnabas', 'Timothée', 'A', FALSE, 26),
      (v, 'Quel évangile contient le plus de paraboles ?', 'Matthieu', 'Marc', 'Luc', 'Jean', 'C', FALSE, 27),
      (v, 'Qui a remplacé Judas parmi les apôtres ?', 'Barnabas', 'Matthias', 'Silas', 'Tite', 'B', FALSE, 28),
      (v, 'Quel est le plus court verset de la Bible ?', 'Priez sans cesse', 'Jésus pleura', 'Dieu est amour', 'Soyez saints', 'B', FALSE, 29),
      (v, 'Quel est le dernier livre du Nouveau Testament ?', 'Jude', 'Hébreux', 'Apocalypse', 'Actes', 'C', FALSE, 30);
  END IF;

  -- ── QUESTIONS BONUS (5 points chacune) ──────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.quiz_quizzes WHERE title = 'Questions Bonus') THEN
    INSERT INTO public.quiz_quizzes (title, description, category, difficulty, phase, sort_order)
    VALUES ('Questions Bonus', 'Questions bonus à 5 points pour départager.', 'bonus', 'expert', 'finale', 7)
    RETURNING id INTO v;
    INSERT INTO public.quiz_questions (quiz_id, text, option_a, option_b, option_c, option_d, correct_option, is_difficult, points, reference, sort_order) VALUES
      (v, 'Combien de livres compte la Bible protestante ?', '39', '66', '73', '81', 'B', TRUE, 5, NULL, 1),
      (v, 'Qui a déclaré : « Pour moi, vivre c''est Christ, et mourir est un gain » ?', 'Pierre', 'Jean', 'Paul', 'Timothée', 'C', TRUE, 5, 'Philippiens 1:21', 2);
  END IF;
END $seed$;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v66 — Bible Quiz Championship (P0)
-- =====================================================================
