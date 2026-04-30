-- =====================================================
-- CCB APP — Schéma Base de Données Supabase
-- À exécuter dans : Supabase Dashboard → SQL Editor
-- =====================================================

-- Extension pour UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE PROFILES (extension de auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name     TEXT,
  avatar_url    TEXT,
  phone         TEXT,
  city          TEXT,
  country       TEXT DEFAULT 'Cameroun',
  bio           TEXT,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'leader', 'admin')),
  is_premium    BOOLEAN NOT NULL DEFAULT false,
  spiritual_level TEXT NOT NULL DEFAULT 'Nouveau croyant',
  badges        JSONB DEFAULT '[]'::jsonb,
  prayer_count  INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: créer un profil automatiquement à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: updated_at automatique
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- TABLE DAILY DEVOTIONS (dévotions quotidiennes)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.daily_devotions (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  devotion_date       DATE NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  verse_reference     TEXT NOT NULL,
  verse_text          TEXT NOT NULL,
  meditation_p1       TEXT,
  meditation_p2       TEXT,
  meditation_p3       TEXT,
  reflection_question TEXT,
  prayer              TEXT,
  declaration         TEXT,
  author              TEXT DEFAULT 'Pasteur CCB',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE ANNOUNCEMENTS (annonces)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  category    TEXT DEFAULT 'general' CHECK (category IN ('general', 'urgent', 'event', 'youth', 'prayer')),
  image_url   TEXT,
  is_pinned   BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE EVENTS (événements)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.events (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title         TEXT NOT NULL,
  subtitle      TEXT,
  description   TEXT,
  event_date    TIMESTAMPTZ NOT NULL,
  end_date      TIMESTAMPTZ,
  location      TEXT,
  location_url  TEXT,
  is_online     BOOLEAN DEFAULT false,
  stream_url    TEXT,
  image_url     TEXT,
  max_attendees INTEGER,
  is_free       BOOLEAN DEFAULT true,
  price         DECIMAL(10,2),
  status        TEXT DEFAULT 'upcoming' CHECK (status IN ('draft', 'upcoming', 'live', 'past', 'cancelled')),
  created_by    UUID REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE PRAYER REQUESTS (requêtes de prière)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  category        TEXT DEFAULT 'personal',
  is_anonymous    BOOLEAN DEFAULT false,
  is_answered     BOOLEAN DEFAULT false,
  prayer_count    INTEGER DEFAULT 0,
  testimony       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER prayer_requests_updated_at
  BEFORE UPDATE ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- TABLE TESTIMONIES (témoignages)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.testimonies (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  category    TEXT DEFAULT 'healing',
  is_approved BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  media_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE COURSES (cours de disciples)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  thumbnail_url TEXT,
  level         TEXT DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  duration_mins INTEGER DEFAULT 0,
  is_premium    BOOLEAN DEFAULT false,
  is_published  BOOLEAN DEFAULT false,
  order_index   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE DONATIONS (dons)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.donations (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id             UUID REFERENCES public.profiles(id),
  amount              DECIMAL(10,2) NOT NULL,
  currency            TEXT DEFAULT 'XAF',
  purpose             TEXT DEFAULT 'general',
  payment_provider    TEXT CHECK (payment_provider IN ('stripe', 'paypal', 'mobile_money', 'cash')),
  transaction_id      TEXT UNIQUE,
  status              TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  is_recurring        BOOLEAN DEFAULT false,
  is_anonymous        BOOLEAN DEFAULT false,
  donor_name          TEXT,
  donor_email         TEXT,
  message             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE JESUS DAILY (contenus vidéo)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.jesus_daily (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title           TEXT NOT NULL,
  scripture       TEXT NOT NULL,
  script          TEXT NOT NULL,
  theme           TEXT,
  video_url       TEXT,
  thumbnail_url   TEXT,
  duration_secs   INTEGER DEFAULT 45,
  is_published    BOOLEAN DEFAULT false,
  publish_date    DATE,
  views           INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE LIVE SESSIONS (cultes en direct)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  stream_url    TEXT,
  youtube_id    TEXT,
  status        TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
  scheduled_at  TIMESTAMPTZ,
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  viewer_count  INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_devotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jesus_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles: chaque utilisateur voit et modifie son propre profil
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);

-- Dévotions: tout le monde peut lire
CREATE POLICY "devotions_public_read" ON public.daily_devotions FOR SELECT USING (true);
CREATE POLICY "devotions_admin_write" ON public.daily_devotions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Annonces: tout le monde peut lire
CREATE POLICY "announcements_public_read" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "announcements_admin_write" ON public.announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'leader'))
);

-- Événements: tout le monde peut lire
CREATE POLICY "events_public_read" ON public.events FOR SELECT USING (true);
CREATE POLICY "events_admin_write" ON public.events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'leader'))
);

-- Requêtes de prière: authentifiés peuvent lire (sauf anonymes), chacun gère les siennes
CREATE POLICY "prayer_select_auth" ON public.prayer_requests FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "prayer_insert_auth" ON public.prayer_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prayer_update_own" ON public.prayer_requests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "prayer_delete_own" ON public.prayer_requests FOR DELETE USING (auth.uid() = user_id);

-- Témoignages: approuvés visibles par tous, chacun gère les siens
CREATE POLICY "testimonies_select_approved" ON public.testimonies FOR SELECT USING (is_approved = true);
CREATE POLICY "testimonies_insert_auth" ON public.testimonies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "testimonies_update_own" ON public.testimonies FOR UPDATE USING (auth.uid() = user_id);

-- Cours: publiés visibles par tous
CREATE POLICY "courses_public_read" ON public.courses FOR SELECT USING (is_published = true);
CREATE POLICY "courses_admin_write" ON public.courses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Dons: chacun voit ses propres dons, admins voient tout
CREATE POLICY "donations_own" ON public.donations FOR SELECT USING (auth.uid() = user_id OR is_anonymous = false);
CREATE POLICY "donations_insert" ON public.donations FOR INSERT WITH CHECK (true);

-- JESUS DAILY: publiés visibles par tous
CREATE POLICY "jesus_daily_public" ON public.jesus_daily FOR SELECT USING (is_published = true);
CREATE POLICY "jesus_daily_admin" ON public.jesus_daily FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Live sessions: tout le monde peut voir
CREATE POLICY "live_sessions_public" ON public.live_sessions FOR SELECT USING (true);

-- =====================================================
-- INDEX DE PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_devotions_date ON public.daily_devotions(devotion_date DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_date ON public.announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(event_date ASC);
CREATE INDEX IF NOT EXISTS idx_prayer_user ON public.prayer_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_testimonies_approved ON public.testimonies(is_approved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_user ON public.donations(user_id);
CREATE INDEX IF NOT EXISTS idx_jesus_daily_date ON public.jesus_daily(publish_date DESC);

-- =====================================================
-- DONNÉES DE DÉPART (seed)
-- =====================================================

-- Dévotion du jour (aujourd'hui)
INSERT INTO public.daily_devotions (
  devotion_date, title, verse_reference, verse_text,
  meditation_p1, meditation_p2, meditation_p3,
  reflection_question, prayer, declaration
) VALUES (
  CURRENT_DATE,
  'Marcher dans la foi',
  'Hébreux 11:1',
  'Or la foi est une ferme assurance des choses qu''on espère, une démonstration de celles qu''on ne voit pas.',
  'La foi est le fondement de notre relation avec Dieu. Elle n''est pas un sentiment passager, mais une conviction profonde, ancrée dans les promesses immuables de Dieu.',
  'Chaque jour, nous sommes appelés à exercer cette foi — dans nos décisions, nos prières, nos relations. La foi sans les œuvres est morte, mais la foi authentique produit des fruits visibles.',
  'Aujourd''hui, choisissez de marcher par la foi et non par la vue. Faites confiance à Celui qui tient votre avenir entre Ses mains.',
  'Dans quel domaine de votre vie avez-vous du mal à faire confiance à Dieu ? Comment pouvez-vous exercer votre foi aujourd''hui ?',
  'Seigneur, merci pour le don de la foi. Augmente ma foi dans les moments de doute. Aide-moi à voir au-delà des circonstances et à te faire confiance en toutes choses. En nom de Jésus, Amen.',
  'Je déclare que ma foi est ancrée en Dieu. Je marche par la foi et non par la vue. Dieu est fidèle à toutes ses promesses dans ma vie !'
) ON CONFLICT (devotion_date) DO NOTHING;

-- Premier événement (Bootcamp CCB 2026)
INSERT INTO public.events (title, subtitle, description, event_date, location, is_online, status)
VALUES (
  'Bootcamp Annuel CCB 2026',
  'SEMBLABLE À CHRIST',
  'Le rendez-vous spirituel de l''année pour tous les membres du Centre Chrétien Berakah. Venez être transformé à l''image de Christ.',
  '2026-05-10 09:00:00+00',
  'Yaoundé, Cameroun',
  false,
  'upcoming'
) ON CONFLICT DO NOTHING;

-- Annonce de bienvenue
INSERT INTO public.announcements (title, content, category, is_pinned)
VALUES (
  'Bienvenue sur la plateforme CCB ! 🙌',
  'Chers membres, la plateforme numérique du Centre Chrétien Berakah est maintenant en ligne ! Explorez vos dévotions quotidiennes, rejoignez notre communauté de prière et suivez nos cours de disciples.',
  'general',
  true
) ON CONFLICT DO NOTHING;

-- =====================================================
-- FIN DU SCHÉMA
-- =====================================================
