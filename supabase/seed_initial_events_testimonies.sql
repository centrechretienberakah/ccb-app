-- =====================================================================
-- CCB SEED — Bootcamp 2026 + Témoignages Bootcamp 2025
-- À exécuter dans Supabase SQL Editor (idempotent via ON CONFLICT)
-- =====================================================================
-- Migration du contenu hardcodé (EventsClient.tsx, TemoignagesClient.tsx)
-- vers les tables DB pour permettre la gestion via /admin.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Bootcamp Annuel CCB 2026 dans public.events
-- ---------------------------------------------------------------------

-- Crée la colonne event_type si elle n'existe pas (selon schémas anciens)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_type TEXT;

-- INSERT bootcamp (idempotent : skip si même titre existe déjà)
INSERT INTO public.events (
  title, subtitle, description,
  event_date, end_date, location, location_url, is_online, stream_url, image_url,
  is_published, status, event_type, created_at
)
SELECT
  'Bootcamp Annuel CCB 2026 — SEMBLABLE À CHRIST',
  'Romains 8:29',
  'Notre retraite spirituelle annuelle : 3 jours de communion fraternelle, de Parole, de prière et de transformation. Thème 2026 : SEMBLABLE À CHRIST (Romains 8:29) — devenir conforme à l''image du Fils. Ouvert aux membres CCB et invités, en présentiel à Douala et en ligne pour les fidèles dispersés.',
  '2026-06-26 09:00:00+00',
  '2026-06-28 18:00:00+00',
  'Douala, Cameroun',
  NULL,
  true,
  'https://bootcamp.centrechretienberakah.com',
  NULL,
  true,
  'upcoming',
  'bootcamp',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.events WHERE title LIKE 'Bootcamp Annuel CCB 2026%'
);

-- ---------------------------------------------------------------------
-- 2. Témoignages Bootcamp 2025 dans public.testimonies
-- ---------------------------------------------------------------------

-- Ajoute la colonne author_name si absente (pour stocker le nom affiché
-- sans nécessiter qu'un user_profile existe pour chaque témoin)
ALTER TABLE public.testimonies
  ADD COLUMN IF NOT EXISTS author_name TEXT,
  ADD COLUMN IF NOT EXISTS author_role TEXT,
  ADD COLUMN IF NOT EXISTS author_country TEXT,
  ADD COLUMN IF NOT EXISTS author_initial TEXT,
  ADD COLUMN IF NOT EXISTS author_photo TEXT;

-- Rend user_id optionnel si la migration a une contrainte NOT NULL héritée
DO $$ BEGIN
  ALTER TABLE public.testimonies ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ID owner pour attribuer les témoignages collectés par le pasteur
DO $$
DECLARE
  v_owner UUID := '54b186c1-8f5b-46c6-b9bc-3b36a3dfdd73';
BEGIN
  -- Témoignage 1 — Kévin Bouna
  INSERT INTO public.testimonies (
    user_id, title, content, category,
    author_name, author_role, author_country, author_initial, author_photo,
    is_approved, is_featured, created_at
  )
  SELECT v_owner,
    'Bootcamp 2025 — Briser les cycles',
    'J''ai compris que je ne suis pas appelé à répéter les erreurs du passé, mais à devenir un instrument de transformation. Ce camp m''a révélé que les cycles négatifs peuvent être brisés en Dieu — par l''obéissance et une relation sincère avec Lui. Je repars avec une vision claire : être un canal de bénédiction pour ma génération.',
    'salvation', 'Kévin Bouna', 'Membre CCB · Canada', '🇨🇦', 'K', '/testimonie-kevin.jpg',
    true, true, NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.testimonies WHERE author_name = 'Kévin Bouna' AND is_featured = true);

  -- Témoignage 2 — Djeumo Daïna
  INSERT INTO public.testimonies (
    user_id, title, content, category,
    author_name, author_role, author_country, author_initial, author_photo,
    is_approved, is_featured, created_at
  )
  SELECT v_owner,
    'Bootcamp 2025 — Découvrir qui je suis en Christ',
    'La retraite 2025 a été un tournant dans ma vie. En seulement quelques jours, j''ai découvert qui je suis réellement en Christ. J''ai ressenti une véritable atmosphère de famille, une présence réelle de Jésus-Christ… et même vécu un miracle. Dieu m''a protégée. Je ne suis plus la même.',
    'salvation', 'Djeumo Daïna', 'Membre CCB · Yaoundé', '🇨🇲', 'D', '/testimonie-daina.jpg',
    true, true, NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.testimonies WHERE author_name = 'Djeumo Daïna' AND is_featured = true);

  -- Témoignage 3 — Cabrelle Djontso
  INSERT INTO public.testimonies (
    user_id, title, content, category,
    author_name, author_role, author_country, author_initial, author_photo,
    is_approved, is_featured, created_at
  )
  SELECT v_owner,
    'Bootcamp 2025 — Briser les limites générationnelles',
    'Un cadre magnifique, une atmosphère de joie et de partage de la Parole… J''ai découvert une nouvelle version de moi-même. J''ai appris à poser des limites, à me connaître, et compris que les limites générationnelles peuvent être brisées. Je t''invite à nous rejoindre — tu ne regretteras pas !',
    'deliverance', 'Cabrelle Djontso', 'Membre CCB · Yaoundé', '🇨🇲', 'C', '/testimonie-cabrelle.jpg',
    true, true, NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.testimonies WHERE author_name = 'Cabrelle Djontso' AND is_featured = true);

  -- Témoignage 4 — MD Merveille Djambong
  INSERT INTO public.testimonies (
    user_id, title, content, category,
    author_name, author_role, author_country, author_initial, author_photo,
    is_approved, is_featured, created_at
  )
  SELECT v_owner,
    'Bootcamp 2025 — Esprit de famille',
    'Une retraite bien organisée, un programme respecté, et surtout une présence de Dieu tangible au milieu de nous. J''ai été touchée par l''esprit de famille qui régnait. C''était formidable — et j''ai hâte de vivre ça à nouveau avec de nouveaux visages !',
    'family', 'MD Merveille Djambong', 'Membre CCB · Douala', '🇨🇲', 'M', NULL,
    true, true, NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.testimonies WHERE author_name = 'MD Merveille Djambong' AND is_featured = true);

  -- Témoignage 5 — Christiana Nguiffo
  INSERT INTO public.testimonies (
    user_id, title, content, category,
    author_name, author_role, author_country, author_initial, author_photo,
    is_approved, is_featured, created_at
  )
  SELECT v_owner,
    'Bootcamp 2025 — Bénédictions générationnelles',
    'Ce fut un moment de communion fraternelle intense — louange, adoration, détente, et une Parole qui transforme. Nous avons appris que si nous sommes en Christ, il n''y a plus de malédiction : chaque bienfait devient une bénédiction générationnelle. J''ai hâte d''être à la retraite 2026 !',
    'family', 'Christiana Nguiffo', 'Co-Hôte · Membre CCB · Belgique', '🇧🇪', 'C', '/testimonie-christiana.jpg',
    true, true, NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.testimonies WHERE author_name = 'Christiana Nguiffo' AND is_featured = true);
END $$;

-- =====================================================================
-- FIN
-- =====================================================================
