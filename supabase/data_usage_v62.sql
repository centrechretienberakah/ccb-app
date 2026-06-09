-- ════════════════════════════════════════════════════════════════════════════
-- v62 — Collecte de l'usage data (Tableau de bord data, côté admin)
-- Mesure agrégée des octets réseau / économisés par le cache, par membre et par
-- jour. Écriture via RPC SECURITY DEFINER (pas d'accès direct en écriture).
-- Lecture : le membre voit ses propres lignes ; l'admin lit tout via service role.
-- Idempotent — réexécutable sans risque.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.data_usage (
  user_id       uuid    not null references auth.users(id) on delete cascade,
  day           date    not null default current_date,
  network_bytes bigint  not null default 0,   -- octets réellement passés par le réseau
  cached_bytes  bigint  not null default 0,   -- octets servis depuis le cache (économisés)
  data_saver    boolean,                       -- mode éco actif au moment de la mesure
  updated_at    timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists data_usage_day_idx on public.data_usage (day);

alter table public.data_usage enable row level security;

-- Le membre peut consulter ses propres lignes.
drop policy if exists data_usage_select_own on public.data_usage;
create policy data_usage_select_own on public.data_usage
  for select using (auth.uid() = user_id);

-- (Aucune policy d'écriture directe : tout passe par la RPC ci-dessous.)

-- ── RPC d'enregistrement : ajoute des DELTAS à la ligne du jour ───────────────
create or replace function public.record_data_usage(
  p_network    bigint,
  p_cached     bigint,
  p_data_saver boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  if coalesce(p_network, 0) <= 0 and coalesce(p_cached, 0) <= 0 then return; end if;

  insert into public.data_usage (user_id, day, network_bytes, cached_bytes, data_saver, updated_at)
  values (
    auth.uid(),
    current_date,
    greatest(coalesce(p_network, 0), 0),
    greatest(coalesce(p_cached, 0), 0),
    p_data_saver,
    now()
  )
  on conflict (user_id, day) do update set
    network_bytes = public.data_usage.network_bytes + greatest(coalesce(p_network, 0), 0),
    cached_bytes  = public.data_usage.cached_bytes  + greatest(coalesce(p_cached, 0), 0),
    data_saver    = coalesce(p_data_saver, public.data_usage.data_saver),
    updated_at    = now();
end;
$$;

grant execute on function public.record_data_usage(bigint, bigint, boolean) to authenticated;
