-- =====================================================================
-- CCB GROUPES PHASE 3 v20 — fichiers dans le chat
-- À exécuter dans Supabase SQL Editor (idempotent)
-- =====================================================================

-- Extend group_messages avec attachments
ALTER TABLE public.group_messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT
    CHECK (attachment_type IS NULL OR attachment_type IN ('image','pdf','audio','video','other')),
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size INT;

-- Allow content to be empty if attachment present
ALTER TABLE public.group_messages
  DROP CONSTRAINT IF EXISTS group_messages_content_check;
ALTER TABLE public.group_messages
  ADD CONSTRAINT group_messages_content_check
    CHECK (
      (content IS NOT NULL AND char_length(content) BETWEEN 0 AND 2000)
      OR attachment_url IS NOT NULL
    );

-- Index pour filtrer rapidement les messages avec fichiers
CREATE INDEX IF NOT EXISTS idx_group_messages_attach
  ON public.group_messages(group_id, created_at DESC)
  WHERE attachment_url IS NOT NULL;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN Phase 3 v20
-- =====================================================================
