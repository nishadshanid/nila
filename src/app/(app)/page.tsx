import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getHousehold } from "@/lib/household";
import { getChoresForDay, type OccurrenceWithChore } from "@/lib/chores";
import { addDays, formatDay, todayIST, TZ, type DateStr } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { ChoreCard } from "@/components/chores/chore-card";
import { PersonDot } from "@/components/person-dot";
import type { Person } from "@/lib/types";
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

function Progress({ occurrences }: { occurrences: OccurrenceWithChore[] }) {
  const done = occurrences.filter((o) => o.status === "done").length;
  const percent = Math.round((done / occurrences.length) * 100);
  return (
    <div className="mb-6 rounded-xl border p-4">
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-medium">Done together</span>
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
  readOnly,
}: {
  title: string;
  person?: Person;
  occurrences: OccurrenceWithChore[];
  people: Person[];
  readOnly?: boolean;
}) {
  if (occurrences.length === 0) return null;
  const done = occurrences.filter((o) => o.status === "done").length;
  return (
    <section className="mb-6">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {person && <PersonDot profile={person} />}
        {title}
        <span className="text-muted-foreground font-normal">
          {done}/{occurrences.length}
        </span>
      </h2>
      <ul className="flex flex-col gap-2">
        {occurrences.map((o) => (
          <ChoreCard key={o.id} occurrence={o} people={people} readOnly={readOnly} />
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
  const occurrences = await getChoresForDay(date);

  const mine = occurrences.filter((o) => o.assignee_id === me.id);
  const together = occurrences.filter((o) => o.assignee_id === null);
  const theirs = occurrences.filter((o) => partner && o.assignee_id === partner.id);
  const visible = view === "couple" ? occurrences : [...mine, ...together];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting(now)}, {me.name}
        </h1>
        {!partner && (
          <p className="text-muted-foreground mt-1 text-sm">
            Your partner hasn&apos;t been added yet. Create their account in Supabase.
          </p>
        )}
      </div>

      {partner && <ViewSwitch date={date} today={today} view={view} />}
      <DayNav date={date} today={today} view={view} />

      {visible.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          {view === "mine" ? "Nothing for you on this day." : "No chores on this day."}{" "}
          <Link href="/chores" className="underline">
            Set up chores
          </Link>
        </div>
      ) : view === "mine" ? (
        <>
          <ChoreSection title="Your chores" person={me} occurrences={mine} people={people} />
          <ChoreSection title="Together" occurrences={together} people={people} />
        </>
      ) : (
        <>
          <Progress occurrences={occurrences} />
          <ChoreSection title="You" person={me} occurrences={mine} people={people} />
          <ChoreSection title="Together" occurrences={together} people={people} />
          {partner && (
            <ChoreSection
              title={partner.name}
              person={partner}
              occurrences={theirs}
              people={people}
              readOnly
            />
          )}
        </>
      )}
    </>
  );
}

export default function TodayPage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl" />}>
      <Today searchParams={searchParams} />
    </Suspense>
  );
}
