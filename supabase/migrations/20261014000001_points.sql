-- Phase 5: points. Finishing chores and couple todos earns points; scores are per IST month.
--
-- The ledger is append-only and written only by the triggers below (security definer),
-- so points follow every way of ticking something off: Today, flexible logs, undo.

create table public.point_rules (
  id int primary key default 1 check (id = 1),  -- a single row
  low int not null default 1 check (low between 0 and 100),
  med int not null default 3 check (med between 0 and 100),
  high int not null default 5 check (high between 0 and 100),
  cover_bonus int not null default 1 check (cover_bonus between 0 and 100),
  updated_at timestamptz not null default now()
);
insert into public.point_rules default values;

create trigger point_rules_updated_at
  before update on public.point_rules
  for each row execute function public.set_updated_at();

-- Per-item override; null = use the priority's points.
alter table public.chores add column points int check (points between 0 and 100);
alter table public.tasks add column points int check (points between 0 and 100);

create type public.point_source as enum ('chore_occurrence', 'task');
create type public.point_reason as enum ('completed', 'cover_bonus', 'reversed');

create table public.points_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  source public.point_source not null,
  source_id uuid not null,
  title text not null,  -- snapshot, so history survives renames and deletes
  points int not null,
  reason public.point_reason not null,
  month text not null check (month ~ '^\d{4}-\d{2}$'),  -- IST month, 'YYYY-MM'
  earned_at timestamptz not null default now()
);
create index points_ledger_month_idx on public.points_ledger (month, user_id);
create index points_ledger_source_idx on public.points_ledger (source, source_id);

create table public.monthly_rewards (
  month text primary key check (month ~ '^\d{4}-\d{2}$'),
  title text not null check (length(trim(title)) between 1 and 200),
  created_by uuid default auth.uid() references public.profiles on delete set null,
  updated_at timestamptz not null default now()
);

create trigger monthly_rewards_updated_at
  before update on public.monthly_rewards
  for each row execute function public.set_updated_at();

create view public.monthly_scores with (security_invoker = true) as
  select month, user_id, sum(points)::int as total
  from public.points_ledger
  group by month, user_id;

-- RLS ----------------------------------------------------------------------------------

alter table public.point_rules enable row level security;
alter table public.points_ledger enable row level security;
alter table public.monthly_rewards enable row level security;

create policy "members read point rules"
  on public.point_rules for select to authenticated using (public.is_member());
create policy "members change point rules"
  on public.point_rules for update to authenticated
  using (public.is_member()) with check (public.is_member());

-- Read-only from the app: no insert, update or delete policies.
create policy "members read the ledger"
  on public.points_ledger for select to authenticated using (public.is_member());

create policy "members manage rewards"
  on public.monthly_rewards for all to authenticated
  using (public.is_member()) with check (public.is_member());

-- Helpers ------------------------------------------------------------------------------

create function public.ist_month(ts timestamptz default now())
returns text language sql stable
as $$ select to_char(ts at time zone 'Asia/Kolkata', 'YYYY-MM') $$;

create function public.rule_points(p public.priority, override int)
returns int language sql stable security definer set search_path = public
as $$
  select coalesce(override, case p when 'low' then r.low when 'med' then r.med else r.high end)
  from public.point_rules r where r.id = 1
$$;

create function public.award_points(
  p_user uuid, p_source public.point_source, p_source_id uuid, p_title text,
  p_points int, p_reason public.point_reason
) returns void language sql security definer set search_path = public
as $$
  insert into public.points_ledger (user_id, source, source_id, title, points, reason, month)
  select p_user, p_source, p_source_id, p_title, p_points, p_reason, public.ist_month()
  where p_user is not null and p_points <> 0
$$;

-- Cancels whatever an item has earned so far, in the month(s) it was earned.
create function public.reverse_points(p_source public.point_source, p_source_id uuid)
returns void language sql security definer set search_path = public
as $$
  insert into public.points_ledger (user_id, source, source_id, title, points, reason, month)
  select user_id, p_source, p_source_id, max(title), -sum(points), 'reversed', month
  from public.points_ledger
  where source = p_source and source_id = p_source_id
  group by user_id, month
  having sum(points) <> 0
$$;

-- Chores -------------------------------------------------------------------------------
-- Done: the person who did it earns the chore's points. Together chores (no assignee)
-- give the points to both of you. Covering for someone (leave, sick, a hand-over, or a
-- together chore done alone) adds the cover bonus.

create function public.chore_occurrence_points()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  was_done boolean := tg_op = 'UPDATE' and old.status = 'done';
  is_done boolean := new.status = 'done';
  c record;
  pts int;
  doer uuid;
begin
  if was_done = is_done then return null; end if;
  if was_done then
    perform public.reverse_points('chore_occurrence', new.id);
    return null;
  end if;

  select title, priority, points into c from public.chores where id = new.chore_id;
  pts := public.rule_points(c.priority, c.points);
  if pts = 0 then return null; end if;

  if new.assignee_id is null then
    perform public.award_points(p.id, 'chore_occurrence', new.id, c.title, pts, 'completed')
    from public.profiles p;
  else
    doer := coalesce(new.completed_by, new.assignee_id);
    perform public.award_points(doer, 'chore_occurrence', new.id, c.title, pts, 'completed');
    if new.original_assignee_id is distinct from new.assignee_id and doer = new.assignee_id then
      perform public.award_points(
        doer, 'chore_occurrence', new.id, c.title,
        (select cover_bonus from public.point_rules where id = 1), 'cover_bonus');
    end if;
  end if;
  return null;
end $$;

create trigger chore_occurrences_points
  after insert or update of status on public.chore_occurrences
  for each row execute function public.chore_occurrence_points();

-- Couple todos -------------------------------------------------------------------------
-- Whoever ticks it earns the points. Private todos and plans don't earn points.

create function public.task_points()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  was_done boolean := tg_op = 'UPDATE' and old.status = 'done';
  is_done boolean := new.status = 'done';
begin
  if was_done = is_done then return null; end if;
  if was_done then
    perform public.reverse_points('task', new.id);
  elsif new.kind = 'todo' and new.visibility = 'couple' then
    perform public.award_points(
      coalesce(new.completed_by, auth.uid()), 'task', new.id, new.title,
      public.rule_points(new.priority, new.points), 'completed');
  end if;
  return null;
end $$;

create trigger tasks_points
  after insert or update of status on public.tasks
  for each row execute function public.task_points();

-- Only the triggers call these.
revoke execute on function public.award_points, public.reverse_points,
  public.chore_occurrence_points, public.task_points from public, anon, authenticated;
