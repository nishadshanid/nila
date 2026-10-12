-- Phase 1: chores (fixed, rotating, together) and their dated occurrences.

create type public.priority as enum ('low', 'med', 'high');
create type public.assignment_type as enum ('fixed', 'rotating', 'together');
create type public.rotation_unit as enum ('per_week', 'per_occurrence');
create type public.recur_freq as enum ('daily', 'weekly', 'monthly');
create type public.occ_status as enum ('pending', 'done', 'skipped');

create table public.chores (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 80),
  category text not null default 'other',
  notes text,
  priority public.priority not null default 'med',
  assignment_type public.assignment_type not null,
  fixed_assignee uuid references public.profiles on delete set null,
  -- Who takes turns, in order. The first person has the first turn.
  rotation_order uuid[],
  rotation_unit public.rotation_unit not null default 'per_week',
  -- First day the chore applies. Also the rotation anchor (its Monday for per_week).
  start_date date not null default current_date,
  freq public.recur_freq not null,
  by_weekday int[],  -- weekly: ISO weekdays, 1 = Monday … 7 = Sunday
  by_monthday int check (by_monthday between 1 and 31),  -- monthly; clamped to month end
  due_time time,
  duration_min int check (duration_min > 0),
  remind_before_min int check (remind_before_min >= 0),
  active boolean not null default true,
  created_by uuid not null default auth.uid() references public.profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint fixed_needs_assignee
    check (assignment_type <> 'fixed' or fixed_assignee is not null),
  constraint rotating_needs_order
    check (assignment_type <> 'rotating' or cardinality(rotation_order) >= 2),
  constraint weekly_needs_days
    check (freq <> 'weekly' or cardinality(by_weekday) >= 1),
  constraint weekdays_valid
    check (by_weekday is null or by_weekday <@ array[1, 2, 3, 4, 5, 6, 7]),
  constraint monthly_needs_day
    check (freq <> 'monthly' or by_monthday is not null)
);

create trigger chores_updated_at
  before update on public.chores
  for each row execute function public.set_updated_at();

create table public.chore_occurrences (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references public.chores on delete cascade,
  date date not null,
  assignee_id uuid references public.profiles on delete set null,  -- null = together
  original_assignee_id uuid references public.profiles on delete set null,
  status public.occ_status not null default 'pending',
  completed_by uuid references public.profiles on delete set null,
  completed_at timestamptz,
  reassign_reason text,  -- used from phase 2
  created_at timestamptz not null default now(),
  unique (chore_id, date)
);

create index chore_occurrences_date_idx on public.chore_occurrences (date);

alter table public.chores enable row level security;
alter table public.chore_occurrences enable row level security;

-- Chores are shared: both partners can see and change everything.
create policy "members manage chores"
  on public.chores for all to authenticated
  using (public.is_member())
  with check (public.is_member());

create policy "members manage chore occurrences"
  on public.chore_occurrences for all to authenticated
  using (public.is_member())
  with check (public.is_member());
