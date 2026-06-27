-- =====================================================================
-- CCB — iBB : cours supplémentaires « Mariage, Famille et Relation »  v82
--
--   Ajoute 4 cours publiés (modules + leçons rédigées en markdown) :
--     4. Préparer son mariage            (3 leçons)
--     5. Communication dans le couple    (3 leçons)
--     6. Les finances du couple          (3 leçons)
--     7. Restaurer un foyer en crise     (3 leçons)
--
--   Idempotent : un cours n'est créé que si son slug n'existe pas déjà.
--   order_index 4→7 (à la suite des 3 cours de v81).
--
-- À exécuter dans Supabase → SQL Editor APRÈS v80 + v81.
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

  -- ============ COURS 4 — Préparer son mariage ============
  SELECT id INTO c FROM public.institut_courses WHERE slug = 'mfr-preparer-son-mariage';
  IF c IS NULL THEN
    INSERT INTO public.institut_courses (category_id, slug, title, subtitle, description, level, duration_mins, instructor, is_published, order_index)
    VALUES (v_cat, 'mfr-preparer-son-mariage',
      $md$Préparer son mariage$md$,
      $md$Bien commencer pour bien durer$md$,
      $md$Pour les fiancés et futurs mariés : discerner la volonté de Dieu, choisir avec sagesse et se préparer dans la pureté.$md$,
      'beginner', 35, 'Rév. Elvis NGUIFFO', TRUE, 4)
    RETURNING id INTO c;

    INSERT INTO public.institut_modules (course_id, slug, title, description, order_index)
    VALUES (c, 'm1', $md$Avant de dire « oui »$md$, $md$Poser des bases saines avant l'engagement.$md$, 1)
    RETURNING id INTO m;
    INSERT INTO public.institut_lessons (module_id, course_id, slug, title, description, content_md, duration_secs, order_index) VALUES
      (m, c, 'mfr-preparer-l1', $md$Discerner la volonté de Dieu$md$, $md$Chercher Dieu avant de s'engager.$md$,
$md$## Discerner la volonté de Dieu

> « Confie-toi en l'Éternel de tout ton cœur, et ne t'appuie pas sur ta sagesse ; reconnais-le dans toutes tes voies, et il aplanira tes sentiers. » — Proverbes 3:5-6

Le mariage est l'une des décisions les plus importantes de la vie. Elle se prend **avec Dieu**, dans la prière et le conseil, pas seulement sous l'émotion.

Prendre le temps de chercher la paix de Dieu évite bien des regrets.

**À méditer :** As-tu réellement remis ce choix entre les mains de Dieu ?$md$, 420, 1),
      (m, c, 'mfr-preparer-l2', $md$Choisir son conjoint avec sagesse$md$, $md$L'importance de la foi commune.$md$,
$md$## Choisir avec sagesse

> « Ne vous mettez pas avec les incrédules sous un joug étranger. Car quel rapport y a-t-il entre la justice et l'iniquité ? » — 2 Corinthiens 6:14

Une union solide repose sur des **fondations communes** : une même foi, des mêmes valeurs, une même direction de vie.

Au-delà de l'attirance, demande-toi : marchons-nous dans la même direction spirituelle ?

**Prière :** Seigneur, donne-moi la sagesse de choisir selon ton cœur et non selon mes seules envies. Amen.$md$, 420, 2),
      (m, c, 'mfr-preparer-l3', $md$Se préparer dans la pureté$md$, $md$Honorer Dieu avant le mariage.$md$,
$md$## Se préparer dans la pureté

> « Ce que Dieu veut, c'est votre sanctification ; c'est que vous vous absteniez de l'impudicité ; c'est que chacun de vous sache posséder son corps dans la sainteté et l'honneur. » — 1 Thessaloniciens 4:3-4

La pureté avant le mariage n'est pas une privation, mais un **acte de confiance** et d'honneur envers Dieu et envers l'autre.

Ce qui est bâti dans l'obéissance est béni dans la durée.

**À méditer :** Quelles limites saines poser pour honorer Dieu pendant les fiançailles ?$md$, 420, 3);
  END IF;

  -- ============ COURS 5 — Communication dans le couple ============
  SELECT id INTO c FROM public.institut_courses WHERE slug = 'mfr-communication-couple';
  IF c IS NULL THEN
    INSERT INTO public.institut_courses (category_id, slug, title, subtitle, description, level, duration_mins, instructor, is_published, order_index)
    VALUES (v_cat, 'mfr-communication-couple',
      $md$Communication dans le couple$md$,
      $md$Parler, écouter, se comprendre$md$,
      $md$Développer une communication saine, vraie et bienveillante pour prévenir les conflits et renforcer l'unité.$md$,
      'beginner', 35, 'Rév. Elvis NGUIFFO', TRUE, 5)
    RETURNING id INTO c;

    INSERT INTO public.institut_modules (course_id, slug, title, description, order_index)
    VALUES (c, 'm1', $md$Les clés d'une bonne communication$md$, $md$Mieux se parler pour mieux s'aimer.$md$, 1)
    RETURNING id INTO m;
    INSERT INTO public.institut_lessons (module_id, course_id, slug, title, description, content_md, duration_secs, order_index) VALUES
      (m, c, 'mfr-comm-l1', $md$Prompt à écouter, lent à parler$md$, $md$L'art d'écouter vraiment.$md$,
$md$## Écouter avant de parler

> « Que tout homme soit prompt à écouter, lent à parler, lent à se mettre en colère. » — Jacques 1:19

Bien communiquer commence par **écouter** : non pour répondre, mais pour comprendre ce que l'autre vit.

Beaucoup de tensions disparaissent quand l'on se sent simplement écouté et compris.

**À méditer :** Écoutes-tu pour comprendre, ou seulement pour répliquer ?$md$, 420, 1),
      (m, c, 'mfr-comm-l2', $md$Le pouvoir des paroles$md$, $md$Construire au lieu de détruire.$md$,
$md$## Le pouvoir des paroles

> « La mort et la vie sont au pouvoir de la langue. » — Proverbes 18:21
> « Qu'il ne sorte de votre bouche aucune parole mauvaise, mais s'il y a lieu, quelque bonne parole qui serve à l'édification. » — Éphésiens 4:29

Les mots bâtissent ou blessent. Dans le couple, une parole de **bénédiction** vaut mieux que mille reproches.

Choisis des paroles qui encouragent, valorisent et apaisent.

**Prière :** Seigneur, que mes paroles soient une source de vie pour mon conjoint. Amen.$md$, 420, 2),
      (m, c, 'mfr-comm-l3', $md$Gérer la colère sans pécher$md$, $md$Désamorcer avant l'explosion.$md$,
$md$## Gérer la colère

> « Si vous vous mettez en colère, ne péchez point ; que le soleil ne se couche pas sur votre colère, et ne donnez pas accès au diable. » — Éphésiens 4:26-27

La colère est humaine ; ce qu'on en fait est un choix. La régler **rapidement**, sans laisser s'installer la rancune, protège le foyer.

Faire une pause, prier, puis revenir parler avec calme : voilà la sagesse.

**À méditer :** Comment réagis-tu quand la tension monte ? Que changer dès aujourd'hui ?$md$, 420, 3);
  END IF;

  -- ============ COURS 6 — Les finances du couple ============
  SELECT id INTO c FROM public.institut_courses WHERE slug = 'mfr-finances-du-couple';
  IF c IS NULL THEN
    INSERT INTO public.institut_courses (category_id, slug, title, subtitle, description, level, duration_mins, instructor, is_published, order_index)
    VALUES (v_cat, 'mfr-finances-du-couple',
      $md$Les finances du couple$md$,
      $md$Gérer l'argent selon Dieu$md$,
      $md$Principes bibliques pour gérer les finances du foyer dans l'unité, la sagesse et la confiance en Dieu.$md$,
      'beginner', 35, 'Rév. Elvis NGUIFFO', TRUE, 6)
    RETURNING id INTO c;

    INSERT INTO public.institut_modules (course_id, slug, title, description, order_index)
    VALUES (c, 'm1', $md$L'argent au service du foyer$md$, $md$Une gestion qui honore Dieu.$md$, 1)
    RETURNING id INTO m;
    INSERT INTO public.institut_lessons (module_id, course_id, slug, title, description, content_md, duration_secs, order_index) VALUES
      (m, c, 'mfr-finances-l1', $md$Dieu, propriétaire de tout$md$, $md$Nous sommes des intendants.$md$,
$md$## Dieu, propriétaire de tout

> « À l'Éternel la terre et ce qu'elle renferme, le monde et ceux qui l'habitent. » — Psaume 24:1
> « L'argent est à moi, et l'or est à moi, dit l'Éternel des armées. » — Aggée 2:8

Nous ne sommes pas propriétaires mais **gérants** des biens que Dieu nous confie. Cela change notre rapport à l'argent : la gratitude remplace l'avidité.

Le couple qui gère ensemble, dans la transparence, marche dans l'unité.

**À méditer :** Gérez-vous votre argent comme un couple uni et transparent ?$md$, 420, 1),
      (m, c, 'mfr-finances-l2', $md$Budget, épargne et contentement$md$, $md$La sagesse au quotidien.$md$,
$md$## Budget, épargne et contentement

> « Il y a de précieux trésors et de l'huile dans la demeure du sage ; mais l'homme insensé les engloutit. » — Proverbes 21:20
> « La piété avec le contentement est une grande source de gain. » — 1 Timothée 6:6-8

Planifier (budget), mettre de côté (épargne) et se contenter de ce que l'on a : trois clés de la paix financière.

Le contentement libère le foyer de la course sans fin et des dettes inutiles.

**Prière :** Seigneur, apprends-nous la sagesse et le contentement dans la gestion de notre foyer. Amen.$md$, 420, 2),
      (m, c, 'mfr-finances-l3', $md$Donner et faire confiance à Dieu$md$, $md$La générosité ouvre les cieux.$md$,
$md$## Donner et faire confiance

> « Apportez à la maison du trésor toutes les dîmes… et vous verrez si je n'ouvre pas pour vous les écluses des cieux. » — Malachie 3:10
> « Dieu aime celui qui donne avec joie. » — 2 Corinthiens 9:7

Le couple qui apprend à **donner** (dîme, offrandes, partage) expérimente la fidélité de Dieu dans ses finances.

Donner n'appauvrit pas : c'est un acte de foi qui ouvre la porte de la bénédiction.

**À méditer :** Quelle place la générosité a-t-elle dans votre foyer ?$md$, 420, 3);
  END IF;

  -- ============ COURS 7 — Restaurer un foyer en crise ============
  SELECT id INTO c FROM public.institut_courses WHERE slug = 'mfr-restaurer-foyer-crise';
  IF c IS NULL THEN
    INSERT INTO public.institut_courses (category_id, slug, title, subtitle, description, level, duration_mins, instructor, is_published, order_index)
    VALUES (v_cat, 'mfr-restaurer-foyer-crise',
      $md$Restaurer un foyer en crise$md$,
      $md$L'espérance pour les couples blessés$md$,
      $md$Quand le foyer traverse la tempête : retrouver l'espérance, reconstruire la confiance et marcher vers la restauration en Christ.$md$,
      'intermediate', 35, 'Rév. Elvis NGUIFFO', TRUE, 7)
    RETURNING id INTO c;

    INSERT INTO public.institut_modules (course_id, slug, title, description, order_index)
    VALUES (c, 'm1', $md$De la crise à la restauration$md$, $md$Il y a toujours de l'espoir avec Dieu.$md$, 1)
    RETURNING id INTO m;
    INSERT INTO public.institut_lessons (module_id, course_id, slug, title, description, content_md, duration_secs, order_index) VALUES
      (m, c, 'mfr-restaurer-l1', $md$Rien n'est impossible à Dieu$md$, $md$Garder l'espérance dans la tempête.$md$,
$md$## Rien n'est impossible à Dieu

> « Voici, je suis l'Éternel, le Dieu de toute chair. Y a-t-il rien qui soit étonnant de ma part ? » — Jérémie 32:27

Aucune situation n'est trop abîmée pour Dieu. Là où l'homme voit une impasse, Dieu peut ouvrir un chemin.

La première étape de la restauration, c'est de **refuser de désespérer** et de remettre le foyer entre les mains de Dieu.

**À méditer :** Crois-tu encore que Dieu peut restaurer ce qui semble brisé chez toi ?$md$, 420, 1),
      (m, c, 'mfr-restaurer-l2', $md$Reconstruire la confiance brisée$md$, $md$Bâtir, pierre après pierre.$md$,
$md$## Reconstruire la confiance

> « C'est par la sagesse qu'une maison s'élève, et par l'intelligence qu'elle s'affermit ; c'est par la science que les chambres se remplissent. » — Proverbes 24:3-4

La confiance se reconstruit lentement, par des **actes répétés** de vérité, de fidélité et d'humilité — pas par de simples paroles.

Cela demande patience des deux côtés : celui qui se repent et celui qui choisit de pardonner.

**Prière :** Seigneur, reconstruis notre confiance et affermis notre maison par ta sagesse. Amen.$md$, 480, 2),
      (m, c, 'mfr-restaurer-l3', $md$La prière et le soutien$md$, $md$Ne pas rester seul.$md$,
$md$## La prière et le soutien

> « Deux valent mieux qu'un… car, s'ils tombent, l'un relève son compagnon. » — Ecclésiaste 4:9-10
> « Si deux d'entre vous s'accordent sur la terre pour demander une chose quelconque, elle leur sera accordée par mon Père. » — Matthieu 18:19

La restauration passe souvent par la **prière commune** et par un accompagnement (pasteur, couple de référence). Le foyer n'est pas fait pour affronter la crise seul.

Demander de l'aide n'est pas une faiblesse, c'est de la sagesse.

**À méditer :** Vers qui, dans l'Église, pouvez-vous vous tourner pour être soutenus et accompagnés ?$md$, 480, 3);
  END IF;
END $seed$;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v82 — Cours supplémentaires « Mariage, Famille et Relation »
-- =====================================================================
