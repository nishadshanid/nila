# Phase 2: Leave and Split (hand-over)

## Goal
When one partner is away (at her home) or sick, their chores automatically go to the
other partner. Either partner can also hand over a single task ("can't do, fever").

## Schema: `0003_leaves.sql`
```sql
create type leave_type as enum ('away','sick','other');
create table leaves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  type leave_type not null,
  note text,
  created_by uuid not null default auth.uid() references profiles,
  created_at timestamptz default now()
);
alter table chore_occurrences
  add constraint reassign_reason_chk
  check (reassign_reason in ('leave','sick','split','manual') or reassign_reason is null),
  add column reassign_note text,
  add column reassigned_at timestamptz;
```
RLS: both members can read. Insert, update, and delete are allowed by either partner
(she can enter leave for herself, or you can enter it for her).

## Logic: `src/lib/handover.ts`
- `applyLeave(leave)`: for pending occurrences with `date` in the range and
  `assignee_id = leave.user_id`, set `assignee_id = partner`, keep
  `original_assignee_id`, and set `reassign_reason = leave.type === 'sick' ? 'sick' : 'leave'`.
- `revertLeave(leave)` runs on delete or when the range shrinks. For pending occurrences
  in the old range where `reassign_reason in ('leave','sick')`, it restores
  `assignee_id = original_assignee_id`.
- The materializer is leave-aware. A newly generated occurrence that falls inside a leave
  is assigned to the partner directly, with the reason set.
- `together` chores during a leave are assigned to the partner (not null) with the
  reason set.
- `splitOccurrence(id, reason, note)`: move it to the partner with `reassign_reason =
  'split'`. Add `takeBack(id)` to undo.
- Rotation index is **not** shifted (by design).

## UI
- `/leave`: list of upcoming and past leaves, plus an "Add leave" form (who, dates, type,
  note) that previews "N chores will move to <partner>".
- Dashboard banner: "Wife is away until Fri — you're covering 4 chores".
- `ChoreCard` adds a **Can't do** menu with a reason (Sick, Busy, Away, Other) and a note,
  plus a "Covering for X · fever" badge on reassigned cards.
- `/leave` also shows a small "Covers this month: me 3 · her 1" count.

## Notifications
Leave the hook `notify('reassigned', …)` as a no-op stub. Phase 7 implements email.

## Tests
- Adding a 3-day leave reassigns only pending rows in range that belong to that user.
- Deleting the leave restores them, but not ones already marked done.
- Occurrences materialized later inside a leave are created with the partner as assignee.
- Split followed by takeBack is a round trip.

## Done when
- [ ] Adding a 3-day leave for her moves all her chores in that range to me, with badges.
- [ ] Deleting the leave moves them back.
- [ ] "Can't do (fever)" on a single chore hands it over and the partner sees the reason.
