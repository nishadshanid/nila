-- Phase 0: profiles for the two household members.

-- Sign-ups are disabled, so every authenticated user is one of the two partners.
-- All later RLS policies go through this function, so it's the one place to tighten.
create or replace function public.is_member()
returns boolean
language sql
stable
as $$
  select auth.role() = 'authenticated'
$$;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  email text not null,
  color text not null default '#6366f1' check (color ~ '^#[0-9a-fA-F]{6}$'),
  email_notifications boolean not null default true,
  digest_time time not null default '07:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "members can read profiles"
  on public.profiles for select to authenticated
  using (public.is_member());

create policy "users update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Shared updated_at trigger, reused by later tables.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically when a user is added in the Supabase dashboard.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill users created before this migration ran.
insert into public.profiles (id, name, email)
select id, coalesce(raw_user_meta_data ->> 'name', split_part(email, '@', 1)), email
from auth.users
on conflict (id) do nothing;
