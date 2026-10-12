-- Phase 2: leaves (away / sick) and handing chores over to your partner.

create type public.leave_type as enum ('away', 'sick', 'other');

create table public.leaves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  start_date date not null,
  end_date date not null,
  type public.leave_type not null default 'away',
  note text check (length(note) <= 300),
  created_by uuid not null default auth.uid() references public.profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_dates_ordered check (end_date >= start_date)
);

create index leaves_user_dates_idx on public.leaves (user_id, start_date, end_date);

create trigger leaves_updated_at
  before update on public.leaves
  for each row execute function public.set_updated_at();

alter table public.leaves enable row level security;

-- Either of you can add leave for either of you (e.g. when one is too sick to do it).
create policy "members manage leaves"
  on public.leaves for all to authenticated
  using (public.is_member())
  with check (public.is_member());

-- Why an occurrence moved away from the person it was planned for.
--   leave / sick: moved (or paused) automatically because of a leave
--   split:        handed over by hand ("can't do it")
alter table public.chore_occurrences
  add column reassign_note text check (length(reassign_note) <= 300),
  add column reassigned_by uuid references public.profiles on delete set null,
  add column reassigned_at timestamptz,
  add constraint reassign_reason_valid
    check (reassign_reason is null or reassign_reason in ('leave', 'sick', 'split'));
