import { Suspense } from "react";
import Link from "next/link";
import { CalendarOff, ChevronLeft, ChevronRight } from "lucide-react";
import { getHousehold } from "@/lib/household";
import {
  getChoresForDay,
  getFlexibleForDay,
  type FlexibleProgress,
  type OccurrenceWithChore,
} from "@/lib/chores";
import { addDays, formatDay, todayIST, TZ, type DateStr } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { ChoreCard } from "@/components/chores/chore-card";
import { FlexibleCard } from "@/components/chores/flexible-card";
import { PersonDot } from "@/components/person-dot";
import { getLeavesOn } from "@/lib/leaves";
import { getRemindersForDay, type DayReminder } from "@/lib/reminders";
import { getTasksForDay } from "@/lib/tasks";
import { TaskRow } from "@/components/tasks/task-row";
import { DayTodos } from "@/components/tasks/day-todos";
import { BuyToday } from "@/components/shopping/buy-today";
import { getShoppingSummary } from "@/lib/shopping";
import { getMonthScores, getPointRules, getPointsToday } from "@/lib/points-data";
import { DayComplete } from "@/components/celebrate/day-complete";
import { PointRulesProvider } from "@/components/points/rules-context";
import { MonthScoreLine } from "@/components/points/month-score-line";
import { DayReminderRow } from "@/components/reminders/day-reminder";
import type { Leave, Person, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

type View = "mine" | "couple";

function greeting(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(
      now,
    ),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function dayLabel(date: DateStr, today: DateStr) {
  if (date === today) return "Today";
  if (date === addDays(today, -1)) return "Yesterday";
  if (date === addDays(today, 1)) return "Tomorrow";
  return formatDay(date, "EEEE");
}

function todayHref(date: DateStr, today: DateStr, view: View) {
  const params = new URLSearchParams();
  if (date !== today) params.set("date", date);
  if (view === "couple") params.set("view", "couple");
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function DayNav({ date, today, view }: { date: DateStr; today: DateStr; view: View }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <Button
        variant="ghost"
        size="icon"
        nativeButton={false}
        render={<Link href={todayHref(addDays(date, -1), today, view)} aria-label="Previous day" />}
      >
        <ChevronLeft />
      </Button>
      <div className="text-center">
        <p className="font-semibold">{dayLabel(date, today)}</p>
        <p className="text-muted-foreground text-xs">{formatDay(date, "EEE, d MMMM")}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        nativeButton={false}
        render={<Link href={todayHref(addDays(date, 1), today, view)} aria-label="Next day" />}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}

function ViewSwitch({ date, today, view }: { date: DateStr; today: DateStr; view: View }) {
  const tabs: { value: View; label: string }[] = [
    { value: "mine", label: "Mine" },
    { value: "couple", label: "Couple" },
  ];
  return (
    <nav aria-label="Whose chores" className="bg-muted mb-4 flex rounded-lg p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={todayHref(date, today, tab.value)}
          aria-current={view === tab.value ? "page" : undefined}
          className={cn(
            "text-muted-foreground flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors",
            view === tab.value && "bg-background text-foreground shadow-sm",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function Progress({ occurrences: all }: { occurrences: OccurrenceWithChore[] }) {
  const occurrences = all.filter((o) => o.status !== "skipped");
  if (occurrences.length === 0) return null;
  const done = occurrences.filter((o) => o.status === "done").length;
  const percent = Math.round((done / occurrences.length) * 100);
  return (
    <div className="mb-6 rounded-xl border p-4">
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-medium">Shared chores done</span>
        <span className="text-muted-foreground">
          {done} of {occurrences.length}
        </span>
      </div>
      <div
        className="bg-muted h-2 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="bg-primary h-full rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ChoreSection({
  title,
  person,
  occurrences,
  people,
  meId,
  showTurn = false,
  handedOver = false,
}: {
  title: string;
  person?: Person;
  occurrences: OccurrenceWithChore[];
  people: Person[];
  meId: string;
  /** Show whose turn it is on each card (for rotating chores). */
  showTurn?: boolean;
  /** Chores you handed to your partner: read-only, with "Take back". */
  handedOver?: boolean;
}) {
  if (occurrences.length === 0) return null;
  const active = occurrences.filter((o) => o.status !== "skipped");
  const done = active.filter((o) => o.status === "done").length;
  return (
    <section className="mb-6">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {person && <PersonDot profile={person} />}
        {title}
        <span className="text-muted-foreground font-normal">
          {done}/{active.length}
        </span>
      </h2>
      <ul className="flex flex-col gap-2">
        {occurrences.map((o) => (
          <ChoreCard
            key={o.id}
            occurrence={o}
            people={people}
            meId={meId}
            showTurn={showTurn}
            canTakeBack={handedOver}
            // Only the person whose turn it is can tick it; together chores are anyone's.
            readOnly={o.assignee_id !== null && o.assignee_id !== meId}
          />
        ))}
      </ul>
    </section>
  );
}

function LeaveBanner({
  leaves,
  me,
  partner,
}: {
  leaves: Leave[];
  me: Person;
  partner: Person | null;
}) {
  if (leaves.length === 0) return null;
  const word = { away: "away", sick: "sick", other: "on leave" } as const;
  return (
    <div className="mb-4 flex flex-col gap-2">
      {leaves.map((leave) => {
        const isMe = leave.user_id === me.id;
        const until = `until ${formatDay(leave.end_date, "EEE, d MMM")}`;
        return (
          <Link
            key={leave.id}
            href="/leave"
            className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
          >
            <CalendarOff className="mt-0.5 size-4 shrink-0" />
            <span>
              {isMe ? (
                <>
                  You&apos;re {word[leave.type]} {until}.{" "}
                  {partner ? `${partner.name} has your shared chores; your own are paused.` : ""}
                </>
              ) : (
                <>
                  {partner?.name ?? "Your partner"} is {word[leave.type]} {until}. You&apos;re
                  covering the shared chores.
                </>
              )}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function ReminderSection({ items }: { items: DayReminder[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold">Reminders</h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <DayReminderRow key={`${item.reminder.id}-${item.date}`} item={item} />
        ))}
      </ul>
    </section>
  );
}

function TaskSection({
  title,
  tasks,
  people,
  meId,
  today,
}: {
  title: string;
  tasks: Task[];
  people: Person[];
  meId: string;
  today: DateStr;
}) {
  if (tasks.length === 0) return null;
  const done = tasks.filter((t) => t.status === "done").length;
  return (
    <section className="mb-6">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {title}
        <span className="text-muted-foreground font-normal">
          {done}/{tasks.length}
        </span>
      </h2>
      <ul className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} people={people} meId={meId} today={today} />
        ))}
      </ul>
    </section>
  );
}

function FlexibleSection({
  items,
  date,
  today,
  meId,
}: {
  items: FlexibleProgress[];
  date: DateStr;
  today: DateStr;
  meId: string;
}) {
  if (items.length === 0) return null;
  const label =
    date === today ? "today" : date === addDays(today, -1) ? "yesterday" : formatDay(date, "EEE");
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold">This week &amp; month</h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <FlexibleCard
            key={item.chore.id}
            progress={item}
            date={date}
            dayLabel={label}
            canLog={date <= today}
            readOnly={item.chore.assignment_type === "fixed" && item.chore.fixed_assignee !== meId}
          />
        ))}
      </ul>
    </section>
  );
}

async function Today({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const [{ me, partner, people }, params] = await Promise.all([getHousehold(), searchParams]);
  const now = new Date();
  const today = todayIST(now);
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today;
  const view: View = params.view === "couple" && partner ? "couple" : "mine";
  const [occurrences, flexible, leaves, tasks, reminders, shopping, rules, scores] =
    await Promise.all([
      getChoresForDay(date, today),
      getFlexibleForDay(date),
      getLeavesOn(date),
      getTasksForDay(date, today),
      getRemindersForDay(date),
      // The shopping list isn't dated, so it only shows on today.
      date === today ? getShoppingSummary() : null,
      getPointRules(),
      getMonthScores(),
    ]);
  // Mine: what you do today. Couple: only shared chores (together and taking turns);
  // "just me" chores stay private to each of you.
  const isShared = (c: { assignment_type: string }) => c.assignment_type !== "fixed";
  const visibleFlexible = flexible.filter((f) =>
    view === "couple"
      ? isShared(f.chore)
      : f.chore.assignment_type !== "fixed" || f.chore.fixed_assignee === me.id,
  );

  const mine = occurrences.filter((o) => o.assignee_id === me.id);
  const together = occurrences.filter((o) => o.assignee_id === null);
  const handedOver = occurrences.filter(
    (o) => o.reassign_reason === "split" && o.reassigned_by === me.id && o.assignee_id !== me.id,
  );
  const turns = occurrences.filter((o) => o.chore.assignment_type === "rotating");
  const shared = occurrences.filter((o) => isShared(o.chore));
  // In the Couple view, a together chore stays under "Together" even when one of
  // you is covering it alone.
  const togetherShared = occurrences.filter((o) => o.chore.assignment_type === "together");

  // Todos & plans: Mine shows your private ones plus couple ones for you or both;
  // Couple shows only couple ones.
  const forView = (t: Task) =>
    view === "couple"
      ? t.visibility === "couple"
      : t.visibility === "personal" || t.assignee_id === null || t.assignee_id === me.id;
  const todos = tasks.filter((t) => t.kind === "todo" && forView(t));
  const plans = tasks.filter((t) => t.kind === "plan" && forView(t));
  const dayReminders = reminders.filter(
    (r) => view === "mine" || r.reminder.visibility === "couple",
  );

  const visible = view === "couple" ? shared : [...mine, ...together, ...handedOver];
  const noChores = visible.length === 0 && visibleFlexible.length === 0;

  // Everything for today ticked off? (Paused chores and ones you handed over don't count.)
  const work = [
    ...(view === "couple" ? shared : [...mine, ...together]).filter((o) => o.status !== "skipped"),
    ...todos,
  ];
  const allDone = date === today && work.length > 0 && work.every((item) => item.status === "done");
  const pointsToday = allDone && view === "mine" ? await getPointsToday(me.id, today) : null;

  return (
    <PointRulesProvider rules={rules}>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold">
          {greeting(now)}, {me.name}
        </h1>
        {!partner && (
          <p className="text-muted-foreground mt-1 text-sm">
            Your partner hasn&apos;t been added yet. Create their account in Supabase.
          </p>
        )}
        <MonthScoreLine scores={scores} people={people} meId={me.id} />
      </div>

      {partner && <ViewSwitch date={date} today={today} view={view} />}
      <DayNav date={date} today={today} view={view} />
      <LeaveBanner leaves={leaves} me={me} partner={partner} />
      {allDone && (
        <DayComplete
          date={date}
          view={view}
          count={work.length}
          points={pointsToday}
          partnerName={partner?.name ?? null}
        />
      )}

      {view === "mine" ? (
        <DayTodos
          key={`mine-${date}`}
          title="Todos"
          tasks={todos}
          people={people}
          me={me}
          date={date}
          today={today}
        />
      ) : (
        <DayTodos
          key={`couple-${date}`}
          title="Couple todos"
          tasks={todos}
          people={people}
          me={me}
          date={date}
          today={today}
          coupleOnly
        />
      )}

      <TaskSection title="Plans" tasks={plans} people={people} meId={me.id} today={today} />
      {shopping && <BuyToday items={shopping.today} weekCount={shopping.weekCount} />}

      {noChores ? (
        <p className="text-muted-foreground mb-6 rounded-xl border border-dashed p-6 text-center text-sm">
          {view === "mine" ? "No chores for you on this day." : "No shared chores on this day."}{" "}
          <Link href="/chores" className="underline">
            Set up chores
          </Link>
        </p>
      ) : view === "mine" ? (
        <>
          <ChoreSection
            title="Your chores"
            person={me}
            occurrences={mine}
            people={people}
            meId={me.id}
          />
          <ChoreSection title="Together" occurrences={together} people={people} meId={me.id} />
          <ChoreSection
            title={`Handed to ${partner?.name ?? "partner"}`}
            occurrences={handedOver}
            people={people}
            meId={me.id}
            handedOver
          />
        </>
      ) : (
        <>
          {shared.length > 0 && <Progress occurrences={shared} />}
          <ChoreSection
            title="Together"
            occurrences={togetherShared}
            people={people}
            meId={me.id}
          />
          <ChoreSection
            title="Taking turns"
            occurrences={turns}
            people={people}
            meId={me.id}
            showTurn
          />
        </>
      )}

      <ReminderSection items={dayReminders} />
      <FlexibleSection items={visibleFlexible} date={date} today={today} meId={me.id} />
    </PointRulesProvider>
  );
}

export default function TodayPage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl" />}>
      <Today searchParams={searchParams} />
    </Suspense>
  );
}
