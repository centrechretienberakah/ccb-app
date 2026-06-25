-- =====================================================================
-- CCB — MÉDITONS ENSEMBLE : SEED CALENDRIER  Juillet + Août 2026  v78
--
--   Pré-remplit le calendrier éditorial (tables créées par v77) avec deux
--   mois complets fournis par le pasteur :
--     • Juillet 2026 — « Nouveau commencement »  (Ésaïe 43:18-19)
--     • Août 2026    — « La Générosité »          (2 Corinthiens 9:5-11)
--
--   Chaque jour = thème + verset (la rédaction est faite par l'IA au format
--   habituel à minuit). Semaines = sous-thèmes (S1..S5, S5 = jours 29-31).
--
--   Idempotent : ré-exécutable sans doublon (met à jour le contenu existant).
--
-- À exécuter dans Supabase → SQL Editor APRÈS v77.
-- =====================================================================

DO $seed$
DECLARE
  m_jul UUID;
  m_aug UUID;
BEGIN
  -- ================= JUILLET 2026 — Nouveau commencement =============
  INSERT INTO public.devotion_cal_months (year, month, label, theme, main_verse)
  VALUES (2026, 7, 'Juillet 2026', 'Nouveau commencement', 'Ésaïe 43:18-19')
  ON CONFLICT (year, month) DO UPDATE
    SET label = EXCLUDED.label, theme = EXCLUDED.theme,
        main_verse = EXCLUDED.main_verse, updated_at = now()
  RETURNING id INTO m_jul;

  INSERT INTO public.devotion_cal_weeks (month_id, week_no, theme) VALUES
    (m_jul, 1, 'Laisser le passé derrière soi'),
    (m_jul, 2, 'Accueillir la nouveauté de Dieu'),
    (m_jul, 3, 'Rebâtir avec Dieu'),
    (m_jul, 4, 'Marcher dans la nouvelle saison'),
    (m_jul, 5, 'Clôture et consécration')
  ON CONFLICT (month_id, week_no) DO UPDATE SET theme = EXCLUDED.theme;

  INSERT INTO public.devotion_cal_days (month_id, cal_date, day_no, week_no, day_theme, day_verse) VALUES
    (m_jul,'2026-07-01', 1,1,'Oublier les choses passées','Ésaïe 43:18'),
    (m_jul,'2026-07-02', 2,1,'Guérir des blessures d''hier','Psaume 147:3'),
    (m_jul,'2026-07-03', 3,1,'Se libérer de la culpabilité','Romains 8:1'),
    (m_jul,'2026-07-04', 4,1,'Renoncer aux échecs du passé','Philippiens 3:13-14'),
    (m_jul,'2026-07-05', 5,1,'Pardonner pour avancer','Éphésiens 4:31-32'),
    (m_jul,'2026-07-06', 6,1,'Tourner la page avec Dieu','2 Corinthiens 5:17'),
    (m_jul,'2026-07-07', 7,1,'Entrer dans une nouvelle saison','Ecclésiaste 3:1'),
    (m_jul,'2026-07-08', 8,2,'Dieu fait une chose nouvelle','Ésaïe 43:19'),
    (m_jul,'2026-07-09', 9,2,'Reconnaître les opportunités divines','Apocalypse 3:8'),
    (m_jul,'2026-07-10',10,2,'Sortir de sa zone de confort','Genèse 12:1'),
    (m_jul,'2026-07-11',11,2,'Dire oui aux plans de Dieu','Jérémie 29:11'),
    (m_jul,'2026-07-12',12,2,'Suivre la direction du Saint-Esprit','Romains 8:14'),
    (m_jul,'2026-07-13',13,2,'Croire à de nouveaux commencements','Lamentations 3:22-23'),
    (m_jul,'2026-07-14',14,2,'Marcher par la foi vers l''inconnu','Hébreux 11:8'),
    (m_jul,'2026-07-15',15,3,'Recommencer avec Dieu','Aggée 2:4'),
    (m_jul,'2026-07-16',16,3,'Reconstruire sa vie spirituelle','Néhémie 2:18'),
    (m_jul,'2026-07-17',17,3,'Renouveler son engagement envers Dieu','Josué 24:15'),
    (m_jul,'2026-07-18',18,3,'Restaurer sa communion avec Dieu','Jacques 4:8'),
    (m_jul,'2026-07-19',19,3,'Reprendre courage après une chute','Proverbes 24:16'),
    (m_jul,'2026-07-20',20,3,'Poser de nouvelles fondations','Matthieu 7:24-25'),
    (m_jul,'2026-07-21',21,3,'Persévérer dans le processus','Galates 6:9'),
    (m_jul,'2026-07-22',22,4,'Avancer avec confiance','Josué 1:9'),
    (m_jul,'2026-07-23',23,4,'Développer une vision nouvelle','Habakuk 2:2-3'),
    (m_jul,'2026-07-24',24,4,'Saisir les promesses de Dieu','2 Corinthiens 1:20'),
    (m_jul,'2026-07-25',25,4,'Vivre selon sa nouvelle identité','2 Corinthiens 5:17'),
    (m_jul,'2026-07-26',26,4,'Porter du fruit dans la nouvelle saison','Jean 15:5'),
    (m_jul,'2026-07-27',27,4,'Rester fidèle dans les petits commencements','Zacharie 4:10'),
    (m_jul,'2026-07-28',28,4,'Dieu accomplit ce qu''il commence','Philippiens 1:6'),
    (m_jul,'2026-07-29',29,5,'Renouveler son alliance avec Dieu','Deutéronome 29:12-13'),
    (m_jul,'2026-07-30',30,5,'Consacrer son avenir au Seigneur','Proverbes 3:5-6'),
    (m_jul,'2026-07-31',31,5,'Entrer pleinement dans sa destinée','Éphésiens 2:10')
  ON CONFLICT (cal_date) DO UPDATE
    SET month_id = EXCLUDED.month_id, day_no = EXCLUDED.day_no, week_no = EXCLUDED.week_no,
        day_theme = EXCLUDED.day_theme, day_verse = EXCLUDED.day_verse, updated_at = now();

  -- ===================== AOÛT 2026 — La Générosité ==================
  INSERT INTO public.devotion_cal_months (year, month, label, theme, main_verse)
  VALUES (2026, 8, 'Août 2026', 'La Générosité', '2 Corinthiens 9:5-11')
  ON CONFLICT (year, month) DO UPDATE
    SET label = EXCLUDED.label, theme = EXCLUDED.theme,
        main_verse = EXCLUDED.main_verse, updated_at = now()
  RETURNING id INTO m_aug;

  INSERT INTO public.devotion_cal_weeks (month_id, week_no, theme) VALUES
    (m_aug, 1, 'Comprendre le cœur de la générosité'),
    (m_aug, 2, 'La générosité envers Dieu'),
    (m_aug, 3, 'La générosité envers les autres'),
    (m_aug, 4, 'Les récompenses de la générosité'),
    (m_aug, 5, 'Consécration à une vie de générosité')
  ON CONFLICT (month_id, week_no) DO UPDATE SET theme = EXCLUDED.theme;

  INSERT INTO public.devotion_cal_days (month_id, cal_date, day_no, week_no, day_theme, day_verse) VALUES
    (m_aug,'2026-08-01', 1,1,'Dieu est la source de toute générosité','Jacques 1:17'),
    (m_aug,'2026-08-02', 2,1,'La générosité reflète le caractère de Dieu','Jean 3:16'),
    (m_aug,'2026-08-03', 3,1,'Donner avec un cœur volontaire','2 Corinthiens 9:7'),
    (m_aug,'2026-08-04', 4,1,'Éviter l''avarice et l''égoïsme','Luc 12:15'),
    (m_aug,'2026-08-05', 5,1,'La joie de donner','Actes 20:35'),
    (m_aug,'2026-08-06', 6,1,'Donner par amour','1 Corinthiens 13:3'),
    (m_aug,'2026-08-07', 7,1,'La générosité comme style de vie','Proverbes 11:25'),
    (m_aug,'2026-08-08', 8,2,'Honorer Dieu avec ses biens','Proverbes 3:9-10'),
    (m_aug,'2026-08-09', 9,2,'Le principe de la dîme','Malachie 3:10'),
    (m_aug,'2026-08-10',10,2,'Offrir à Dieu le meilleur','Genèse 4:4'),
    (m_aug,'2026-08-11',11,2,'Donner avec foi','Marc 12:41-44'),
    (m_aug,'2026-08-12',12,2,'Soutenir l''œuvre de Dieu','Philippiens 4:15-17'),
    (m_aug,'2026-08-13',13,2,'Être fidèle dans les petites choses','Luc 16:10'),
    (m_aug,'2026-08-14',14,2,'Dieu récompense la fidélité','Hébreux 6:10'),
    (m_aug,'2026-08-15',15,3,'Aimer son prochain par des actes','1 Jean 3:17-18'),
    (m_aug,'2026-08-16',16,3,'Partager avec ceux qui sont dans le besoin','Deutéronome 15:11'),
    (m_aug,'2026-08-17',17,3,'Donner sans attendre en retour','Luc 6:35'),
    (m_aug,'2026-08-18',18,3,'La compassion en action','Matthieu 25:40'),
    (m_aug,'2026-08-19',19,3,'Être un canal de bénédiction','Genèse 12:2'),
    (m_aug,'2026-08-20',20,3,'Pratiquer l''hospitalité','Romains 12:13'),
    (m_aug,'2026-08-21',21,3,'Porter les fardeaux les uns des autres','Galates 6:2'),
    (m_aug,'2026-08-22',22,4,'Celui qui sème abondamment moissonne abondamment','2 Corinthiens 9:6'),
    (m_aug,'2026-08-23',23,4,'Dieu pourvoit aux besoins du généreux','Philippiens 4:19'),
    (m_aug,'2026-08-24',24,4,'La générosité attire la faveur divine','Proverbes 22:9'),
    (m_aug,'2026-08-25',25,4,'Donner ouvre la porte aux bénédictions','Luc 6:38'),
    (m_aug,'2026-08-26',26,4,'La prospérité selon Dieu','3 Jean 1:2'),
    (m_aug,'2026-08-27',27,4,'Investir dans l''éternité','Matthieu 6:19-21'),
    (m_aug,'2026-08-28',28,4,'Un héritage de bénédiction','Psaume 112:5-9'),
    (m_aug,'2026-08-29',29,5,'Devenir un bon intendant','1 Pierre 4:10'),
    (m_aug,'2026-08-30',30,5,'Vivre pour bénir les autres','Actes 20:35'),
    (m_aug,'2026-08-31',31,5,'Consacrer ses ressources à Dieu','Romains 12:1')
  ON CONFLICT (cal_date) DO UPDATE
    SET month_id = EXCLUDED.month_id, day_no = EXCLUDED.day_no, week_no = EXCLUDED.week_no,
        day_theme = EXCLUDED.day_theme, day_verse = EXCLUDED.day_verse, updated_at = now();
END $seed$;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN v78 — Seed Juillet + Août 2026 (62 jours)
-- =====================================================================
