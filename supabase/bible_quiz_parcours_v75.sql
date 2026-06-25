-- =====================================================================
-- CCB — BIBLE QUIZ : PARCOURS DE DISCIPOLAT (gamifié)  v75
--
--   Nouveau MODE, distinct du championnat (4 phases). 9 niveaux × 5 étapes
--   (1 manche = 1 étape, 10 questions). Réutilise le moteur existant
--   (quiz_quizzes / quiz_questions / quiz_submit_answer / quiz_finish_attempt).
--
--   Progression : déblocage LINÉAIRE — une étape s'ouvre quand l'étape
--   précédente est réussie à ≥ 80 % (donc franchir un niveau = réussir ses
--   5 étapes). Badges / XP / titres dérivés de la complétion (pas d'état
--   supplémentaire à écrire).
--
--   Cette migration crée la STRUCTURE + le Niveau 1 complet (50 questions).
--   Les niveaux 2→9 sont créés vides (questions ajoutées par lots ensuite).
--
-- Idempotent. À exécuter dans Supabase SQL Editor. Dépend de v66 + v73.
-- =====================================================================

-- ─── 1. Colonnes parcours sur quiz_quizzes ───────────────────────────
ALTER TABLE public.quiz_quizzes ADD COLUMN IF NOT EXISTS track TEXT NOT NULL DEFAULT 'championnat';
ALTER TABLE public.quiz_quizzes ADD COLUMN IF NOT EXISTS level INTEGER;
CREATE INDEX IF NOT EXISTS idx_quiz_quizzes_track ON public.quiz_quizzes(track, level, sort_order);

-- ─── 2. Niveaux du parcours (badge / XP / titre) ─────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_parcours_levels (
  level       INTEGER PRIMARY KEY,
  label       TEXT NOT NULL,
  badge_emoji TEXT NOT NULL DEFAULT '🏅',
  badge_label TEXT NOT NULL,
  xp          INTEGER NOT NULL DEFAULT 0,
  title       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL
);
ALTER TABLE public.quiz_parcours_levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quiz_parcours_levels_read ON public.quiz_parcours_levels;
CREATE POLICY quiz_parcours_levels_read ON public.quiz_parcours_levels
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS quiz_parcours_levels_admin ON public.quiz_parcours_levels;
CREATE POLICY quiz_parcours_levels_admin ON public.quiz_parcours_levels
  FOR ALL USING (public.is_moderator_or_above()) WITH CHECK (public.is_moderator_or_above());

INSERT INTO public.quiz_parcours_levels (level, label, badge_label, xp, title, sort_order) VALUES
  (1, 'Naissance',     'Né de nouveau',          500,  'Nouveau Converti',        1),
  (2, 'Fondations',    'Enraciné en Christ',     1000, 'Disciple',                2),
  (3, 'Croissance',    'Vie transformée',        1500, 'Disciple Enraciné',       3),
  (4, 'Maturité',      'Disciple mature',        2000, 'Disciple Mature',         4),
  (5, 'Consécration',  'Ami de Dieu',            2500, 'Ami de Dieu',             5),
  (6, 'Autorité',      'Guerrier spirituel',     3000, 'Guerrier Spirituel',      6),
  (7, 'Leadership',    'Leader du Royaume',      3500, 'Leader du Royaume',       7),
  (8, 'Mission',       'Ambassadeur du Royaume', 4000, 'Ambassadeur du Royaume',  8),
  (9, 'Manifestation', 'Porteur de gloire',      5000, 'Porteur de Gloire',       9)
ON CONFLICT (level) DO UPDATE
  SET label = EXCLUDED.label, badge_label = EXCLUDED.badge_label,
      xp = EXCLUDED.xp, title = EXCLUDED.title, sort_order = EXCLUDED.sort_order;

-- ─── 3. Les 45 étapes (manches) — créées si absentes ─────────────────
INSERT INTO public.quiz_quizzes (title, description, category, difficulty, phase, sort_order, is_active, track, level)
SELECT x.title, x.descr, 'parcours', 'progressif', 'libre', x.etape, TRUE, 'parcours', x.lvl
FROM (VALUES
  (1,1,'N1 · É1 — Le Salut','Niveau 1 Naissance — étape 1'),
  (1,2,'N1 · É2 — La Croix','Niveau 1 Naissance — étape 2'),
  (1,3,'N1 · É3 — Nouvelle Naissance','Niveau 1 Naissance — étape 3'),
  (1,4,'N1 · É4 — Jésus-Christ','Niveau 1 Naissance — étape 4'),
  (1,5,'N1 · É5 — Assurance du Salut','Niveau 1 Naissance — étape 5'),
  (2,1,'N2 · É1 — La Bible','Niveau 2 Fondations — étape 1'),
  (2,2,'N2 · É2 — La Prière','Niveau 2 Fondations — étape 2'),
  (2,3,'N2 · É3 — Le Saint-Esprit','Niveau 2 Fondations — étape 3'),
  (2,4,'N2 · É4 — L''Église','Niveau 2 Fondations — étape 4'),
  (2,5,'N2 · É5 — Fondations Chrétiennes','Niveau 2 Fondations — étape 5'),
  (3,1,'N3 · É1 — Identité en Christ','Niveau 3 Croissance — étape 1'),
  (3,2,'N3 · É2 — Renouvellement de l''Intelligence','Niveau 3 Croissance — étape 2'),
  (3,3,'N3 · É3 — Gestion des Émotions','Niveau 3 Croissance — étape 3'),
  (3,4,'N3 · É4 — Sanctification','Niveau 3 Croissance — étape 4'),
  (3,5,'N3 · É5 — Transformation Quotidienne','Niveau 3 Croissance — étape 5'),
  (4,1,'N4 · É1 — Discipline Spirituelle','Niveau 4 Maturité — étape 1'),
  (4,2,'N4 · É2 — Fidélité','Niveau 4 Maturité — étape 2'),
  (4,3,'N4 · É3 — Persévérance','Niveau 4 Maturité — étape 3'),
  (4,4,'N4 · É4 — Gestion des Épreuves','Niveau 4 Maturité — étape 4'),
  (4,5,'N4 · É5 — Maturité Spirituelle','Niveau 4 Maturité — étape 5'),
  (5,1,'N5 · É1 — Adoration','Niveau 5 Consécration — étape 1'),
  (5,2,'N5 · É2 — Intimité avec Dieu','Niveau 5 Consécration — étape 2'),
  (5,3,'N5 · É3 — Sensibilité au Saint-Esprit','Niveau 5 Consécration — étape 3'),
  (5,4,'N5 · É4 — Sanctification Avancée','Niveau 5 Consécration — étape 4'),
  (5,5,'N5 · É5 — Vie d''Intimité','Niveau 5 Consécration — étape 5'),
  (6,1,'N6 · É1 — Combat Spirituel','Niveau 6 Autorité — étape 1'),
  (6,2,'N6 · É2 — Autorité du Croyant','Niveau 6 Autorité — étape 2'),
  (6,3,'N6 · É3 — Foi et Victoire','Niveau 6 Autorité — étape 3'),
  (6,4,'N6 · É4 — Délivrance','Niveau 6 Autorité — étape 4'),
  (6,5,'N6 · É5 — Guerre Spirituelle','Niveau 6 Autorité — étape 5'),
  (7,1,'N7 · É1 — Leadership Biblique','Niveau 7 Leadership — étape 1'),
  (7,2,'N7 · É2 — Caractère','Niveau 7 Leadership — étape 2'),
  (7,3,'N7 · É3 — Serviteur-Leader','Niveau 7 Leadership — étape 3'),
  (7,4,'N7 · É4 — Gestion des Hommes','Niveau 7 Leadership — étape 4'),
  (7,5,'N7 · É5 — Leadership Chrétien','Niveau 7 Leadership — étape 5'),
  (8,1,'N8 · É1 — Évangélisation','Niveau 8 Mission — étape 1'),
  (8,2,'N8 · É2 — Discipulat','Niveau 8 Mission — étape 2'),
  (8,3,'N8 · É3 — Multiplication','Niveau 8 Mission — étape 3'),
  (8,4,'N8 · É4 — Mission Mondiale','Niveau 8 Mission — étape 4'),
  (8,5,'N8 · É5 — Impact du Royaume','Niveau 8 Mission — étape 5'),
  (9,1,'N9 · É1 — Puissance de Dieu','Niveau 9 Manifestation — étape 1'),
  (9,2,'N9 · É2 — Dons Spirituels','Niveau 9 Manifestation — étape 2'),
  (9,3,'N9 · É3 — Foi Surnaturelle','Niveau 9 Manifestation — étape 3'),
  (9,4,'N9 · É4 — Royaume et Gloire','Niveau 9 Manifestation — étape 4'),
  (9,5,'N9 · É5 — Manifestation du Royaume','Niveau 9 Manifestation — étape 5')
) AS x(lvl, etape, title, descr)
WHERE NOT EXISTS (
  SELECT 1 FROM public.quiz_quizzes q
  WHERE q.track = 'parcours' AND q.level = x.lvl AND q.sort_order = x.etape
);

-- ─── 4. Questions du NIVEAU 1 (50) — insérées si l'étape est vide ─────
DO $seed1$
DECLARE v UUID;
BEGIN
  -- É1 — Le Salut
  SELECT id INTO v FROM public.quiz_quizzes WHERE track='parcours' AND level=1 AND sort_order=1;
  IF v IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id=v) THEN
    INSERT INTO public.quiz_questions (quiz_id, text, option_a, option_b, option_c, option_d, correct_option, is_difficult, reference, sort_order) VALUES
      (v,'Qui est le Sauveur du monde ?','Moïse','Jésus-Christ','Abraham','Jean-Baptiste','B',FALSE,'Actes 4:12',1),
      (v,'Que signifie le mot « Évangile » ?','La Loi','La Bonne Nouvelle','La Prière','Le Temple','B',FALSE,'Marc 1:1',2),
      (v,'Que déclare Jean 3:16 ?','Dieu a tant aimé le monde qu''il a donné son Fils unique','Aimez vos ennemis','Au commencement était la Parole','Tu ne tueras point','A',FALSE,'Jean 3:16',3),
      (v,'Pourquoi Jésus est-il mort ?','Pour ses propres péchés','Pour nos péchés','Par accident','Pour devenir roi','B',FALSE,'1 Corinthiens 15:3',4),
      (v,'Qu''est-ce que le péché ?','Une maladie','La transgression de la loi de Dieu','Une tradition','Une offrande','B',FALSE,'1 Jean 3:4',5),
      (v,'Par qui le péché est-il entré dans le monde ?','Caïn','Adam','Satan','Pharaon','B',FALSE,'Romains 5:12',6),
      (v,'Peut-on être sauvé par les œuvres ?','Oui','Non — c''est par la grâce, au moyen de la foi','Seulement par la Loi','Seulement les riches','B',FALSE,'Éphésiens 2:8-9',7),
      (v,'Que faut-il faire pour être sauvé ?','Payer une dîme','Croire au Seigneur Jésus','Jeûner 40 jours','Devenir prêtre','B',FALSE,'Actes 16:31',8),
      (v,'Jésus est-il ressuscité d''entre les morts ?','Oui','Non','Seulement en esprit','La Bible ne le dit pas','A',FALSE,'1 Corinthiens 15:4',9),
      (v,'Combien de jours après sa mort Jésus est-il ressuscité ?','Le 2e jour','Le 3e jour','Le 7e jour','Le 40e jour','B',FALSE,'Luc 24:7',10);
  END IF;

  -- É2 — La Croix
  SELECT id INTO v FROM public.quiz_quizzes WHERE track='parcours' AND level=1 AND sort_order=2;
  IF v IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id=v) THEN
    INSERT INTO public.quiz_questions (quiz_id, text, option_a, option_b, option_c, option_d, correct_option, is_difficult, reference, sort_order) VALUES
      (v,'Sur quoi Jésus a-t-il été mis à mort ?','Un autel','Une croix','Un bûcher','Un rocher','B',FALSE,'Jean 19:18',1),
      (v,'En quel lieu Jésus a-t-il été crucifié ?','Béthanie','Golgotha (le lieu du Crâne)','Capernaüm','Gethsémané','B',FALSE,'Jean 19:17',2),
      (v,'Combien d''hommes ont été crucifiés avec Jésus ?','Un','Deux','Trois','Aucun','B',FALSE,'Luc 23:32-33',3),
      (v,'Qu''a dit Jésus au brigand repentant ?','« Tu es perdu »','« Aujourd''hui tu seras avec moi dans le paradis »','« Reviens demain »','Rien','B',FALSE,'Luc 23:43',4),
      (v,'Qu''est-ce qui nous purifie de tout péché (1 Jean 1:7) ?','L''eau','Le sang de Jésus','Les œuvres','La Loi','B',FALSE,'1 Jean 1:7',5),
      (v,'Qu''est-ce que la grâce ?','Une récompense méritée','Une faveur imméritée de Dieu','Une punition','Un impôt','B',FALSE,'Éphésiens 2:8',6),
      (v,'Que s''est-il déchiré dans le temple à la mort de Jésus ?','Le toit','Le voile','L''autel','La porte','B',FALSE,'Matthieu 27:51',7),
      (v,'Qui a porté la croix de Jésus une partie du chemin ?','Pierre','Simon de Cyrène','Jean','Nicodème','B',FALSE,'Luc 23:26',8),
      (v,'Quelle parole de Jésus exprime le pardon de ses bourreaux ?','« Père, pardonne-leur »','« Vengeance ! »','« J''ai soif »','« Élie ! »','A',FALSE,'Luc 23:34',9),
      (v,'Qu''a dit Jésus juste avant de rendre l''esprit ?','« Tout est accompli »','« Je reviens »','« Sauve-toi »','« Suivez-moi »','A',FALSE,'Jean 19:30',10);
  END IF;

  -- É3 — Nouvelle Naissance
  SELECT id INTO v FROM public.quiz_quizzes WHERE track='parcours' AND level=1 AND sort_order=3;
  IF v IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id=v) THEN
    INSERT INTO public.quiz_questions (quiz_id, text, option_a, option_b, option_c, option_d, correct_option, is_difficult, reference, sort_order) VALUES
      (v,'Quel chef des Juifs est venu voir Jésus de nuit ?','Gamaliel','Nicodème','Caïphe','Joseph d''Arimathée','B',FALSE,'Jean 3:1-2',1),
      (v,'Que faut-il pour voir le royaume de Dieu (Jean 3:3) ?','Être riche','Naître de nouveau','Être circoncis','Jeûner','B',FALSE,'Jean 3:3',2),
      (v,'Selon Jean 3:5, il faut naître d''eau et de quoi ?','De feu','d''Esprit','de sang','de la Loi','B',FALSE,'Jean 3:5',3),
      (v,'Qu''est-ce que la repentance ?','Un sacrifice d''animaux','Un changement de cœur qui se détourne du péché','Une fête','Un pèlerinage','B',FALSE,'Actes 3:19',4),
      (v,'Que devient celui qui est en Christ (2 Cor 5:17) ?','Un prophète','Une nouvelle créature','Un ange','Un lévite','B',FALSE,'2 Corinthiens 5:17',5),
      (v,'Quel a été le premier appel de la prédication de Jésus ?','« Repentez-vous, le royaume des cieux est proche »','« Payez l''impôt »','« Construisez le temple »','« Suivez la Loi »','A',FALSE,'Matthieu 4:17',6),
      (v,'La nouvelle naissance est l''œuvre de qui ?','De l''homme','Du Saint-Esprit','Des anges','Des prêtres','B',FALSE,'Tite 3:5',7),
      (v,'Que ressentent les anges quand un pécheur se repent ?','De la colère','De la joie','De l''indifférence','De la tristesse','B',FALSE,'Luc 15:10',8),
      (v,'Que demande Dieu pour pardonner nos péchés (1 Jean 1:9) ?','Les confesser','Les cacher','Les nier','Les oublier','A',FALSE,'1 Jean 1:9',9),
      (v,'Qui a dit : « Il faut que vous naissiez de nouveau » ?','Jean-Baptiste','Jésus','Paul','Pierre','B',FALSE,'Jean 3:7',10);
  END IF;

  -- É4 — Jésus-Christ
  SELECT id INTO v FROM public.quiz_quizzes WHERE track='parcours' AND level=1 AND sort_order=4;
  IF v IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id=v) THEN
    INSERT INTO public.quiz_questions (quiz_id, text, option_a, option_b, option_c, option_d, correct_option, is_difficult, reference, sort_order) VALUES
      (v,'Quel premier miracle Jésus a-t-il fait à Cana ?','Guérir un aveugle','Changer l''eau en vin','Marcher sur l''eau','Multiplier les pains','B',FALSE,'Jean 2:1-11',1),
      (v,'Combien d''hommes Jésus a-t-il nourris avec 5 pains et 2 poissons ?','Cinq cents','Mille','Cinq mille','Cent','C',FALSE,'Matthieu 14:21',2),
      (v,'Qui Jésus a-t-il ressuscité à Béthanie ?','Jaïrus','Lazare','Le fils de la veuve de Naïn','Étienne','B',FALSE,'Jean 11',3),
      (v,'Sur quelle étendue d''eau Jésus a-t-il marché ?','Le Jourdain','La mer de Galilée','La mer Rouge','Le Nil','B',FALSE,'Matthieu 14:25',4),
      (v,'Comment appelle-t-on le grand enseignement de Jésus en Matthieu 5-7 ?','Le Sermon sur la montagne','Les Paraboles','La Loi','Le Cantique','A',FALSE,'Matthieu 5-7',5),
      (v,'Quelle prière modèle Jésus a-t-il enseignée ?','Le Magnificat','Le Notre Père','Le Psaume 23','Le Cantique des cantiques','B',FALSE,'Matthieu 6:9-13',6),
      (v,'Combien d''apôtres Jésus a-t-il choisis ?','Sept','Dix','Douze','Soixante-dix','C',FALSE,'Marc 3:14',7),
      (v,'Par quelle parabole Jésus répond-il à « Qui est mon prochain ? »','Le bon Samaritain','Le semeur','Les talents','Le fils prodigue','A',FALSE,'Luc 10:29-37',8),
      (v,'Jésus a dit : « Je suis le bon… »','Roi','Berger','Prophète','Maître','B',FALSE,'Jean 10:11',9),
      (v,'« Je suis le chemin, la vérité et… »','la lumière','la vie','la paix','l''amour','B',FALSE,'Jean 14:6',10);
  END IF;

  -- É5 — Assurance du Salut
  SELECT id INTO v FROM public.quiz_quizzes WHERE track='parcours' AND level=1 AND sort_order=5;
  IF v IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id=v) THEN
    INSERT INTO public.quiz_questions (quiz_id, text, option_a, option_b, option_c, option_d, correct_option, is_difficult, reference, sort_order) VALUES
      (v,'Que possède celui qui croit au Fils (Jean 3:36) ?','La richesse','La vie éternelle','La gloire terrestre','La Loi','B',FALSE,'Jean 3:36',1),
      (v,'Selon Romains 8:38-39, qui peut nous séparer de l''amour de Dieu ?','La mort','Rien ni personne','Les anges','Les épreuves','B',FALSE,'Romains 8:38-39',2),
      (v,'Que devenons-nous par la foi en Christ (Jean 1:12) ?','Des serviteurs','Des enfants de Dieu','Des prophètes','Des juges','B',FALSE,'Jean 1:12',3),
      (v,'L''Esprit reçu est un Esprit de quoi (Romains 8:15) ?','De crainte','d''adoption','de jugement','de servitude','B',FALSE,'Romains 8:15',4),
      (v,'Qui rend témoignage que nous sommes enfants de Dieu ?','Les anges','Le Saint-Esprit','Les prophètes','La Loi','B',FALSE,'Romains 8:16',5),
      (v,'La vie éternelle se trouve en qui (1 Jean 5:11-12) ?','Dans la Loi','Dans le Fils, Jésus-Christ','Dans le temple','Dans les œuvres','B',FALSE,'1 Jean 5:11-12',6),
      (v,'Jésus dit que personne ne ravira ses brebis de sa main.','Vrai','Faux','Seulement les justes','La Bible ne le dit pas','A',FALSE,'Jean 10:28',7),
      (v,'Pourquoi Jean a-t-il écrit (1 Jean 5:13) ?','Pour qu''on sache qu''on a la vie éternelle','Pour condamner','Pour raconter sa vie','Pour la Loi','A',FALSE,'1 Jean 5:13',8),
      (v,'Celui qui a commencé en nous la bonne œuvre l''… (Phil 1:6)','rendra impossible','achèvera','annulera','oubliera','B',FALSE,'Philippiens 1:6',9),
      (v,'Que signifie être « adopté » par Dieu ?','Être un esclave','Être reçu comme enfant dans sa famille','Être un invité','Être jugé','B',FALSE,'Galates 4:5-7',10);
  END IF;
END $seed1$;

-- ─── 5. Une étape de parcours est-elle débloquée pour le joueur ? ─────
CREATE OR REPLACE FUNCTION public.parcours_etape_unlocked(p_quiz_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_level INTEGER; v_sort INTEGER; v_prev UUID; v_total INTEGER; v_correct INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  SELECT level, sort_order INTO v_level, v_sort
    FROM public.quiz_quizzes WHERE id = p_quiz_id AND track = 'parcours';
  IF v_level IS NULL THEN RETURN TRUE; END IF;  -- pas une étape parcours

  -- Étape précédente dans l'ordre global (niveau, puis étape)
  SELECT id INTO v_prev
    FROM public.quiz_quizzes
   WHERE track = 'parcours'
     AND (level < v_level OR (level = v_level AND sort_order < v_sort))
   ORDER BY level DESC, sort_order DESC LIMIT 1;
  IF v_prev IS NULL THEN RETURN TRUE; END IF;  -- toute première étape

  SELECT count(qq.id), count(qa.id) FILTER (WHERE qa.is_correct)
    INTO v_total, v_correct
    FROM public.quiz_questions qq
    LEFT JOIN public.quiz_answers qa ON qa.question_id = qq.id AND qa.user_id = auth.uid()
   WHERE qq.quiz_id = v_prev;

  IF COALESCE(v_total, 0) = 0 THEN RETURN FALSE; END IF;  -- étape préc. vide
  RETURN (v_correct::numeric / v_total) >= 0.80;
END $$;
GRANT EXECUTE ON FUNCTION public.parcours_etape_unlocked(UUID) TO authenticated;

-- ─── 6. Tout le parcours avec statut perso (pour l'UI) ───────────────
CREATE OR REPLACE FUNCTION public.quiz_my_parcours()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(lvl ORDER BY srt), '[]'::jsonb) INTO result FROM (
    SELECT pl.sort_order AS srt, jsonb_build_object(
      'level', pl.level, 'label', pl.label, 'badge_emoji', pl.badge_emoji,
      'badge_label', pl.badge_label, 'xp', pl.xp, 'title', pl.title,
      'etapes', COALESCE((
        SELECT jsonb_agg(e ORDER BY e_sort) FROM (
          SELECT q.sort_order AS e_sort, jsonb_build_object(
            'id', q.id, 'title', q.title, 'sort_order', q.sort_order,
            'nb_questions', (SELECT count(*) FROM public.quiz_questions qq WHERE qq.quiz_id = q.id),
            'unlocked', public.parcours_etape_unlocked(q.id),
            'score_pct', COALESCE((
              SELECT round((count(qa.id) FILTER (WHERE qa.is_correct))::numeric
                           / NULLIF(count(qq.id), 0) * 100)::int
              FROM public.quiz_questions qq
              LEFT JOIN public.quiz_answers qa ON qa.question_id = qq.id AND qa.user_id = auth.uid()
              WHERE qq.quiz_id = q.id), 0)
          ) AS e
          FROM public.quiz_quizzes q WHERE q.track = 'parcours' AND q.level = pl.level
        ) se
      ), '[]'::jsonb)
    ) AS lvl
    FROM public.quiz_parcours_levels pl
  ) s;
  RETURN result;
END $$;
GRANT EXECUTE ON FUNCTION public.quiz_my_parcours() TO authenticated;

-- ─── 7. quiz_submit_answer : ajoute le verrou « parcours » ───────────
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
  v_track   TEXT;
  v_correct BOOLEAN := FALSE;
  v_points  INTEGER := 0;
  v_in      TEXT;
  v_exp     TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT phase, COALESCE(track, 'championnat') INTO v_phase, v_track
    FROM public.quiz_quizzes WHERE id = p_quiz_id;

  IF v_track = 'parcours' THEN
    IF NOT public.parcours_etape_unlocked(p_quiz_id) THEN
      RAISE EXCEPTION 'etape verrouillee';
    END IF;
  ELSIF v_phase IS NOT NULL AND v_phase <> 'libre'
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
-- FIN v75 — Parcours de disciolat (structure + Niveau 1)
-- =====================================================================
