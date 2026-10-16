-- Items can be needed by a particular date. The app keeps `urgency` in step
-- with it (today / this week / this month / someday) as the date gets closer.
alter table public.shopping_items add column need_by date;

create index shopping_items_need_by_idx on public.shopping_items (status, need_by)
  where need_by is not null;
