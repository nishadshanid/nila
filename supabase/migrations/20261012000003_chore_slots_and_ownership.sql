-- Phase 1 follow-up:
--  * chores can happen several times a day (slots), each with an optional time
--  * rotation can switch every day (useful with several times a day)
--  * monthly chores can fall on the last day of the month (by_monthday = -1)
--  * a "one person" chore can only be created or changed by that person

alter type public.rotation_unit add value if not exists 'per_day';

-- Several times a day ----------------------------------------------------------

alter table public.chores
  add column times_per_day int not null default 1 check (times_per_day between 1 and 6),
  -- One entry per slot; an entry may be null (no set time for that slot).
  add column slot_times time[];

update public.chores set slot_times = array[due_time] where due_time is not null;

alter table public.chores
  drop column due_time,
  add constraint slot_times_match
    check (slot_times is null or cardinality(slot_times) = times_per_day);

alter table public.chore_occurrences
  add column slot int not null default 0 check (slot >= 0),
  add column due_time time;

update public.chore_occurrences o
set due_time = c.slot_times[1]
from public.chores c
where c.id = o.chore_id;

alter table public.chore_occurrences
  drop constraint chore_occurrences_chore_id_date_key,
  add constraint chore_occurrences_chore_date_slot_key unique (chore_id, date, slot);

-- Last day of the month ----------------------------------------------------------

alter table public.chores
  drop constraint chores_by_monthday_check,
  add constraint by_monthday_valid check (by_monthday = -1 or by_monthday between 1 and 31);

-- Ownership of "one person" chores ----------------------------------------------

drop policy "members manage chores" on public.chores;

create policy "members read chores"
  on public.chores for select to authenticated
  using (public.is_member());

create policy "members add shared or own chores"
  on public.chores for insert to authenticated
  with check (
    public.is_member() and (assignment_type <> 'fixed' or fixed_assignee = auth.uid())
  );

create policy "members change shared or own chores"
  on public.chores for update to authenticated
  using (public.is_member() and (assignment_type <> 'fixed' or fixed_assignee = auth.uid()))
  with check (
    public.is_member() and (assignment_type <> 'fixed' or fixed_assignee = auth.uid())
  );

create policy "members delete shared or own chores"
  on public.chores for delete to authenticated
  using (public.is_member() and (assignment_type <> 'fixed' or fixed_assignee = auth.uid()));
