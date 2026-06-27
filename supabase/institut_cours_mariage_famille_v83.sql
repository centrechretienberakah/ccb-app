-- =====================================================================
-- CCB — iBB : cours supplémentaires « Mariage, Famille et Relation »  v83
--
--   Ajoute 3 cours publiés (modules + leçons rédigées en markdown) :
--     8.  Belle-famille et frontières               (3 leçons)
--     9.  Sexualité dans le mariage selon la Bible  (3 leçons)
--     10. Monoparentalité et foi                    (3 leçons)
--
--   Idempotent : un cours n'est créé que si son slug n'existe pas déjà.
--   order_index 8→10 (à la suite des cours de v81 + v82).
--
-- À exécuter dans Supabase → SQL Editor APRÈS v80 + v81 + v82.
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

  -- ============ COURS 8 — Belle-famille et frontières ============
  SELECT id INTO c FROM public.institut_courses WHERE slug = 'mfr-belle-famille-frontieres';
  IF c IS NULL THEN
    INSERT INTO public.institut_courses (category_id, slug, title, subtitle, description, level, duration_mins, instructor, is_published, order_index)
    VALUES (v_cat, 'mfr-belle-famille-frontieres',
      $md$Belle-famille et frontières$md$,
      $md$Honorer sans se laisser envahir$md$,
      $md$Vivre des relations saines avec la belle-famille : priorité au couple, honneur des parents et frontières posées avec sagesse.$md$,
      'beginner', 35, 'Rév. Elvis NGUIFFO', TRUE, 8)
    RETURNING id INTO c;

    INSERT INTO public.institut_modules (course_id, slug, title, description, order_index)
    VALUES (c, 'm1', $md$Des relations saines avec la belle-famille$md$, $md$Équilibrer honneur et unité du couple.$md$, 1)
    RETURNING id INTO m;
    INSERT INTO public.institut_lessons (module_id, course_id, slug, title, description, content_md, duration_secs, order_index) VALUES
      (m, c, 'mfr-bellefamille-l1', $md$Quitter pour s'attacher$md$, $md$La priorité du couple.$md$,
$md$## Quitter pour s'attacher

> « C'est pourquoi l'homme quittera son père et sa mère, et s'attachera à sa femme. » — Genèse 2:24

« Quitter » ne signifie pas cesser d'aimer ses parents, mais **réorganiser ses priorités** : le couple devient la cellule première.

Un foyer solide se construit quand mari et femme se font équipe, sans ingérence qui divise.

**À méditer :** Ton couple passe-t-il avant les attentes de la belle-famille quand il le faut ?$md$, 420, 1),
      (m, c, 'mfr-bellefamille-l2', $md$Honorer ses parents et beaux-parents$md$, $md$L'honneur reste un commandement.$md$,
$md$## Honorer, toujours

> « Honore ton père et ta mère, afin que tes jours se prolongent. » — Exode 20:12

Poser des frontières n'annule pas l'honneur dû aux parents et beaux-parents. Ruth en est un bel exemple : fidélité et respect (Ruth 1:16).

On peut être ferme sur les limites tout en restant **respectueux et aimant**.

**Prière :** Seigneur, aide-moi à honorer nos familles tout en protégeant notre couple. Amen.$md$, 420, 2),
      (m, c, 'mfr-bellefamille-l3', $md$Poser des frontières avec sagesse$md$, $md$Protéger ce que Dieu a uni.$md$,
$md$## Des frontières saines

> « Garde ton cœur plus que toute autre chose, car de lui viennent les sources de la vie. » — Proverbes 4:23

Des frontières claires, décidées **ensemble** par le couple et exprimées avec douceur, préviennent bien des tensions.

Le couple parle d'une seule voix : ce n'est pas l'un contre sa propre famille, mais les deux unis.

**À méditer :** Quelle frontière saine devez-vous poser, ensemble, dès maintenant ?$md$, 420, 3);
  END IF;

  -- ============ COURS 9 — Sexualité dans le mariage selon la Bible ============
  SELECT id INTO c FROM public.institut_courses WHERE slug = 'mfr-sexualite-mariage';
  IF c IS NULL THEN
    INSERT INTO public.institut_courses (category_id, slug, title, subtitle, description, level, duration_mins, instructor, is_published, order_index)
    VALUES (v_cat, 'mfr-sexualite-mariage',
      $md$Sexualité dans le mariage selon la Bible$md$,
      $md$Un don de Dieu pour le couple$md$,
      $md$La vision biblique de l'intimité conjugale : un don béni, vécu dans le respect, le don de soi et la fidélité.$md$,
      'intermediate', 35, 'Rév. Elvis NGUIFFO', TRUE, 9)
    RETURNING id INTO c;

    INSERT INTO public.institut_modules (course_id, slug, title, description, order_index)
    VALUES (c, 'm1', $md$L'intimité, un don de Dieu$md$, $md$Comprendre le dessein de Dieu pour l'intimité du couple.$md$, 1)
    RETURNING id INTO m;
    INSERT INTO public.institut_lessons (module_id, course_id, slug, title, description, content_md, duration_secs, order_index) VALUES
      (m, c, 'mfr-sexualite-l1', $md$Un don béni dans le mariage$md$, $md$L'intimité voulue et honorée par Dieu.$md$,
$md$## Un don béni

> « L'homme et sa femme étaient tous deux nus, et ils n'en avaient point honte. » — Genèse 2:24-25
> « Que le mariage soit honoré de tous, et le lit conjugal exempt de souillure. » — Hébreux 13:4

L'intimité conjugale n'est ni honteuse ni « tolérée » : c'est un **don du Créateur**, réservé au cadre protecteur du mariage.

Vécue dans l'amour et le respect, elle renforce l'unité « une seule chair » du couple.

**À méditer :** Considères-tu l'intimité de ton couple comme un don à honorer devant Dieu ?$md$, 420, 1),
      (m, c, 'mfr-sexualite-l2', $md$Le don réciproque$md$, $md$S'appartenir dans le respect mutuel.$md$,
$md$## Le don réciproque

> « Que le mari rende à sa femme ce qu'il lui doit, et que la femme agisse de même envers son mari… ne vous privez point l'un de l'autre… » — 1 Corinthiens 7:3-5

La Bible présente l'intimité comme un **don mutuel** : chacun pense d'abord au bien de l'autre, dans la tendresse et l'écoute, jamais la contrainte.

Le respect, la douceur et la communication en sont les fondements.

**Prière :** Seigneur, apprends-nous à nous aimer dans le respect et le don de soi. Amen.$md$, 420, 2),
      (m, c, 'mfr-sexualite-l3', $md$Pureté et fidélité du cœur$md$, $md$Protéger son couple.$md$,
$md$## Pureté et fidélité

> « Sois dans l'allégresse à cause de la femme de ta jeunesse… que ses charmes te pénètrent en tout temps. » — Proverbes 5:18-19
> « Quiconque regarde une femme pour la convoiter a déjà commis adultère avec elle dans son cœur. » — Matthieu 5:28

La fidélité commence dans le **cœur et le regard**. Protéger son couple, c'est aussi garder ses yeux et ses pensées.

L'épanouissement se trouve dans l'engagement exclusif envers son conjoint.

**À méditer :** Quelles habitudes garder (ou abandonner) pour protéger la fidélité de ton cœur ?$md$, 420, 3);
  END IF;

  -- ============ COURS 10 — Monoparentalité et foi ============
  SELECT id INTO c FROM public.institut_courses WHERE slug = 'mfr-monoparentalite-foi';
  IF c IS NULL THEN
    INSERT INTO public.institut_courses (category_id, slug, title, subtitle, description, level, duration_mins, instructor, is_published, order_index)
    VALUES (v_cat, 'mfr-monoparentalite-foi',
      $md$Monoparentalité et foi$md$,
      $md$Élever seul(e), mais jamais abandonné(e)$md$,
      $md$Encouragement et sagesse pour les parents seuls : la paternité de Dieu, sa grâce dans la faiblesse et l'appui de la communauté.$md$,
      'beginner', 35, 'Rév. Elvis NGUIFFO', TRUE, 10)
    RETURNING id INTO c;

    INSERT INTO public.institut_modules (course_id, slug, title, description, order_index)
    VALUES (c, 'm1', $md$Élever seul(e), avec Dieu$md$, $md$Trouver force et soutien en Dieu et dans l'Église.$md$, 1)
    RETURNING id INTO m;
    INSERT INTO public.institut_lessons (module_id, course_id, slug, title, description, content_md, duration_secs, order_index) VALUES
      (m, c, 'mfr-mono-l1', $md$Dieu, père et défenseur$md$, $md$Tu n'es pas seul(e).$md$,
$md$## Dieu, père et défenseur

> « Il est le père des orphelins, le défenseur des veuves… Dieu donne une famille à ceux qui étaient abandonnés. » — Psaume 68:5-6

Le parent seul n'est jamais réellement seul : **Dieu lui-même** se présente comme père, défenseur et soutien.

Là où une présence manque, Dieu promet la sienne, fidèle et constante.

**À méditer :** Comment inviter Dieu à être le « co-parent » fidèle de ton foyer ?$md$, 420, 1),
      (m, c, 'mfr-mono-l2', $md$Sa grâce suffit dans la faiblesse$md$, $md$La force dans la fatigue.$md$,
$md$## Sa grâce suffit

> « Ma grâce te suffit, car ma puissance s'accomplit dans la faiblesse. » — 2 Corinthiens 12:9

Porter seul(e) le quotidien épuise. Mais Dieu ne demande pas la perfection : il offre sa **grâce** et sa force, surtout quand on est à bout.

S'appuyer sur lui chaque jour, dans la prière, renouvelle les forces (És 40:31).

**Prière :** Seigneur, dans ma fatigue, sois ma force ; ta grâce me suffit aujourd'hui. Amen.$md$, 420, 2),
      (m, c, 'mfr-mono-l3', $md$Ne pas porter seul : l'appui de l'Église$md$, $md$La famille de la foi.$md$,
$md$## L'appui de la communauté

> « Portez les fardeaux les uns des autres, et vous accomplirez ainsi la loi de Christ. » — Galates 6:2

Dieu a prévu l'**Église** comme une famille : mentors, groupes, entraide pratique et prière pour entourer le parent seul et ses enfants.

Demander et accepter de l'aide est un acte de sagesse et de foi, pas un aveu d'échec.

**À méditer :** Quel pas faire cette semaine pour ne plus porter seul(e) — un groupe, un mentor, une prière partagée ?$md$, 420, 3);
  END IF;
END $seed$;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v83 — Cours supplémentaires « Mariage, Famille et Relation »
-- =====================================================================
