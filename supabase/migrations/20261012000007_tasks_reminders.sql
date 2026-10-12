-- Phase 3: todos & plans (personal or couple) and recurring reminders.

create type public.visibility as enum ('personal', 'couple');
create type public.task_kind as enum ('todo', 'plan');
create type public.task_status as enum ('open', 'done');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  kind public.task_kind not null default 'todo',
  title text not null check (length(trim(title)) between 1 and 120),
  notes text check (length(notes) <= 2000),
  priority public.priority not null default 'med',
  visibility public.visibility not null default 'personal',
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  -- Couple tasks only: who does it. Null = both of you.
  assignee_id uuid references public.profiles on delete set null,
  date date,      -- todo: due date (optional); plan: the day it starts
  time time,
  end_date date,  -- plans spanning several days
  duration_min int check (duration_min > 0),
  remind_before_min int check (remind_before_min >= 0),
  status public.task_status not null default 'open',
  completed_by uuid references public.profiles on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint personal_has_no_assignee check (visibility = 'couple' or assignee_id is null),
  constraint plan_needs_date check (kind = 'todo' or date is not null),
  constraint time_needs_date check (time is null or date is not null),
  constraint end_after_start check (end_date is null or (date is not null and end_date >= date))
);

create index tasks_date_idx on public.tasks (date);
create index tasks_owner_idx on public.tasks (owner_id);

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

-- Personal tasks are visible only to their owner; couple tasks to both of you.
-- Only the owner can make a couple task personal again (the WITH CHECK fails otherwise).
create policy "read own or couple tasks"
  on public.tasks for select to authenticated
  using (public.is_member() and (visibility = 'couple' or owner_id = auth.uid()));

create policy "create own tasks"
  on public.tasks for insert to authenticated
  with check (public.is_member() and owner_id = auth.uid());

create policy "change own or couple tasks"
  on public.tasks for update to authenticated
  using (public.is_member() and (visibility = 'couple' or owner_id = auth.uid()))
  with check (visibility = 'couple' or owner_id = auth.uid());

create policy "delete own or couple tasks"
  on public.tasks for delete to authenticated
  using (public.is_member() and (visibility = 'couple' or owner_id = auth.uid()));

-- Reminders ------------------------------------------------------------------------

create type public.reminder_type as enum ('birthday', 'anniversary', 'call', 'custom');
create type public.reminder_freq as enum ('once', 'daily', 'weekly', 'monthly', 'yearly');

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 120),
  type public.reminder_type not null default 'custom',
  freq public.reminder_freq not null,
  -- The date it first happens (for birthdays, the birthday itself).
  start_date date not null,
  interval_days int not null default 1 check (interval_days between 1 and 365),
  by_weekday int[],
  by_monthday int check (by_monthday = -1 or by_monthday between 1 and 31),
  time time,
  -- Also show it this many days before (e.g. to buy a gift).
  lead_days int not null default 0 check (lead_days between 0 and 30),
  notes text check (length(notes) <= 1000),
  visibility public.visibility not null default 'couple',
  owner_id uuid not null default auth.uid() references public.profiles on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reminder_weekly_needs_days
    check (freq <> 'weekly' or cardinality(by_weekday) >= 1),
  constraint reminder_weekdays_valid
    check (by_weekday is null or by_weekday <@ array[1, 2, 3, 4, 5, 6, 7]),
  constraint reminder_monthly_needs_day
    check (freq <> 'monthly' or by_monthday is not null)
);

create trigger reminders_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

alter table public.reminders enable row level security;

create policy "read own or couple reminders"
  on public.reminders for select to authenticated
  using (public.is_member() and (visibility = 'couple' or owner_id = auth.uid()));

create policy "create own reminders"
  on public.reminders for insert to authenticated
  with check (public.is_member() and owner_id = auth.uid());

create policy "change own or couple reminders"
  on public.reminders for update to authenticated
  using (public.is_member() and (visibility = 'couple' or owner_id = auth.uid()))
  with check (visibility = 'couple' or owner_id = auth.uid());

create policy "delete own or couple reminders"
  on public.reminders for delete to authenticated
  using (public.is_member() and (visibility = 'couple' or owner_id = auth.uid()));

-- "Done" for one day of a reminder (e.g. called parents today).
create table public.reminder_acks (
  reminder_id uuid not null references public.reminders on delete cascade,
  date date not null,
  acked_by uuid not null default auth.uid() references public.profiles on delete cascade,
  acked_at timestamptz not null default now(),
  primary key (reminder_id, date)
);

alter table public.reminder_acks enable row level security;

-- You can see and set acks for any reminder you can see (RLS on reminders applies here).
create policy "manage acks of visible reminders"
  on public.reminder_acks for all to authenticated
  using (exists (select 1 from public.reminders r where r.id = reminder_id))
  with check (exists (select 1 from public.reminders r where r.id = reminder_id));
