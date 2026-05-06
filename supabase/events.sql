-- ─────────────────────────────────────────────────────────────────────────────
-- CCB — Events + RSVP tables
-- Run this in Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  event_type   text not null default 'autre' check (event_type in (
                 'culte', 'bootcamp', 'etude', 'louange', 'priere', 'special', 'autre'
               )),
  date_start   timestamptz not null,
  date_end     timestamptz,
  location     text,
  is_online    boolean not null default false,
  link_url     text,
  image_url    text,
  is_published boolean not null default true,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists events_date_idx on public.events (date_start asc);

create table if not exists public.event_rsvp (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'going' check (status in ('going', 'maybe', 'not_going')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists rsvp_event_idx on public.event_rsvp (event_id);
create index if not exists rsvp_user_idx  on public.event_rsvp (user_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.events    enable row level security;
alter table public.event_rsvp enable row level security;

-- Anyone logged in can read published events
create policy "Read published events"
  on public.events for select
  using (is_published = true);

-- Admins can manage events (check user_roles table)
create policy "Admins manage events"
  on public.events for all
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Users manage their own RSVP
create policy "Users read rsvps"
  on public.event_rsvp for select using (true);

create policy "Users insert rsvp"
  on public.event_rsvp for insert
  with check (auth.uid() = user_id);

create policy "Users update own rsvp"
  on public.event_rsvp for update
  using (auth.uid() = user_id);

create policy "Users delete own rsvp"
  on public.event_rsvp for delete
  using (auth.uid() = user_id);

-- Realtime
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.event_rsvp;

-- ── Sample data ───────────────────────────────────────────────────────────────
insert into public.events (title, description, event_type, date_start, date_end, location, is_online)
values
  ('Culte du Dimanche', 'Rejoignez-nous pour le culte dominical de louange, adoration et prédication de la Parole.', 'culte', now() + interval '3 days', now() + interval '3 days' + interval '2 hours', 'Centre Chrétien Berakah — Salle principale', false),
  ('Bootcamp Annuel CCB 2026 — Semblable à Christ', 'Retraite spirituelle intensive de 3 jours pour grandir dans votre relation avec Dieu.', 'bootcamp', now() + interval '14 days', now() + interval '17 days', 'Camp de retraite CCB', false),
  ('Étude biblique — Épître aux Romains', 'Étude approfondie de l''Épître aux Romains, chapitre par chapitre.', 'etude', now() + interval '5 days', now() + interval '5 days' + interval '1.5 hours', 'Salle d''étude CCB', false),
  ('Nuit de Louange & Adoration', 'Une nuit entière de louange pour exalter le nom du Seigneur.', 'louange', now() + interval '10 days', now() + interval '11 days', 'Sanctuaire CCB', false),
  ('Réunion de Prière — Intercession nationale', 'Intercédons ensemble pour notre nation, nos familles et notre église.', 'priere', now() + interval '7 days', now() + interval '7 days' + interval '1 hours', 'En ligne + Salle de prière', true)
on conflict do nothing;
