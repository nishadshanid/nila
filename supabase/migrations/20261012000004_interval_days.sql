-- Replace "several times a day" with "every N days" (e.g. alternate days).

-- Back to a single optional time per chore.
alter table public.chores add column due_time time;
update public.chores set due_time = slot_times[1] where slot_times is not null;

alter table public.chores
  drop constraint slot_times_match,
  drop column slot_times,
  drop column times_per_day;

-- Extra same-day slots no longer exist.
delete from public.chore_occurrences where slot > 0;

alter table public.chore_occurrences
  drop constraint chore_occurrences_chore_date_slot_key,
  drop column slot,
  add constraint chore_occurrences_chore_id_date_key unique (chore_id, date);

-- "Switch every day" only differed from "every time" with several slots a day.
-- Enum values can't be dropped, so retire it with a constraint.
update public.chores set rotation_unit = 'per_occurrence' where rotation_unit = 'per_day';
alter table public.chores
  add constraint rotation_unit_not_per_day check (rotation_unit <> 'per_day');

-- Daily chores can repeat every N days: 1 = every day, 2 = alternate days.
alter table public.chores
  add column interval_days int not null default 1 check (interval_days between 1 and 365);
