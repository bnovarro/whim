-- ─── Whim: profiles table ────────────────────────────────────────────────────
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run

-- Enable UUID extension (usually already on)
create extension if not exists "uuid-ossp";

-- ── Table ────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                      uuid        primary key references auth.users(id) on delete cascade,
  name                    text        not null,
  username                text        not null,
  city                    text        not null default 'New York',
  home_address            text,
  instagram               text,
  beli                    text,
  bio                     text,
  photo                   text,                       -- public URL of profile photo
  photos                  text[]      default '{}',   -- gallery: up to 6 URLs
  push_token              text,
  availability_visibility text        not null default 'private'
                          check (availability_visibility in ('public', 'friends', 'private')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Keep updated_at current automatically
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_profiles_updated on public.profiles;
create trigger on_profiles_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Anyone authenticated can read any profile (needed for plan feeds, friend lookup)
create policy "Profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can only insert their own profile
create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Users can only update their own profile
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── Auto-create profile on first Google sign-in ───────────────────────────────
-- This function fires when a new auth.users row is created (e.g., first Google login)
-- It creates a matching profiles row so fetchProfile() always finds something.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, username, photo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    split_part(new.email, '@', 1),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
