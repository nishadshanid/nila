# Phase 5: Point System

## Goal
Completing chores and couple tasks earns points based on priority (overridable per item).
Scores total per month, with a scoreboard, history, and an optional monthly reward.

## Rules
- Earn points from: **chore occurrences** and **couple tasks/plans**. Personal todos earn
  none, because they're private.
- Points = `item.points ?? point_rules[priority]`. The defaults are low = 1, med = 3,
  high = 5.
- The person who completed the item earns the points. **Together** items (assignee null)
  give the full points to **both** people.
- **Covering bonus**: when the completer isn't the original assignee (leave, sick, or
  split), they get an extra `point_rules.cover_bonus` (default 1).
- Undo adds negative rows with `reason = 'reversed'` to the ledger. The ledger is never
  updated or deleted.
- The month is the IST month of `earned_at`, and scores reset each month.

## Schema: `0006_points.sql`
```sql
create table point_rules (
  id int primary key default 1 check (id = 1),   -- single row
  low int not null default 1,
  med int not null default 3,
  high int not null default 5,
  cover_bonus int not null default 1
);
insert into point_rules default values;

alter table chores add column points int check (points >= 0);
alter table tasks  add column points int check (points >= 0);

create type point_source as enum ('chore_occurrence','task');
create type point_reason as enum ('completed','cover_bonus','reversed');

create table points_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles,
  source point_source not null,
  source_id uuid not null,
  title text not null,                -- snapshot for history
  points int not null,
  reason point_reason not null,
  month text not null,                -- 'YYYY-MM' IST
  earned_at timestamptz not null default now()
);
create index on points_ledger (month, user_id);

create table monthly_rewards (
  month text primary key,             -- 'YYYY-MM'
  title text not null,                -- "Winner picks the weekend movie"
  created_by uuid default auth.uid() references profiles
);

create view monthly_scores as
  select month, user_id, sum(points) as total
  from points_ledger group by month, user_id;
```
RLS: both members can read everything and update point_rules and monthly_rewards.
**Nobody can insert into the ledger from the client.** Writes go only through the
`security definer` functions below.

## Logic (Postgres functions, so they're atomic)
- `complete_chore_occurrence(occ_id)`: sets done, inserts the `completed` row(s) and the
  `cover_bonus` row if applicable. It's idempotent: it does nothing if the status is
  already done.
- `undo_chore_occurrence(occ_id)`: sets pending and inserts negating `reversed` rows for
  the net positive rows of that source.
- `complete_task(task_id)` and `undo_task(task_id)`: the same, and only when visibility
  is couple.
- Phase 1 and 3 server actions switch to calling these RPCs.
- `src/lib/points.ts`: `pointsFor(item, rules)` for showing "+3" on cards, plus unit tests.

## UI
- Chore and couple-task forms: a **Points** field, prefilled from the priority (showing
  "default 3") and editable.
- Cards show a "+3" pill. Completing one shows a toast: "+3 points 🎉".
- Dashboard header widget: "October: You 42 · Her 38".
- `/points`:
  - This month: two progress bars, the leader, and the reward (editable).
  - Activity list: the ledger for the month (who, what, +/-, when).
  - History: a table of past months with totals and the winner.
- `/settings` → Points: edit low/med/high and the cover bonus.

## Monthly summary
Add a stub `notify('monthly_summary')`. Phase 7 sends it on the 1st at 08:00 IST.

## Tests
- High couple task, then done gives +5, and undo gives a net 0.
- A together chore gives both users the points.
- Covering a partner's chore gives points + the bonus.
- 23:50 IST on Oct 31 counts toward October, and 00:10 IST on Nov 1 counts toward November.
- Double-complete doesn't double-award.

## Done when
- [ ] The scoreboard updates on completion and undo, and the history shows past months.
- [ ] Changing the point rules doesn't change past ledger rows.
