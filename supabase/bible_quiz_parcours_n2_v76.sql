-- =====================================================================
-- CCB — BIBLE QUIZ : PARCOURS DE DISCIPOLAT — NIVEAU 2 « Fondations »  v76
--
--   Ajoute les 50 questions du Niveau 2 (5 étapes × 10 questions) :
--     É1 La Bible · É2 La Prière · É3 Le Saint-Esprit · É4 L'Église
--     · É5 Fondations Chrétiennes
--
--   Les 5 étapes (manches) ont déjà été créées par v75. Cette migration
--   n'insère les questions QUE si l'étape est encore vide → idempotente,
--   ne touche à rien si elle a déjà été exécutée.
--
-- À exécuter dans Supabase SQL Editor. Dépend de v75 (parcours en place).
-- =====================================================================

DO $seed2$
DECLARE v UUID;
BEGIN
  -- ─── É1 — La Bible ─────────────────────────────────────────────────
  SELECT id INTO v FROM public.quiz_quizzes WHERE track='parcours' AND level=2 AND sort_order=1;
  IF v IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id=v) THEN
    INSERT INTO public.quiz_questions (quiz_id, text, option_a, option_b, option_c, option_d, correct_option, is_difficult, reference, sort_order) VALUES
      (v,'Combien de livres compose la Bible ?','27','39','66','73','C',FALSE,'Canon biblique',1),
      (v,'En combien de grandes parties la Bible se divise-t-elle ?','Une seule','Deux : Ancien et Nouveau Testament','Trois','Quatre','B',FALSE,'2 Timothée 3:16',2),
      (v,'Quel est le tout premier livre de la Bible ?','Exode','Genèse','Matthieu','Psaumes','B',FALSE,'Genèse 1:1',3),
      (v,'Quel est le dernier livre de la Bible ?','Malachie','Jean','Apocalypse','Actes','C',FALSE,'Apocalypse 22:21',4),
      (v,'Combien y a-t-il d''Évangiles ?','Deux','Trois','Quatre','Cinq','C',FALSE,'Matthieu, Marc, Luc, Jean',5),
      (v,'Selon 2 Timothée 3:16, d''où vient toute l''Écriture ?','Des hommes','Elle est inspirée de Dieu','Des anges','Des rois','B',FALSE,'2 Timothée 3:16',6),
      (v,'À quoi la Parole est-elle comparée en Psaume 119:105 ?','Un feu','Une lampe à mes pieds et une lumière sur mon sentier','Un marteau','Un trésor','B',FALSE,'Psaume 119:105',7),
      (v,'Dans Éphésiens 6:17, la Parole de Dieu est appelée…','le bouclier de la foi','l''épée de l''Esprit','le casque du salut','la ceinture de la vérité','B',FALSE,'Éphésiens 6:17',8),
      (v,'Que demande Josué 1:8 au sujet du livre de la loi ?','De l''oublier','De le méditer jour et nuit','De le cacher','De le vendre','B',FALSE,'Josué 1:8',9),
      (v,'Comment Hébreux 4:12 décrit-il la Parole de Dieu ?','Vivante et efficace','Inutile','Faible','Périmée','A',FALSE,'Hébreux 4:12',10);
  END IF;

  -- ─── É2 — La Prière ────────────────────────────────────────────────
  SELECT id INTO v FROM public.quiz_quizzes WHERE track='parcours' AND level=2 AND sort_order=2;
  IF v IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id=v) THEN
    INSERT INTO public.quiz_questions (quiz_id, text, option_a, option_b, option_c, option_d, correct_option, is_difficult, reference, sort_order) VALUES
      (v,'Quelle prière modèle Jésus a-t-il enseignée à ses disciples ?','Le Magnificat','Le Notre Père','Le Psaume 23','Le Cantique des cantiques','B',FALSE,'Matthieu 6:9',1),
      (v,'Comment commence le Notre Père ?','« Notre Père qui es aux cieux »','« Seigneur, sauve-moi »','« Gloire à Dieu »','« Béni soit l''Éternel »','A',FALSE,'Matthieu 6:9',2),
      (v,'Selon 1 Thessaloniciens 5:17, à quelle fréquence prier ?','Une fois par jour','Sans cesse','Seulement le dimanche','Une fois par an','B',FALSE,'1 Thessaloniciens 5:17',3),
      (v,'Que faire de nos inquiétudes selon Philippiens 4:6 ?','Les garder','Présenter nos demandes à Dieu par la prière','Les fuir','S''en plaindre','B',FALSE,'Philippiens 4:6',4),
      (v,'Au nom de qui présentons-nous nos prières (Jean 14:13-14) ?','De Moïse','De Jésus','Des anges','Des prophètes','B',FALSE,'Jean 14:13-14',5),
      (v,'Où Jésus se retirait-il souvent pour prier ?','Dans les marchés','Dans des lieux déserts et sur la montagne','Au temple uniquement','Dans les maisons','B',FALSE,'Luc 5:16',6),
      (v,'Que demandent les disciples à Jésus en Luc 11:1 ?','« Apprends-nous à prier »','« Donne-nous du pain »','« Renvoie la foule »','« Guéris-nous »','A',FALSE,'Luc 11:1',7),
      (v,'Selon Jacques 5:16, la prière fervente du juste a une grande…','richesse','efficacité','tristesse','crainte','B',FALSE,'Jacques 5:16',8),
      (v,'Comment s''approcher de Dieu dans la prière (Hébreux 11:6) ?','Avec doute','Avec foi','Avec colère','Avec orgueil','B',FALSE,'Hébreux 11:6',9),
      (v,'Que devons-nous joindre à nos prières selon Philippiens 4:6 ?','Des actions de grâces','Des plaintes','Du silence','Des sacrifices','A',FALSE,'Philippiens 4:6',10);
  END IF;

  -- ─── É3 — Le Saint-Esprit ──────────────────────────────────────────
  SELECT id INTO v FROM public.quiz_quizzes WHERE track='parcours' AND level=2 AND sort_order=3;
  IF v IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id=v) THEN
    INSERT INTO public.quiz_questions (quiz_id, text, option_a, option_b, option_c, option_d, correct_option, is_difficult, reference, sort_order) VALUES
      (v,'Qui est le Saint-Esprit ?','Une force impersonnelle','La troisième personne de la Trinité, Dieu lui-même','Un ange','Un prophète','B',FALSE,'Jean 14:26',1),
      (v,'Comment Jésus appelle-t-il le Saint-Esprit en Jean 14:26 ?','Le Consolateur','Le Juge','Le Roi','Le Serviteur','A',FALSE,'Jean 14:26',2),
      (v,'Le jour de la Pentecôte, sous quelle forme l''Esprit est-il apparu ?','Une colombe','Des langues comme de feu','Un nuage','Un éclair','B',FALSE,'Actes 2:3',3),
      (v,'Quel est le fruit de l''Esprit selon Galates 5:22 ?','La richesse','L''amour, la joie, la paix, la patience…','La crainte','La colère','B',FALSE,'Galates 5:22',4),
      (v,'Que fait le Saint-Esprit selon Jean 16:13 ?','Il condamne','Il nous conduit dans toute la vérité','Il accuse','Il se tait','B',FALSE,'Jean 16:13',5),
      (v,'Selon Actes 1:8, que recevons-nous quand l''Esprit vient sur nous ?','De la richesse','De la puissance pour être témoins','Un trône','Une terre','B',FALSE,'Actes 1:8',6),
      (v,'Quel est le rôle de l''Esprit dans la prière (Romains 8:26) ?','Il dort','Il intercède pour nous','Il nous accuse','Il nous juge','B',FALSE,'Romains 8:26',7),
      (v,'Notre corps est appelé le temple de qui (1 Corinthiens 6:19) ?','Des anges','Du Saint-Esprit','De César','Des prophètes','B',FALSE,'1 Corinthiens 6:19',8),
      (v,'Que ne faut-il pas faire au Saint-Esprit selon Éphésiens 4:30 ?','Le servir','L''attrister','L''écouter','L''adorer','B',FALSE,'Éphésiens 4:30',9),
      (v,'Qui avait promis le Saint-Esprit avant la Pentecôte ?','Moïse','Jésus','David','Élie','B',FALSE,'Jean 14:16',10);
  END IF;

  -- ─── É4 — L'Église ─────────────────────────────────────────────────
  SELECT id INTO v FROM public.quiz_quizzes WHERE track='parcours' AND level=2 AND sort_order=4;
  IF v IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id=v) THEN
    INSERT INTO public.quiz_questions (quiz_id, text, option_a, option_b, option_c, option_d, correct_option, is_difficult, reference, sort_order) VALUES
      (v,'Qui est le chef (la tête) de l''Église ?','Le pape','Jésus-Christ','Pierre','Paul','B',FALSE,'Colossiens 1:18',1),
      (v,'À quoi l''Église est-elle comparée en 1 Corinthiens 12 ?','À un bâtiment seulement','Au corps de Christ','À une armée','À un marché','B',FALSE,'1 Corinthiens 12:27',2),
      (v,'Dans quoi persévéraient les premiers chrétiens (Actes 2:42) ?','Dans les disputes','Dans l''enseignement, la communion, la fraction du pain et la prière','Dans le sommeil','Dans le commerce','B',FALSE,'Actes 2:42',3),
      (v,'Sur quelle confession Jésus dit-il bâtir son Église (Matthieu 16:16-18) ?','« Tu es le Christ, le Fils du Dieu vivant »','« Tu es Élie »','« Tu es un prophète »','« Tu es Jean-Baptiste »','A',FALSE,'Matthieu 16:16-18',4),
      (v,'Que ne faut-il pas abandonner selon Hébreux 10:25 ?','Le travail','Notre assemblée, l''habitude de nous réunir','La nourriture','Le repos','B',FALSE,'Hébreux 10:25',5),
      (v,'Quelles deux ordonnances Jésus a-t-il instituées pour l''Église ?','Le baptême et la sainte cène','La dîme et le jeûne','Les fêtes et les sacrifices','Le sabbat et la circoncision','A',FALSE,'Matthieu 28:19 ; Luc 22:19',6),
      (v,'Au nom de qui les croyants sont-ils baptisés (Matthieu 28:19) ?','Du Père, du Fils et du Saint-Esprit','Des apôtres','De Moïse','De l''Église','A',FALSE,'Matthieu 28:19',7),
      (v,'Que représente la sainte cène ?','Le corps et le sang de Christ','Un simple repas','Une fête nationale','Un sacrifice d''animaux','A',FALSE,'1 Corinthiens 11:23-26',8),
      (v,'Comment les disciples doivent-ils s''aimer (Jean 13:34-35) ?','Par intérêt','Comme Jésus nous a aimés','Selon leurs mérites','Par obligation','B',FALSE,'Jean 13:34-35',9),
      (v,'Quels ministères Dieu a-t-il donnés à l''Église (Éphésiens 4:11) ?','Apôtres, prophètes, évangélistes, pasteurs et docteurs','Rois et juges','Scribes et lévites','Princes et chefs','A',FALSE,'Éphésiens 4:11',10);
  END IF;

  -- ─── É5 — Fondations Chrétiennes (synthèse) ────────────────────────
  SELECT id INTO v FROM public.quiz_quizzes WHERE track='parcours' AND level=2 AND sort_order=5;
  IF v IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.quiz_questions WHERE quiz_id=v) THEN
    INSERT INTO public.quiz_questions (quiz_id, text, option_a, option_b, option_c, option_d, correct_option, is_difficult, reference, sort_order) VALUES
      (v,'Quel est l''unique fondement selon 1 Corinthiens 3:11 ?','Pierre','Jésus-Christ','La Loi','L''Église','B',FALSE,'1 Corinthiens 3:11',1),
      (v,'Sur quoi l''homme sage bâtit-il sa maison (Matthieu 7:24) ?','Le sable','Le roc','L''eau','Le bois','B',FALSE,'Matthieu 7:24-25',2),
      (v,'Quelles sont des premières fondations de la foi selon Hébreux 6:1-2 ?','La repentance et la foi en Dieu','La richesse','Les traditions humaines','La politique','A',FALSE,'Hébreux 6:1-2',3),
      (v,'Selon Romains 1:17, le juste vivra par…','ses œuvres','la foi','la Loi','sa force','B',FALSE,'Romains 1:17',4),
      (v,'Sans quoi est-il impossible de plaire à Dieu (Hébreux 11:6) ?','Sans argent','Sans la foi','Sans la Loi','Sans le temple','B',FALSE,'Hébreux 11:6',5),
      (v,'Quelle est la plus grande des trois : foi, espérance, amour ?','La foi','L''amour','L''espérance','Elles sont égales','B',FALSE,'1 Corinthiens 13:13',6),
      (v,'Que devons-nous chercher en premier selon Matthieu 6:33 ?','La richesse','Le royaume de Dieu et sa justice','La gloire','Le pouvoir','B',FALSE,'Matthieu 6:33',7),
      (v,'Comment grandir spirituellement selon 1 Pierre 2:2 ?','En désirant le lait spirituel de la Parole','En dormant','En se taisant','En jeûnant seulement','A',FALSE,'1 Pierre 2:2',8),
      (v,'Que demande Jacques 1:22 à propos de la Parole ?','La pratiquer, pas seulement l''écouter','L''oublier','La cacher','La discuter','A',FALSE,'Jacques 1:22',9),
      (v,'Quel est le résumé de la Loi selon Jésus (Matthieu 22:37-39) ?','Aimer Dieu de tout son cœur et son prochain comme soi-même','Payer la dîme','Observer le sabbat','Offrir des sacrifices','A',FALSE,'Matthieu 22:37-39',10);
  END IF;
END $seed2$;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v76 — Parcours Niveau 2 « Fondations » (50 questions)
-- =====================================================================
