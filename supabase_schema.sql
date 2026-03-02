-- Enable needed extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username citext unique not null,
  full_name text not null,
  avatar_url text,
  bio text default '',
  followers_count integer default 0,
  following_count integer default 0,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- Follow graph
create table if not exists public.follows (
  follower_id uuid references public.profiles on delete cascade,
  following_id uuid references public.profiles on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
alter table public.follows enable row level security;

create index if not exists follows_following_idx on public.follows (following_id);

-- Threads
create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);
alter table public.threads enable row level security;

-- Thread participants
create table if not exists public.thread_participants (
  thread_id uuid references public.threads on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  primary key (thread_id, user_id)
);
alter table public.thread_participants enable row level security;

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.threads on delete cascade,
  sender_id uuid references public.profiles on delete cascade,
  body text,
  media_url text,
  kind text default 'text' check (kind in ('text','image','voice')),
  status text default 'sent' check (status in ('sent','delivered','read')),
  created_at timestamptz default now()
);
alter table public.messages enable row level security;
create index if not exists messages_thread_idx on public.messages (thread_id, created_at desc);

-- Message receipts per participant
create table if not exists public.message_receipts (
  message_id uuid references public.messages on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  state text default 'delivered' check (state in ('delivered','read')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (message_id, user_id)
);
alter table public.message_receipts enable row level security;
create index if not exists receipts_message_idx on public.message_receipts (message_id);

-- Call invites for ringing + notifications
create table if not exists public.call_invites (
  id uuid primary key default gen_random_uuid(),
  room_name text not null,
  caller_id uuid references public.profiles on delete cascade,
  callee_id uuid references public.profiles on delete cascade,
  kind text default 'voice' check (kind in ('voice','video')),
  status text default 'ringing' check (status in ('ringing','accepted','declined','ended')),
  created_at timestamptz default now()
);
alter table public.call_invites enable row level security;
create index if not exists call_invites_callee_idx on public.call_invites (callee_id);

-- Ensure a single thread per user pair
create or replace function public.ensure_thread(a uuid, b uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  select tp1.thread_id into tid
  from public.thread_participants tp1
  join public.thread_participants tp2 on tp1.thread_id = tp2.thread_id
  where tp1.user_id = a and tp2.user_id = b
  limit 1;

  if tid is null then
    insert into public.threads default values returning id into tid;
    insert into public.thread_participants (thread_id, user_id) values (tid, a), (tid, b)
    on conflict do nothing;
  end if;
  return tid;
end;
$$;

-- Suggested users helper
create or replace function public.suggested_users(uid uuid)
returns setof public.profiles
language sql
stable
as $$
  select p.*
  from public.profiles p
  where p.id <> uid
    and not exists (
      select 1 from public.follows f
      where f.follower_id = uid and f.following_id = p.id
    )
  order by p.followers_count desc nulls last, p.created_at desc
  limit 20;
$$;

-- Message auto-delete trigger after delivery/read
create or replace function public.purge_message_after_delivery()
returns trigger
language plpgsql
as $$
begin
  -- Disabled hard-delete by status; receipts handle deletion.
  return new;
end;
$$;

drop trigger if exists purge_message_after_delivery on public.messages;
create trigger purge_message_after_delivery
after update of status on public.messages
for each row execute function public.purge_message_after_delivery();

-- Delete message when all participants have at least delivered
create or replace function public.auto_delete_when_all_delivered()
returns trigger
language plpgsql
as $$
declare
  participant_count integer;
  delivered_count integer;
begin
  select count(*) into participant_count
  from public.thread_participants tp
  join public.messages m on m.thread_id = tp.thread_id
  where m.id = new.message_id;

  select count(*) into delivered_count
  from public.message_receipts r
  where r.message_id = new.message_id and r.state in ('delivered','read');

  if delivered_count >= participant_count then
    delete from public.messages where id = new.message_id;
  end if;
  return null;
end;
$$;

drop trigger if exists delete_when_all_delivered on public.message_receipts;
create trigger delete_when_all_delivered
after insert or update of state on public.message_receipts
for each row execute function public.auto_delete_when_all_delivered();

-- RLS policies
-- profiles
create policy "Profiles are readable by authenticated users"
  on public.profiles for select using (auth.role() = 'authenticated');
create policy "Own profile can be updated"
  on public.profiles for update using (auth.uid() = id);
create policy "Insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- follows
create policy "Read follows for authenticated"
  on public.follows for select using (auth.role() = 'authenticated');
create policy "Insert follow if actor is follower"
  on public.follows for insert with check (auth.uid() = follower_id);
create policy "Delete follow if actor is follower"
  on public.follows for delete using (auth.uid() = follower_id);

-- threads
create policy "Threads readable by participants"
  on public.threads for select using (
    exists(select 1 from public.thread_participants tp where tp.thread_id = id and tp.user_id = auth.uid())
  );

-- thread_participants
create policy "Participants readable by members"
  on public.thread_participants for select using (
    exists(select 1 from public.thread_participants tp where tp.thread_id = thread_id and tp.user_id = auth.uid())
  );
create policy "Insert participants only by themselves"
  on public.thread_participants for insert with check (auth.uid() = user_id);

-- messages
create policy "Messages readable by participants"
  on public.messages for select using (
    exists(select 1 from public.thread_participants tp where tp.thread_id = thread_id and tp.user_id = auth.uid())
  );
create policy "Insert messages by participants"
  on public.messages for insert with check (
    auth.uid() = sender_id and exists(select 1 from public.thread_participants tp where tp.thread_id = thread_id and tp.user_id = auth.uid())
  );
create policy "Update message status by participant"
  on public.messages for update using (
    exists(select 1 from public.thread_participants tp where tp.thread_id = thread_id and tp.user_id = auth.uid())
  );

-- call_invites RLS
create policy "Read own call invites"
  on public.call_invites for select using (auth.uid() in (caller_id, callee_id));
create policy "Insert call invite if caller"
  on public.call_invites for insert with check (auth.uid() = caller_id);
create policy "Update call invite if participant"
  on public.call_invites for update using (auth.uid() in (caller_id, callee_id));

-- message_receipts RLS
create policy "Read receipts as participant"
  on public.message_receipts for select using (
    exists(
      select 1 from public.messages m
      join public.thread_participants tp on tp.thread_id = m.thread_id
      where m.id = message_id and tp.user_id = auth.uid()
    )
  );
create policy "Insert receipt if participant"
  on public.message_receipts for insert with check (
    exists(
      select 1 from public.messages m
      join public.thread_participants tp on tp.thread_id = m.thread_id
      where m.id = message_id and tp.user_id = auth.uid() and user_id = auth.uid()
    )
  );
create policy "Update own receipt"
  on public.message_receipts for update using (auth.uid() = user_id);
