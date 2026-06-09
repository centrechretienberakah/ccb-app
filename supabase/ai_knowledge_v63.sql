-- ════════════════════════════════════════════════════════════════════════════
-- v63 — Base documentaire indexée pour BERAKAH AI (RAG CCB)
-- Agrège les contenus publics CCB (Méditons, Prions, JESUS DAILY, Institut,
-- Bibliothèque, Témoignages, Événements) avec un index plein-texte FRANÇAIS.
-- 100 % gratuit (pas d'embeddings). Peuplée par l'indexeur Node (service role) ;
-- lecture par tout membre authentifié. Idempotent — réexécutable sans risque.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.ai_knowledge (
  id         uuid primary key default gen_random_uuid(),
  source     text not null,             -- 'devotion' | 'prayer' | 'jdtv' | 'lesson' | 'media' | 'testimony' | 'event'
  source_id  text not null,             -- id d'origine (anti-doublon)
  title      text not null,
  body       text not null default '',
  url        text,                       -- lien interne dans l'app
  lang       text not null default 'fr',
  updated_at timestamptz not null default now(),
  fts        tsvector generated always as
               (to_tsvector('french', coalesce(title,'') || ' ' || coalesce(body,''))) stored,
  unique (source, source_id)
);

create index if not exists ai_knowledge_fts_idx on public.ai_knowledge using gin (fts);
create index if not exists ai_knowledge_source_idx on public.ai_knowledge (source);

alter table public.ai_knowledge enable row level security;

-- Lecture : tout membre authentifié (contenu public CCB).
drop policy if exists ai_knowledge_read on public.ai_knowledge;
create policy ai_knowledge_read on public.ai_knowledge
  for select using (auth.uid() is not null);

-- Écriture : uniquement via service role (indexeur) — pas de policy d'écriture.
