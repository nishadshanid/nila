# Phase 1: Chores and Rotation

## Goal
Configure household chores (laundry, cooking, waste, bed cleaning, …) as **fixed**,
**rotating**, or **together**. The Today dashboard shows who does what, with a Done button.

## Schema: `0002_chores.sql`
```sql
create type priority as enum ('low','med','high');
create type assignment_type as enum ('fixed','rotating','together');
create type rotation_unit as enum ('per_week','per_occurrence');
create type recur_freq as enum ('daily','weekly','monthly');
create type occ_status as enum ('pending','done','skipped');

create table chores (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'other',      -- laundry/cooking/waste/cleaning/other
  notes text,
  priority priority not null default 'med',
  assignment_type assignment_type not null,
  fixed_assignee uuid references profiles,
  rotation_order uuid[],                        -- e.g. {me, her}
  rotation_unit rotation_unit default 'per_week',
  rotation_anchor_date date,                    -- Monday the rotation starts
  freq recur_freq not null,
  by_weekday int[],                             -- 1=Mon … 7=Sun (weekly)
  by_monthday int,                              -- 1–31; clamp to month end
  due_time time,
  duration_min int,
  remind_before_min int,
  active boolean not null default true,
  created_by uuid not null references profiles default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table chore_occurrences (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references chores on delete cascade,
  date date not null,
  assignee_id uuid references profiles,          -- null = together
  original_assignee_id uuid references profiles,
  status occ_status not null default 'pending',
  completed_by uuid references profiles,
  completed_at timestamptz,
  reassign_reason text,                          -- filled in Phase 2
  unique (chore_id, date)
);
```
RLS: both members have full access to both tables. Add checks: `fixed` requires
`fixed_assignee`, and `rotating` requires `rotation_order` with at least 2 entries and an
anchor date.

## Logic (pure TypeScript, unit-tested)
- `src/lib/recurrence.ts`: `datesInRange(rule, from, to): string[]` for daily, weekly
  (by_weekday), and monthly (by_monthday, clamped to the last day of the month).
- `src/lib/rotation.ts`: `assigneeFor(chore, date, occurrenceIndex)`
  - `per_week`: `order[floor(daysBetween(anchorMonday, mondayOf(date))/7) mod n]`.
    Handle negative values with `((x % n) + n) % n`.
  - `per_occurrence`: `order[occurrenceIndex mod n]`, where the index counts scheduled
    dates from the anchor.
  - `fixed` returns fixed_assignee, and `together` returns null.
- `src/lib/occurrences.ts`: `materialize(supabase, {days: 14})` upserts the next 14 days
  for active chores with `on conflict do nothing`. On chore edit it deletes **future
  pending** rows of that chore and regenerates them. It never touches done or past rows.

## UI
- `/chores`: list grouped by category, showing the type badge, schedule summary
  ("Every Mon · rotates weekly"), and current assignee.
- Chore form (dialog/sheet): title, category, priority, type, then type-specific fields
  (assignee, or rotation order with drag/arrange and a start week), frequency and days,
  time, duration, and reminder-before. Includes a live **"Next 4 weeks" preview** table
  computed client-side with `rotation.ts`.
- `/` Today: sections **My chores**, **Together**, **Partner's chores**. A `ChoreCard`
  shows the title, time, priority color, and a Done checkbox (toggles
  status/completed_by/at). Add a date switcher for yesterday and tomorrow.
- Server actions: `createChore`, `updateChore`, `toggleChoreActive`, `deleteChore`,
  `completeOccurrence`, `undoOccurrence`. Each create or update calls `materialize`.
- The dashboard calls `materialize` lazily on load if today's rows are missing. Phase 7
  moves this to cron.

## Tests (`src/lib/*.test.ts`)
- Weekly rotation alternates A, B, A, B over 4 weeks, including across a month and year
  boundary.
- A Sunday date belongs to the week that starts on the previous Monday.
- The IST midnight edge: 23:30 UTC equals the next day in IST.
- Monthly on the 31st falls on Feb 28/29.
- Per-occurrence rotation with Mon/Thu chores goes A(Mon), B(Thu), A(Mon), …

## Done when
- [ ] Laundry every Monday, rotating weekly, previews me, her, me, her and shows on the
      dashboard for the right person.
- [ ] Fixed "bed cleaning" always shows for the assigned person.
- [ ] Marking Done persists and is visible on the partner's phone after a refresh.
