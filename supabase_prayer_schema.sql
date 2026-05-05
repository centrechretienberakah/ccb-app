-- ═══════════════════════════════════════════════════════════════
-- SCHEMA INTERCESSION — Centre Chrétien Berakah
-- ═══════════════════════════════════════════════════════════════

-- Table des requêtes de prière
CREATE TABLE IF NOT EXISTS public.prayer_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     text NOT NULL CHECK (char_length(content) >= 10 AND char_length(content) <= 1000),
  is_anonymous boolean NOT NULL DEFAULT false,
  is_answered  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Table des intercessions (équivalent likes pour les prières)
CREATE TABLE IF NOT EXISTS public.prayer_intercessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id  uuid NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prayer_id, user_id)  -- un seul "Je prie pour toi" par membre par prière
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_prayer_requests_user_id ON public.prayer_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_created_at ON public.prayer_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prayer_intercessions_prayer_id ON public.prayer_intercessions(prayer_id);
CREATE INDEX IF NOT EXISTS idx_prayer_intercessions_user_id ON public.prayer_intercessions(user_id);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_intercessions ENABLE ROW LEVEL SECURITY;

-- Tout membre connecté peut lire toutes les requêtes
CREATE POLICY "members_read_prayers" ON public.prayer_requests
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Tout membre connecté peut soumettre une requête
CREATE POLICY "members_insert_prayers" ON public.prayer_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- L'auteur ou un admin peut marquer comme exaucée / supprimer
CREATE POLICY "author_update_prayer" ON public.prayer_requests
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "author_delete_prayer" ON public.prayer_requests
  FOR DELETE USING (auth.uid() = user_id);

-- Intercessions : lecture ouverte aux membres
CREATE POLICY "members_read_intercessions" ON public.prayer_intercessions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Un membre peut ajouter/retirer sa propre intercession
CREATE POLICY "members_insert_intercession" ON public.prayer_intercessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "members_delete_intercession" ON public.prayer_intercessions
  FOR DELETE USING (auth.uid() = user_id);

-- ── Realtime ───────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_intercessions;
