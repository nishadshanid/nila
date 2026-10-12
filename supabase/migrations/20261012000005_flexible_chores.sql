-- Flexible chores: "N times a week" or "N times a month", on any days.
-- They have no planned occurrences; a done row is added on the day it's logged.

alter table public.chores
  add column flex_target int check (flex_target between 1 and 31);

alter table public.chores
  drop constraint weekly_needs_days,
  drop constraint monthly_needs_day,
  add constraint weekly_needs_days
    check (freq <> 'weekly' or flex_target is not null or cardinality(by_weekday) >= 1),
  add constraint monthly_needs_day
    check (freq <> 'monthly' or flex_target is not null or by_monthday is not null),
  add constraint flex_period
    check (flex_target is null or (freq = 'weekly' and flex_target <= 7) or freq = 'monthly'),
  add constraint flex_not_rotating
    check (flex_target is null or assignment_type <> 'rotating');
