-- ============================================================
-- WHIM — Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================


-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";


-- ─── Profiles ────────────────────────────────────────────────────────────────
-- Extends auth.users. One row per registered user.
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null,
  username     text,
  city         text not null default 'New York',
  home_address text,
  instagram    text,
  beli         text,
  bio          text,
  photo        text,        -- public URL in Supabase Storage
  photos       text[] default '{}',
  push_token   text,
  created_at   timestamptz not null default now()
);

alter table profiles enable row level security;

-- Anyone authenticated can read any profile
create policy "profiles: read all" on profiles
  for select using (auth.role() = 'authenticated');

-- Users can only insert/update their own row
create policy "profiles: insert own" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles: update own" on profiles
  for update using (auth.uid() = id);


-- ─── Public Plans ─────────────────────────────────────────────────────────────
create table if not exists public_plans (
  id               text primary key default 'pp_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 6),
  creator_id       uuid not null references profiles(id) on delete cascade,
  creator_name     text not null,
  creator_instagram text,
  creator_photo    text,
  plan_type        text not null,   -- 'exclusive_date' | 'group_hangout' | 'open'
  visibility       text not null default 'public',
  activity_type    text not null,
  cuisine          text,
  bar_type         text,
  plan_name        text not null,
  description      text,
  neighborhood     text not null,
  date             text not null,
  time_start       text not null,
  vibes            text[] default '{}',
  group_size       int not null default 2,
  attendee_count   int not null default 1,
  max_attendees    int,
  created_at       timestamptz not null default now()
);

alter table public_plans enable row level security;

-- Everyone authenticated can read public plans
create policy "plans: read all" on public_plans
  for select using (auth.role() = 'authenticated');

-- Only creator can insert
create policy "plans: insert own" on public_plans
  for insert with check (auth.uid() = creator_id);

-- Only creator can update their plan
create policy "plans: update own" on public_plans
  for update using (auth.uid() = creator_id);

-- Only creator can delete their plan
create policy "plans: delete own" on public_plans
  for delete using (auth.uid() = creator_id);


-- ─── Interests ────────────────────────────────────────────────────────────────
-- Who has expressed interest (or joined) a plan
create table if not exists interests (
  id           uuid primary key default gen_random_uuid(),
  plan_id      text not null references public_plans(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  name         text not null,
  instagram    text,
  status       text not null default 'pending',  -- 'pending' | 'accepted' | 'declined'
  requested_at timestamptz not null default now(),
  matched_at   timestamptz,
  unique(plan_id, user_id)
);

alter table interests enable row level security;

-- Plan creator can see all interests on their plans
create policy "interests: creator can read" on interests
  for select using (
    auth.uid() = user_id
    or auth.uid() = (select creator_id from public_plans where id = plan_id)
  );

-- Users can insert their own interest
create policy "interests: insert own" on interests
  for insert with check (auth.uid() = user_id);

-- Plan creator can update status (accept/decline); user can delete own (withdraw)
create policy "interests: creator can update" on interests
  for update using (
    auth.uid() = (select creator_id from public_plans where id = plan_id)
    or auth.uid() = user_id
  );

create policy "interests: delete own" on interests
  for delete using (auth.uid() = user_id);


-- ─── Messages ────────────────────────────────────────────────────────────────
-- Chat between a plan creator and an interested user (after match)
create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  plan_id     text not null references public_plans(id) on delete cascade,
  sender_id   uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  sender_name text not null default '',
  text        text not null,
  timestamp   timestamptz not null default now()
);

alter table messages enable row level security;

-- Only sender or receiver can read
create policy "messages: read own" on messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Only sender can insert
create policy "messages: insert own" on messages
  for insert with check (auth.uid() = sender_id);


-- ─── Storage Bucket ───────────────────────────────────────────────────────────
-- Run this AFTER creating the bucket named "profile-photos" (set to Public)
-- in Supabase Dashboard → Storage → New Bucket
--
-- Then add these policies in Dashboard → Storage → profile-photos → Policies:
--
--   SELECT: (bucket_id = 'profile-photos')                   → for role authenticated
--   INSERT: (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1])
--   UPDATE: same as INSERT
--   DELETE: same as INSERT
--
-- Or run the SQL below (uncomment if using SQL editor):

-- insert into storage.buckets (id, name, public) values ('profile-photos', 'profile-photos', true)
--   on conflict do nothing;

-- create policy "storage: anyone reads" on storage.objects
--   for select using (bucket_id = 'profile-photos');

-- create policy "storage: user uploads own" on storage.objects
--   for insert with check (
--     bucket_id = 'profile-photos'
--     and auth.uid()::text = (storage.foldername(name))[1]
--   );

-- create policy "storage: user updates own" on storage.objects
--   for update using (
--     bucket_id = 'profile-photos'
--     and auth.uid()::text = (storage.foldername(name))[1]
--   );

-- create policy "storage: user deletes own" on storage.objects
--   for delete using (
--     bucket_id = 'profile-photos'
--     and auth.uid()::text = (storage.foldername(name))[1]
--   );


-- ─── Availability visibility ──────────────────────────────────────────────────
-- Appended after initial schema run. Safe to run at any time.
alter table profiles
  add column if not exists availability_visibility text not null default 'private';


-- ─── Attendee count trigger ───────────────────────────────────────────────────
-- Keeps public_plans.attendee_count in sync automatically.
-- Count = 1 (creator) + accepted interests.
create or replace function sync_attendee_count()
returns trigger as $$
declare
  target_plan_id text;
begin
  target_plan_id := coalesce(new.plan_id, old.plan_id);
  update public_plans
  set attendee_count = 1 + (
    select count(*) from interests
    where plan_id = target_plan_id and status = 'accepted'
  )
  where id = target_plan_id;
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_attendee_count on interests;
create trigger trg_sync_attendee_count
  after insert or update or delete on interests
  for each row execute function sync_attendee_count();


-- ─── Realtime ─────────────────────────────────────────────────────────────────
-- Enable realtime on the tables the app listens to
alter publication supabase_realtime add table public_plans;
alter publication supabase_realtime add table interests;
alter publication supabase_realtime add table messages;
