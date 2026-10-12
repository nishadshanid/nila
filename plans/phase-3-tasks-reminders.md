# Phase 3: Todos, Plans, and Reminders

## Goal
Personal todos (private to the owner), couple todos and plans (both can edit), priority
low/med/high, and recurring reminders such as birthdays and "call parents".

## Schema: `0004_tasks_reminders.sql`
```sql
create type visibility as enum ('personal','couple');
create type task_kind as enum ('todo','plan');
create type task_status as enum ('open','done','cancelled');

create table tasks (
  id uuid primary key default gen_random_uuid(),
  kind task_kind not null default 'todo',
  title text not null,
  notes text,
  priority priority not null default 'med',
  visibility visibility not null default 'personal',
  owner_id uuid not null default auth.uid() references profiles,
  assignee_id uuid references profiles,       -- couple only; null = both
  start_at timestamptz,                        -- plans
  due_at timestamptz,
  all_day boolean not null default true,
  remind_before_min int,
  duration_min int,
  status task_status not null default 'open',
  completed_by uuid references profiles,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (visibility = 'couple' or assignee_id is null or assignee_id = owner_id)
);

create type reminder_type as enum ('birthday','anniversary','call','custom');
create type reminder_freq as enum ('once','daily','weekly','monthly','yearly');
create type notify_who as enum ('me','partner','both');

create table reminders (
  id uuid primary key default gen_random_uuid(),
  title text not null,                 -- "Amma's birthday", "Call parents"
  type reminder_type not null default 'custom',
  freq reminder_freq not null,
  start_date date not null,            -- birthday date / first occurrence
  by_weekday int[],                    -- weekly
  time time,                           -- e.g. 19:00
  lead_days int not null default 0,    -- birthday: also remind N days before
  visibility visibility not null default 'couple',
  owner_id uuid not null default auth.uid() references profiles,
  notify notify_who not null default 'both',
  active boolean not null default true,
  created_at timestamptz default now()
);
create table reminder_acks (           -- "done" for a given occurrence date
  reminder_id uuid references reminders on delete cascade,
  date date, user_id uuid references profiles,
  primary key (reminder_id, date, user_id)
);
```
**RLS (critical):**
```sql
using (visibility = 'couple' or owner_id = auth.uid())
with check (visibility = 'couple' or owner_id = auth.uid())
```
This applies to select, update, and delete on both tables. Insert checks
`owner_id = auth.uid()`. Only the owner may change `visibility` from couple to personal
(enforced in the server action).

## Logic
- Extend `recurrence.ts` with yearly (Feb 29 falls on Feb 28 in non-leap years) and
  `once`.
- `reminderOccurrences(reminder, from, to)` yields each date, plus lead-day "upcoming"
  entries for birthdays.

## UI
- `/tasks`: tabs **Mine (personal)** · **Couple** · **Plans**. Filters for priority,
  status, and due (today, this week, overdue). Quick-add bar: type a title, press Enter,
  and toggles set priority and visibility.
- Task form: kind, title, notes, priority, visibility, assignee (couple), due/start
  date-time or all-day, duration, remind-before.
- `/reminders`: list grouped by type. The form has a birthday preset (yearly, lead 1 day)
  and a "call parents" preset (weekly on Sun at 19:00).
- Dashboard additions: **My todos** (personal, due today or overdue), **Couple todos**,
  **Today's reminders** with an "Upcoming: Amma's birthday in 2 days" chip, and an ack
  button.

## Tests
- RLS script (`supabase/tests/rls.sql` or a Vitest test with two signed-in clients):
  user B can't select, update, or delete user A's personal task, and can edit a couple
  task.
- Yearly recurrence handles leap years, and weekly reminders give the right weekdays.

## Done when
- [ ] A personal todo is invisible from the partner's login, and a couple todo is
      editable by both.
- [ ] Priority filters work, and overdue items are highlighted.
- [ ] A birthday shows on the dashboard on the day and lead_days before. "Call parents"
      shows every Sunday.
