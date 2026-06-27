-- =====================================================================
-- CCB — iBB : cours de la faculté « Mariage, Famille et Relation »  v81
--
--   Pré-crée 3 cours publiés, avec modules + leçons rédigées (markdown),
--   immédiatement consultables. L'admin pourra les enrichir (vidéos, PDF,
--   leçons supplémentaires) via Institut → Admin.
--
--     1. Les fondements d'un mariage chrétien   (5 leçons / 2 modules)
--     2. Élever ses enfants selon Dieu          (3 leçons / 1 module)
--     3. Gérer les conflits relationnels        (3 leçons / 1 module)
--
--   Idempotent : un cours n'est créé que si son slug n'existe pas déjà.
--
-- À exécuter dans Supabase → SQL Editor APRÈS v80 (faculté) et v24 (tables).
-- =====================================================================

DO $seed$
DECLARE
  v_cat UUID;
  c UUID;
  m UUID;
BEGIN
  SELECT id INTO v_cat FROM public.institut_categories WHERE slug = 'mariage-famille-relation';
  IF v_cat IS NULL THEN
    RAISE NOTICE 'Faculté « mariage-famille-relation » introuvable — exécute d''abord v80.';
    RETURN;
  END IF;

  -- ============ COURS 1 — Les fondements d'un mariage chrétien ============
  SELECT id INTO c FROM public.institut_courses WHERE slug = 'mfr-fondements-mariage-chretien';
  IF c IS NULL THEN
    INSERT INTO public.institut_courses (category_id, slug, title, subtitle, description, level, duration_mins, instructor, is_published, order_index)
    VALUES (v_cat, 'mfr-fondements-mariage-chretien',
      $md$Les fondements d'un mariage chrétien$md$,
      $md$Comprendre le plan de Dieu pour le couple$md$,
      $md$Bâtir son mariage sur le roc de la Parole : l'origine du mariage, l'alliance devant Dieu, l'amour véritable et la communication dans le couple.$md$,
      'beginner', 55, 'Rév. Elvis NGUIFFO', TRUE, 1)
    RETURNING id INTO c;

    INSERT INTO public.institut_modules (course_id, slug, title, description, order_index)
    VALUES (c, 'm1', $md$Le dessein de Dieu pour le mariage$md$, $md$Retrouver l'intention originelle du Créateur.$md$, 1)
    RETURNING id INTO m;
    INSERT INTO public.institut_lessons (module_id, course_id, slug, title, description, content_md, duration_secs, order_index) VALUES
      (m, c, 'mfr-mariage-l1', $md$L'origine et le sens du mariage$md$, $md$Le mariage tel que Dieu l'a institué.$md$,
$md$## L'origine et le sens du mariage

> « L'Éternel Dieu dit : Il n'est pas bon que l'homme soit seul ; je lui ferai une aide semblable à lui. » — Genèse 2:18

Le mariage n'est pas une invention humaine : c'est **Dieu** qui l'a institué dès le commencement. Il l'a voulu bon, pour combler la solitude et refléter son amour.

Avant d'unir l'homme et la femme, Dieu a préparé un vis-à-vis « semblable », un partenaire d'alliance et non un simple compagnon utilitaire.

**À méditer :** Vois-tu ton conjoint (ou ton futur conjoint) comme un don de Dieu, confié pour être aimé et honoré ?

**Prière :** Seigneur, merci pour le don du mariage. Apprends-moi à le vivre selon ton dessein. Amen.$md$, 540, 1),
      (m, c, 'mfr-mariage-l2', $md$Une seule chair : l'unité du couple$md$, $md$L'unité voulue par Dieu.$md$,
$md$## Une seule chair

> « C'est pourquoi l'homme quittera son père et sa mère, et s'attachera à sa femme, et les deux deviendront une seule chair. » — Marc 10:7-8

Le mariage crée une **nouvelle unité**. « Quitter » et « s'attacher » : il y a un ordre. On quitte une dépendance pour bâtir un foyer.

Cette unité touche le corps, l'âme et l'esprit. Ce que Dieu a uni, l'homme ne doit pas le séparer.

**À méditer :** Qu'est-ce qui, dans ta vie, doit être « quitté » pour que ton couple soit pleinement uni ?$md$, 540, 2),
      (m, c, 'mfr-mariage-l3', $md$Le mariage, une alliance devant Dieu$md$, $md$Plus qu'un contrat : une alliance.$md$,
$md$## Une alliance, pas seulement un contrat

> « …l'Éternel a été témoin entre toi et la femme de ta jeunesse… elle est ta compagne et la femme de ton alliance. » — Malachie 2:14

Un contrat protège des intérêts ; une **alliance** engage des personnes. Dieu lui-même est témoin de l'engagement des époux.

La fidélité n'est donc pas seulement une promesse faite à l'autre, mais devant Dieu.

**Prière :** Seigneur, rends-moi fidèle à mon alliance, comme toi tu es fidèle à la tienne. Amen.$md$, 480, 3);

    INSERT INTO public.institut_modules (course_id, slug, title, description, order_index)
    VALUES (c, 'm2', $md$Vivre l'amour au quotidien$md$, $md$De la théorie à la pratique.$md$, 2)
    RETURNING id INTO m;
    INSERT INTO public.institut_lessons (module_id, course_id, slug, title, description, content_md, duration_secs, order_index) VALUES
      (m, c, 'mfr-mariage-l4', $md$L'amour véritable (1 Corinthiens 13)$md$, $md$L'amour qui dure.$md$,
$md$## L'amour véritable

> « L'amour est patient, il est plein de bonté… il ne cherche point son intérêt… il excuse tout, il croit tout, il espère tout, il supporte tout. » — 1 Corinthiens 13:4-7

L'amour biblique n'est pas d'abord un sentiment, mais une **décision** qui s'exprime en actes : patience, bonté, pardon.

Dans le couple, l'amour se prouve dans les détails du quotidien, surtout quand l'autre ne le « mérite » pas.

**À méditer :** Relis le passage en remplaçant « l'amour » par ton prénom. Où dois-tu grandir ?$md$, 600, 1),
      (m, c, 'mfr-mariage-l5', $md$Communiquer et pardonner$md$, $md$Les clés de la paix conjugale.$md$,
$md$## Communiquer et pardonner

> « Que le soleil ne se couche pas sur votre colère… Soyez bons les uns envers les autres… vous pardonnant réciproquement, comme Dieu vous a pardonné en Christ. » — Éphésiens 4:26,32

La plupart des crises de couple ne viennent pas de l'absence d'amour, mais d'une **mauvaise communication** et de blessures non pardonnées.

Parler avec douceur, écouter vraiment, et pardonner vite : voilà le secret d'un foyer paisible.

**Prière :** Seigneur, garde ma langue et mon cœur ; aide-moi à pardonner comme tu m'as pardonné. Amen.$md$, 600, 2);
  END IF;

  -- ============ COURS 2 — Élever ses enfants selon Dieu ============
  SELECT id INTO c FROM public.institut_courses WHERE slug = 'mfr-elever-enfants-selon-dieu';
  IF c IS NULL THEN
    INSERT INTO public.institut_courses (category_id, slug, title, subtitle, description, level, duration_mins, instructor, is_published, order_index)
    VALUES (v_cat, 'mfr-elever-enfants-selon-dieu',
      $md$Élever ses enfants selon Dieu$md$,
      $md$Transmettre la foi à la génération suivante$md$,
      $md$Des principes bibliques pour éduquer, discipliner avec amour et bénir ses enfants.$md$,
      'beginner', 35, 'Rév. Elvis NGUIFFO', TRUE, 2)
    RETURNING id INTO c;

    INSERT INTO public.institut_modules (course_id, slug, title, description, order_index)
    VALUES (c, 'm1', $md$Les fondements de l'éducation chrétienne$md$, $md$Bâtir des enfants pour Dieu.$md$, 1)
    RETURNING id INTO m;
    INSERT INTO public.institut_lessons (module_id, course_id, slug, title, description, content_md, duration_secs, order_index) VALUES
      (m, c, 'mfr-enfants-l1', $md$Les enfants, un héritage de l'Éternel$md$, $md$Voir ses enfants comme Dieu les voit.$md$,
$md$## Un héritage de l'Éternel

> « Voici, des fils sont un héritage de l'Éternel, le fruit des entrailles est une récompense. » — Psaume 127:3

Les enfants ne sont pas un fardeau ni un hasard : ce sont un **héritage** et une **récompense** confiés par Dieu.

Les recevoir ainsi change tout : on ne les « subit » pas, on les gère comme un trésor dont on rendra compte.

**À méditer :** Comment exprimes-tu à tes enfants qu'ils sont un don précieux ?$md$, 420, 1),
      (m, c, 'mfr-enfants-l2', $md$Instruire l'enfant dès son jeune âge$md$, $md$Poser les bons fondements tôt.$md$,
$md$## Instruire dès le jeune âge

> « Instruis l'enfant selon la voie qu'il doit suivre ; et quand il sera vieux, il ne s'en détournera pas. » — Proverbes 22:6

L'éducation spirituelle commence tôt et passe d'abord par l'**exemple** des parents, puis par l'enseignement de la Parole.

Ce qui est semé dans le cœur d'un enfant porte du fruit toute sa vie.

**Prière :** Seigneur, aide-moi à montrer le chemin à mes enfants par ma vie autant que par mes paroles. Amen.$md$, 420, 2),
      (m, c, 'mfr-enfants-l3', $md$Discipline et amour$md$, $md$Corriger sans décourager.$md$,
$md$## Discipline et amour

> « Et vous, pères, n'irritez pas vos enfants, mais élevez-les en les corrigeant et en les instruisant selon le Seigneur. » — Éphésiens 6:4

La vraie discipline n'est pas de la dureté : elle est l'expression d'un **amour** qui veut le bien de l'enfant.

Corriger oui, mais sans exaspérer ni humilier — toujours pour construire, jamais pour détruire.

**À méditer :** Ta correction laisse-t-elle tes enfants encouragés à mieux faire, ou découragés ?$md$, 420, 3);
  END IF;

  -- ============ COURS 3 — Gérer les conflits relationnels ============
  SELECT id INTO c FROM public.institut_courses WHERE slug = 'mfr-gerer-conflits-relationnels';
  IF c IS NULL THEN
    INSERT INTO public.institut_courses (category_id, slug, title, subtitle, description, level, duration_mins, instructor, is_published, order_index)
    VALUES (v_cat, 'mfr-gerer-conflits-relationnels',
      $md$Gérer les conflits relationnels$md$,
      $md$Vivre en paix et restaurer les relations$md$,
      $md$Comprendre la source des conflits et marcher dans le pardon et la réconciliation, au foyer comme dans l'Église.$md$,
      'beginner', 35, 'Rév. Elvis NGUIFFO', TRUE, 3)
    RETURNING id INTO c;

    INSERT INTO public.institut_modules (course_id, slug, title, description, order_index)
    VALUES (c, 'm1', $md$Vivre en paix avec tous$md$, $md$Du conflit à la réconciliation.$md$, 1)
    RETURNING id INTO m;
    INSERT INTO public.institut_lessons (module_id, course_id, slug, title, description, content_md, duration_secs, order_index) VALUES
      (m, c, 'mfr-conflits-l1', $md$La racine des conflits$md$, $md$Comprendre d'où viennent les disputes.$md$,
$md$## La racine des conflits

> « D'où viennent les luttes et les querelles parmi vous ? N'est-ce pas de vos passions qui combattent dans vos membres ? » — Jacques 4:1

La plupart des conflits naissent à l'**intérieur** de nous : convoitise, orgueil, besoin d'avoir raison.

Avant de pointer l'autre du doigt, le sage commence par examiner son propre cœur.

**À méditer :** Quelle attitude en toi alimente le plus tes conflits ?$md$, 420, 1),
      (m, c, 'mfr-conflits-l2', $md$Le pardon et la réconciliation$md$, $md$Le chemin enseigné par Jésus.$md$,
$md$## Pardon et réconciliation

> « Si ton frère a péché, va et reprends-le seul à seul… » — Matthieu 18:15
> « …jusqu'à septante fois sept fois. » — Matthieu 18:22

Jésus enseigne une démarche de paix : aller vers l'autre **directement**, avec humilité, plutôt que d'en parler à tous.

Et il appelle à un pardon sans limite, parce que nous avons nous-mêmes été pardonnés sans mesure.

**Prière :** Seigneur, donne-moi le courage d'aller vers celui avec qui je suis en froid, et un cœur qui pardonne. Amen.$md$, 480, 2),
      (m, c, 'mfr-conflits-l3', $md$Restaurer une relation brisée$md$, $md$Faire le premier pas.$md$,
$md$## Restaurer une relation brisée

> « S'il est possible, autant que cela dépend de vous, soyez en paix avec tous les hommes. » — Romains 12:18

La réconciliation demande parfois de **faire le premier pas**, sans attendre que l'autre bouge.

Tout ne dépend pas de nous, mais Dieu nous tient responsables de **notre** part : chercher la paix activement.

**À méditer :** Avec qui dois-tu, cette semaine, faire un pas vers la paix ?$md$, 420, 3);
  END IF;
END $seed$;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v81 — Cours de la faculté « Mariage, Famille et Relation »
-- =====================================================================
