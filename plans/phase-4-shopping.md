# Phase 4: Shopping / Stock List

## Goal
Either partner adds items they notice are needed. Items are grouped by urgency (today,
this week, this month, someday), and there's an easy "shopping mode" view in the shop.

## Schema: `0005_shopping.sql`
```sql
create type urgency as enum ('today','this_week','this_month','someday');
create type item_status as enum ('needed','bought');

create table shopping_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  qty numeric,
  unit text,                              -- kg, L, pcs, pack
  category text not null default 'grocery', -- grocery/vegetables/household/personal/other
  urgency urgency not null default 'this_week',
  notes text,
  status item_status not null default 'needed',
  added_by uuid not null default auth.uid() references profiles,
  bought_by uuid references profiles,
  bought_at timestamptz,
  created_at timestamptz default now()
);
create index on shopping_items (status, urgency);
```
RLS: both members have full access.

## UI
- `/shopping`:
  - A quick-add input that parses "2 kg rice" into qty, unit, and name, with an urgency
    chip selector (Today / Week / Month / Someday) and a category select.
  - Sections by urgency (Today in red, Week in amber, Month in blue, Someday in grey),
    each sorted by category.
  - Tap the checkbox to mark bought (sets bought_by/at, shows an undo toast). Swipe or
    use the menu to edit or delete.
  - A **Shopping mode** toggle: full-screen, large tap targets, grouped by category
    (shop aisle). Bought items sink to the bottom with a strikethrough.
  - A **Bought** tab with history for the last 30 days and a "Buy again" button that
    re-adds the item as needed.
  - Name autocomplete from past items.
- Dashboard: a "Buy today" card showing Today-urgency items, plus a count for this week.
- Auto-escalation (pure function, runs in materialize/cron): none by default. Instead,
  show "added 6 days ago" on stale week items. Keep it simple.

## Tests
- Quick-add parser: "2 kg rice", "milk", "3 eggs", "1.5L oil".

## Done when
- [ ] She adds "milk — today" on her phone, and it shows in my Today card after a refresh.
- [ ] Shopping mode is usable one-handed, and bought items move to history.
- [ ] Buy again re-adds the item.
