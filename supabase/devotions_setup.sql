-- ============================================================
-- CCB — TABLE DAILY_DEVOTIONS + PROGRESS + SEED
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Supprimer et recréer la table avec les bonnes colonnes
DROP TABLE IF EXISTS public.user_devotion_progress CASCADE;
DROP TABLE IF EXISTS public.daily_devotions CASCADE;

CREATE TABLE public.daily_devotions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devotion_date        DATE UNIQUE NOT NULL,
  title                TEXT NOT NULL,
  verse_reference      TEXT NOT NULL,
  verse_text           TEXT NOT NULL,
  meditation_p1        TEXT NOT NULL,
  meditation_p2        TEXT NOT NULL,
  meditation_p3        TEXT,
  reflection_question  TEXT,
  prayer               TEXT NOT NULL,
  declaration          TEXT NOT NULL,
  author_id            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_published         BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table de suivi "J'ai lu"
CREATE TABLE public.user_devotion_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  devotion_id  UUID NOT NULL REFERENCES public.daily_devotions(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, devotion_id)
);

-- 3. Index
CREATE INDEX idx_daily_devotions_date ON public.daily_devotions(devotion_date);
CREATE INDEX idx_daily_devotions_published ON public.daily_devotions(is_published);
CREATE INDEX idx_user_devotion_progress_user ON public.user_devotion_progress(user_id);

-- 4. RLS
ALTER TABLE public.daily_devotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devotion_progress ENABLE ROW LEVEL SECURITY;

-- Dévotions : lecture publique, écriture admin seulement
CREATE POLICY "devotions_select" ON public.daily_devotions
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "devotions_admin_all" ON public.daily_devotions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Progress : chaque user voit et gère ses propres données
CREATE POLICY "progress_select_own" ON public.user_devotion_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "progress_insert_own" ON public.user_devotion_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "progress_delete_own" ON public.user_devotion_progress
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 5. SEED — 7 dévotions (semaine du 1 au 7 Mai 2026)
-- ============================================================

INSERT INTO public.daily_devotions
  (devotion_date, title, verse_reference, verse_text, meditation_p1, meditation_p2, meditation_p3, reflection_question, prayer, declaration)
VALUES

-- Jour 1
('2026-05-01',
 'Marcher dans la foi',
 'Hébreux 11:1',
 'Or la foi est une ferme assurance des choses qu''on espère, une démonstration de celles qu''on ne voit pas.',
 'La foi est le fondement de notre relation avec Dieu. Elle n''est pas un sentiment passager, mais une conviction profonde, ancrée dans les promesses immuables de Dieu.',
 'Chaque jour, nous sommes appelés à exercer cette foi — dans nos décisions, nos prières, nos relations. La foi sans les œuvres est morte, mais la foi authentique produit des fruits visibles.',
 'Aujourd''hui, choisissez de marcher par la foi et non par la vue. Faites confiance à Celui qui tient votre avenir entre Ses mains.',
 'Dans quel domaine de votre vie avez-vous du mal à faire confiance à Dieu ?',
 'Seigneur, augmente ma foi dans les moments de doute. Aide-moi à voir au-delà des circonstances et à te faire confiance en toutes choses. En nom de Jésus, Amen.',
 'Je marche par la foi et non par la vue. Dieu est fidèle à toutes ses promesses dans ma vie !'),

-- Jour 2
('2026-05-02',
 'La force en Christ',
 'Philippiens 4:13',
 'Je puis tout par celui qui me fortifie.',
 'Cette déclaration de Paul n''est pas une promesse de succès humain — c''est une promesse de suffisance divine. En toutes choses, à travers toutes les saisons, Christ est notre force.',
 'Paul écrivait ces mots depuis la prison. Il avait appris le secret : être content dans toutes les circonstances, non par stoïcisme, mais parce que sa force venait de Dieu, pas de sa situation.',
 'Quelle que soit la montagne devant vous aujourd''hui, rappelez-vous : vous ne la franchissez pas seul. Christ en vous est plus grand que tout obstacle.',
 'Dans quelle situation avez-vous besoin de la force de Christ en ce moment ?',
 'Père, je reconnais que sans toi, je ne puis rien. Mais avec toi, je puis tout. Remplis-moi de ta force aujourd''hui pour accomplir ce que tu m''appelles à faire. Amen.',
 'Je suis fort en Christ ! Je puis tout par Celui qui me fortifie. Aucun obstacle ne me résiste quand Dieu est pour moi.'),

-- Jour 3
('2026-05-03',
 'Être semblable à Christ',
 'Romains 8:29',
 'Car ceux qu''il a connus d''avance, il les a aussi prédestinés à être conformes à l''image de son Fils.',
 'La conformité à Christ n''est pas une option pour certains croyants avancés — c''est le but prédestiné de chaque enfant de Dieu. Dieu ne veut pas seulement vous sauver, Il veut vous transformer.',
 'Ce processus de transformation est progressif, de gloire en gloire. Chaque épreuve, chaque discipline, chaque moment de prière est un outil entre les mains du Maître-potier qui vous façonne.',
 'La question n''est pas "est-ce que je ressemble à Christ ?" mais "est-ce que je permets à Dieu de me transformer pour lui ressembler davantage chaque jour ?"',
 'Quel aspect de votre caractère avez-vous besoin de soumettre à Dieu pour lui ressembler davantage ?',
 'Seigneur, je me soumets à ton travail de transformation dans ma vie. Façonne mon caractère, purifie mes motivations, aligne ma volonté sur la tienne. Rends-moi semblable à Christ, Amen.',
 'Je suis en cours de transformation ! Chaque jour je ressemble davantage à Christ. Dieu achève le bon travail qu''il a commencé en moi.'),

-- Jour 4
('2026-05-04',
 'La paix qui surpasse toute intelligence',
 'Philippiens 4:7',
 'Et la paix de Dieu, qui surpasse toute intelligence, gardera vos cœurs et vos pensées en Jésus-Christ.',
 'La paix dont parle Paul n''est pas l''absence de problèmes — c''est une paix qui garde le cœur au milieu des problèmes. C''est une paix surnaturelle qui dépasse toute logique humaine.',
 'Cette paix est une promesse conditionnelle : elle vient après la prière, l''action de grâces et la présentation de nos requêtes à Dieu. Elle n''est pas passive — elle est le fruit d''une communion active avec le Père.',
 'Aujourd''hui, choisissez de présenter vos soucis à Dieu plutôt que de les ruminer. La paix de Dieu vous attend de l''autre côté de la prière.',
 'Qu''est-ce qui trouble votre paix en ce moment ? Avez-vous apporté cela à Dieu en prière ?',
 'Père, je te présente mes inquiétudes, mes peurs et mes fardeaux. Je te fais confiance. Que ta paix qui dépasse toute compréhension garde mon cœur aujourd''hui. Amen.',
 'La paix de Dieu garde mon cœur ! Je ne m''inquiète de rien car je prie pour tout. Ma paix vient de Dieu et rien ne peut me la ravir.'),

-- Jour 5
('2026-05-05',
 'Chercher d''abord le Royaume',
 'Matthieu 6:33',
 'Cherchez premièrement le royaume et la justice de Dieu; et toutes ces choses vous seront données par-dessus.',
 'Jésus ne demande pas d''ignorer les besoins pratiques de la vie — il demande de réorganiser nos priorités. Quand le Royaume de Dieu est au centre, tout le reste trouve sa juste place.',
 'Trop souvent, nous cherchons d''abord les bénédictions, puis nous cherchons Dieu. Mais Jésus inverse cet ordre : cherche d''abord le Donateur, et les dons te suivront.',
 'Cette promesse s''applique à votre vie professionnelle, familiale, financière. Dieu connaît vos besoins avant même que vous les formuliez.',
 'Êtes-vous en train de chercher Dieu pour ses dons, ou pour Lui-même ? Comment pouvez-vous mettre le Royaume en première position aujourd''hui ?',
 'Seigneur, aide-moi à te chercher toi, pas seulement tes bénédictions. Réorganise mes priorités. Que ton Royaume soit le centre de ma vie, et je te fais confiance pour le reste. Amen.',
 'Je cherche d''abord le Royaume de Dieu ! Toutes les bonnes choses me sont données par-dessus. Dieu pourvoit à tous mes besoins selon ses richesses.'),

-- Jour 6
('2026-05-06',
 'Renouveau de l''esprit',
 'Romains 12:2',
 'Ne vous conformez pas au siècle présent, mais soyez transformés par le renouvellement de l''intelligence.',
 'Le monde cherche à nous modeler à son image — à travers les médias, les tendances, les valeurs culturelles. Mais Dieu appelle ses enfants à une contre-culture : être transformés de l''intérieur.',
 'Ce renouvellement de l''intelligence n''est pas un exercice intellectuel — c''est un travail spirituel. Il passe par la Parole de Dieu, la prière, la communion des saints et l''abandon à l''Esprit.',
 'Ce que vous méditez façonne ce que vous devenez. Aujourd''hui, choisissez consciemment ce qui nourrit votre esprit et aligne votre pensée sur celle de Dieu.',
 'Quelles pensées ou habitudes avez-vous besoin de renouveler par la Parole de Dieu ?',
 'Père, renouvelle mon intelligence. Aide-moi à ne pas me conformer aux schémas de ce monde mais à penser comme Christ pense. Que ta Parole transforme ma façon de voir et de vivre. Amen.',
 'Mon intelligence est renouvelée par la Parole ! Je pense selon les pensées de Dieu. Je suis transformé et non conformé au monde.'),

-- Jour 7
('2026-05-07',
 'L''amour inconditionnel de Dieu',
 'Romains 8:38-39',
 'Ni la mort, ni la vie, ni les anges, ni les dominations, ni les choses présentes, ni les choses à venir... ne pourront nous séparer de l''amour de Dieu.',
 'L''amour de Dieu n''est pas conditionnel à votre performance. Il ne fluctue pas avec vos réussites et vos échecs. Il est ancré dans le caractère immuable de Dieu lui-même.',
 'Paul dresse une liste exhaustive de tout ce qui pourrait théoriquement nous séparer de cet amour — et conclut : rien ne le peut. Ni les circonstances, ni vos erreurs passées, ni vos peurs du futur.',
 'Vous êtes aimé non pas pour ce que vous faites, mais pour qui vous êtes : l''enfant de Dieu. Laissez cette vérité s''ancrer profondément dans votre identité aujourd''hui.',
 'Avez-vous du mal à recevoir l''amour inconditionnel de Dieu ? Qu''est-ce qui vous en empêche ?',
 'Père, aide-moi à recevoir ton amour dans toute sa profondeur. Que je ne sois plus prisonnier de la performance ou de la honte. Ton amour est ma fondation. En nom de Jésus, Amen.',
 'Je suis aimé inconditionnellement par Dieu ! Rien ne peut me séparer de son amour. Je vis et j''agis depuis un lieu de sécurité en Christ.');
