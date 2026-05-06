-- ─────────────────────────────────────────────────────────────────────────────
-- CCB — Events migration (adapts existing table + adds event_rsvp)
-- Run this in Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add missing columns to existing events table
alter table public.events
  add column if not exists event_type text not null default 'autre'
    check (event_type in ('culte','bootcamp','etude','louange','priere','special','autre')),
  add column if not exists is_published boolean not null default true,
  add column if not exists link_url text;

-- 2. Backfill event_type from status if needed
update public.events set event_type = 'culte'   where event_type = 'autre' and title ilike '%culte%';
update public.events set event_type = 'priere'  where event_type = 'autre' and title ilike '%pri%re%';
update public.events set event_type = 'louange' where event_type = 'autre' and title ilike '%louange%';

-- 3. Backfill is_published from status
update public.events set is_published = (status != 'draft') where is_published = true;

-- 4. Create event_rsvp table
create table if not exists public.event_rsvp (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'going'
    check (status in ('going', 'maybe', 'not_going')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists rsvp_event_idx on public.event_rsvp (event_id);
create index if not exists rsvp_user_idx  on public.event_rsvp (user_id);

-- 5. RLS on event_rsvp
alter table public.event_rsvp enable row level security;

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

-- 6. Realtime
alter publication supabase_realtime add table public.event_rsvp;

-- 7. Sample events (uses existing column names: event_date, end_date)
insert into public.events (title, description, event_type, event_date, end_date, location, is_online, is_published, status)
values
  ('Culte du Dimanche', 'Rejoignez-nous pour le culte dominical de louange, adoration et prédication de la Parole.', 'culte', now() + interval '3 days', now() + interval '3 days' + interval '2 hours', 'Centre Chrétien Berakah — Salle principale', false, true, 'upcoming'),
  ('Bootcamp Annuel CCB 2026 — Semblable à Christ', 'Retraite spirituelle intensive de 3 jours pour grandir dans votre relation avec Dieu.', 'bootcamp', now() + interval '14 days', now() + interval '17 days', 'Camp de retraite CCB', false, true, 'upcoming'),
  ('Étude biblique — Épître aux Romains', 'Étude approfondie de l''Épître aux Romains, chapitre par chapitre.', 'etude', now() + interval '5 days', now() + interval '5 days' + interval '90 minutes', 'Salle d''étude CCB', false, true, 'upcoming'),
  ('Nuit de Louange & Adoration', 'Une nuit entière de louange pour exalter le nom du Seigneur.', 'louange', now() + interval '10 days', now() + interval '11 days', 'Sanctuaire CCB', false, true, 'upcoming'),
  ('Réunion de Prière — Intercession nationale', 'Intercédons ensemble pour notre nation, nos familles et notre église.', 'priere', now() + interval '7 days', now() + interval '7 days' + interval '1 hour', 'En ligne + Salle de prière', true, true, 'upcoming')
on conflict do nothing;
