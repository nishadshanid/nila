-- Phase 8: phone push notifications and realtime sync.

-- One row per device that allowed notifications (a phone, a laptop browser).
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Your devices are yours alone; the server sends with the service role.
create policy "manage own push subscriptions"
  on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_member());

-- Which channels each of you wants. Email already has email_notifications.
alter table public.profiles add column push_notifications boolean not null default true;

-- Realtime: changes to these tables reach the other phone straight away.
-- RLS still applies, so private items never leave their owner's view.
do $$
declare
  t text;
begin
  foreach t in array array[
    'chore_occurrences', 'chores', 'tasks', 'reminders', 'reminder_acks',
    'shopping_items', 'leaves', 'points_ledger', 'monthly_rewards'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
