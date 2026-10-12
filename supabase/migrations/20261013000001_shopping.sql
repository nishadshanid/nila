-- Phase 4: shared shopping list. Both of you see and change everything here.

create type public.urgency as enum ('today', 'this_week', 'this_month', 'someday');
create type public.item_status as enum ('needed', 'bought');

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  qty numeric check (qty > 0 and qty < 100000),
  unit text check (length(unit) <= 12),
  category text not null default 'grocery'
    check (category in ('grocery', 'produce', 'dairy', 'meat', 'household', 'personal', 'other')),
  urgency public.urgency not null default 'this_week',
  notes text check (length(notes) <= 500),
  status public.item_status not null default 'needed',
  added_by uuid not null default auth.uid() references public.profiles on delete cascade,
  bought_by uuid references public.profiles on delete set null,
  bought_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bought_has_time check (status = 'needed' or bought_at is not null)
);

create index shopping_items_status_idx on public.shopping_items (status, urgency);
create index shopping_items_bought_at_idx on public.shopping_items (bought_at desc);

create trigger shopping_items_updated_at
  before update on public.shopping_items
  for each row execute function public.set_updated_at();

alter table public.shopping_items enable row level security;

create policy "members manage shopping"
  on public.shopping_items for all to authenticated
  using (public.is_member())
  with check (public.is_member());
