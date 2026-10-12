-- Phase 7: email notifications.
--
-- notification_log: one row per email we've decided to send, so a repeated tick never
--   sends the same reminder, digest or summary twice.
-- notification_outbox: events written by triggers (hand-overs, leaves, new todos for your
--   partner) and sent by the next tick.
-- Both are server-only: RLS on with no policies, so only the service role reaches them.

create table public.notification_log (
  id bigint generated always as identity primary key,
  kind text not null,  -- item_reminder / digest / monthly
  key text not null,   -- what it was about, e.g. 'chore:<id>' or '2026-10-14' or '2026-10'
  user_id uuid not null references public.profiles on delete cascade,
  sent_at timestamptz not null default now(),
  unique (kind, key, user_id)
);

create table public.notification_outbox (
  id bigint generated always as identity primary key,
  kind text not null,  -- handover / leave / new_task
  user_id uuid not null references public.profiles on delete cascade,  -- who gets it
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  error text
);
create index notification_outbox_pending_idx on public.notification_outbox (created_at)
  where sent_at is null;

alter table public.notification_log enable row level security;
alter table public.notification_outbox enable row level security;

-- "Can't do it": tell the partner who now has the chore.
create function public.outbox_handover()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.reassign_reason = 'split'
     and old.reassign_reason is distinct from 'split'
     and new.assignee_id is not null then
    insert into public.notification_outbox (kind, user_id, payload)
    select 'handover', new.assignee_id, jsonb_build_object(
      'title', c.title, 'date', new.date, 'from', new.reassigned_by, 'note', new.reassign_note)
    from public.chores c where c.id = new.chore_id;
  end if;
  return null;
end $$;

create trigger chore_occurrences_outbox
  after update of reassign_reason on public.chore_occurrences
  for each row execute function public.outbox_handover();

-- A new leave: tell the other partner they'll be covering.
create function public.outbox_leave()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.notification_outbox (kind, user_id, payload)
  select 'leave', p.id, jsonb_build_object(
    'user_id', new.user_id, 'start_date', new.start_date, 'end_date', new.end_date,
    'type', new.type, 'note', new.note)
  from public.profiles p where p.id <> new.user_id;
  return null;
end $$;

create trigger leaves_outbox
  after insert on public.leaves
  for each row execute function public.outbox_leave();

-- A couple todo for your partner (or for both of you): tell your partner.
create function public.outbox_new_task()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.visibility = 'couple' and new.kind = 'todo' then
    insert into public.notification_outbox (kind, user_id, payload)
    select 'new_task', p.id, jsonb_build_object(
      'title', new.title, 'from', new.owner_id, 'date', new.date, 'time', new.time,
      'priority', new.priority, 'for_both', new.assignee_id is null)
    from public.profiles p
    where p.id <> new.owner_id and (new.assignee_id is null or new.assignee_id = p.id);
  end if;
  return null;
end $$;

create trigger tasks_outbox
  after insert on public.tasks
  for each row execute function public.outbox_new_task();

revoke execute on function public.outbox_handover, public.outbox_leave, public.outbox_new_task
  from public, anon, authenticated;

-- Every 15 minutes, call the app's /api/cron/tick. Inactive until both secrets exist:
--   select vault.create_secret('https://<your-app>.vercel.app', 'nila_app_url');
--   select vault.create_secret('<same value as CRON_SECRET>', 'nila_cron_secret');
-- The regular calls also keep the free Supabase project from pausing.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'nila-tick';

select cron.schedule('nila-tick', '*/15 * * * *', $job$
  select net.http_post(
    url := s.url || '/api/cron/tick',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || s.secret,
      'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000)
  from (
    select
      (select decrypted_secret from vault.decrypted_secrets where name = 'nila_app_url') as url,
      (select decrypted_secret from vault.decrypted_secrets where name = 'nila_cron_secret') as secret
  ) s
  where s.url is not null and s.secret is not null
$job$);
