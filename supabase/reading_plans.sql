-- ============================================================
-- Table : user_bible_plans
-- Plans de lecture biblique des utilisateurs
-- ============================================================

create table if not exists public.user_bible_plans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  plan_id       text not null,                    -- ex: "year-chronological"
  completed_days int[] not null default '{}',     -- ex: {1, 2, 3}
  is_active     boolean not null default true,
  started_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Index pour les requetes courantes
create index if not exists idx_user_bible_plans_user_id
  on public.user_bible_plans(user_id);

create index if not exists idx_user_bible_plans_active
  on public.user_bible_plans(user_id, is_active);

-- Mise a jour automatique de updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_bible_plans_updated_at on public.user_bible_plans;
create trigger user_bible_plans_updated_at
  before update on public.user_bible_plans
  for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.user_bible_plans enable row level security;

-- Politique : chaque utilisateur ne voit que ses propres plans
create policy "Users can view their own plans"
  on public.user_bible_plans for select
  using (auth.uid() = user_id);

create policy "Users can insert their own plans"
  on public.user_bible_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own plans"
  on public.user_bible_plans for update
  using (auth.uid() = user_id);

create policy "Users can delete their own plans"
  on public.user_bible_plans for delete
  using (auth.uid() = user_id);
