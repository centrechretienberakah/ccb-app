-- ════════════════════════════════════════════════════════════════════════════
-- v65 — Multi-réactions du feed communautaire (🙏 Amen, 🔥 Encouragé)
-- Le ❤️ « J'aime » reste géré par post_likes (inchangé). Cette table ajoute des
-- réactions INDÉPENDANTES : un membre peut donner Amen ET Encouragé (compteurs
-- distincts, comme demandé). RLS stricte. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.post_reactions (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  reaction   text not null check (reaction in ('amen', 'fire')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, reaction)
);

create index if not exists post_reactions_post_idx on public.post_reactions (post_id);

alter table public.post_reactions enable row level security;

-- Lecture : tout membre authentifié (pour compter les réactions).
drop policy if exists post_reactions_read on public.post_reactions;
create policy post_reactions_read on public.post_reactions
  for select using (auth.uid() is not null);

-- Écriture : chacun gère ses propres réactions.
drop policy if exists post_reactions_write on public.post_reactions;
create policy post_reactions_write on public.post_reactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime (cohérent avec posts/likes/comments).
do $$ begin
  alter publication supabase_realtime add table public.post_reactions;
exception when others then null; end $$;
