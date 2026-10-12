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

function DayNav({ date, today }: { date: DateStr; today: DateStr }) {
  const href = (d: DateStr) => (d === today ? "/" : `/?date=${d}`);
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <Button
        variant="ghost"
        size="icon"
        render={<Link href={href(addDays(date, -1))} aria-label="Previous day" />}
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
        render={<Link href={href(addDays(date, 1))} aria-label="Next day" />}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}

function ChoreSection({
  title,
  person,
  occurrences,
  people,
}: {
  title: string;
  person?: Person;
  occurrences: OccurrenceWithChore[];
  people: Person[];
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
          <ChoreCard key={o.id} occurrence={o} people={people} />
        ))}
      </ul>
    </section>
  );
}

async function Today({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const [{ me, partner, people }, params] = await Promise.all([getHousehold(), searchParams]);
  const now = new Date();
  const today = todayIST(now);
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today;
  const occurrences = await getChoresForDay(date);

  const mine = occurrences.filter((o) => o.assignee_id === me.id);
  const together = occurrences.filter((o) => o.assignee_id === null);
  const theirs = occurrences.filter((o) => partner && o.assignee_id === partner.id);

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

      <DayNav date={date} today={today} />

      {occurrences.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          No chores on this day.{" "}
          <Link href="/chores" className="underline">
            Set up chores
          </Link>
        </div>
      ) : (
        <>
          <ChoreSection title="Your chores" person={me} occurrences={mine} people={people} />
          <ChoreSection title="Together" occurrences={together} people={people} />
          {partner && (
            <ChoreSection
              title={`${partner.name}'s chores`}
              person={partner}
              occurrences={theirs}
              people={people}
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
