-- ─────────────────────────────────────────────────────────────────────────────
-- CCB — Notifications table
-- Run this in Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in (
                'like', 'comment', 'prayer_reply', 'intercession', 'new_post', 'system'
              )),
  title       text not null,
  body        text,
  link_url    text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Index for fast per-user unread queries
create index if not exists notif_user_read_idx
  on public.notifications (user_id, is_read, created_at desc);

-- Row-Level Security
alter table public.notifications enable row level security;

-- Users can only see their own notifications
create policy "Users see own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Users can mark their own as read
create policy "Users update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role inserts (from server actions / edge functions / triggers)
create policy "Service role insert notifications"
  on public.notifications for insert
  with check (true);

-- Realtime — enable publication
alter publication supabase_realtime add table public.notifications;

-- ─── Example: trigger to notify on new post_like ──────────────────────────
-- Uncomment and adapt if you want automatic like notifications:
--
-- create or replace function notify_on_like()
-- returns trigger language plpgsql security definer as $$
-- declare
--   _post_owner uuid;
--   _liker_name text;
-- begin
--   select user_id into _post_owner from posts where id = NEW.post_id;
--   if _post_owner is null or _post_owner = NEW.user_id then return NEW; end if;
--   select display_name into _liker_name from user_profiles where user_id = NEW.user_id;
--   insert into notifications (user_id, type, title, body, link_url)
--   values (
--     _post_owner,
--     'like',
--     (_liker_name || ' a aimé votre post'),
--     null,
--     '/community'
--   );
--   return NEW;
-- end;
-- $$;
--
-- create trigger on_post_liked
--   after insert on post_likes
--   for each row execute procedure notify_on_like();
