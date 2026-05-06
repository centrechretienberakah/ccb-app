-- ================================================
-- TABLE DEVOTIONS CCB
-- ================================================
CREATE TABLE IF NOT EXISTS devotions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date          DATE NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  verse_ref     TEXT NOT NULL,
  verse_text    TEXT NOT NULL,
  content       TEXT NOT NULL,
  application   TEXT,
  prayer        TEXT NOT NULL,
  declaration   TEXT,
  author        TEXT DEFAULT 'Pasteur Elvis',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE devotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Devotions lisibles par tous les connectes"
  ON devotions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins peuvent gerer les devotions"
  ON devotions FOR ALL TO authenticated
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'centrechretienberakah@gmail.com');

-- ================================================
-- TABLE PROGRESSION DEVOTIONS
-- ================================================
CREATE TABLE IF NOT EXISTS devotion_progress (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  devotion_id  UUID REFERENCES devotions(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, devotion_id)
);

ALTER TABLE devotion_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users voient leur propre progression"
  ON devotion_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
