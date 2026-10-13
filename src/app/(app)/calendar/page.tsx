import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { getCalendarMonth } from "@/lib/calendar";
import { monthKeyIST } from "@/lib/dates";
import { CalendarView } from "./calendar-view";

export const metadata: Metadata = { title: "Calendar" };

async function Calendar({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const params = await searchParams;
  // Today's month depends on the clock: render per visit, not ahead of time.
  await connection();
  const month =
    params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month) ? params.month : monthKeyIST();
  const { days, today, items, people, meId } = await getCalendarMonth(month);
  return (
    <CalendarView
      key={month}
      month={month}
      days={days}
      today={today}
      items={items}
      people={people}
      meId={meId}
    />
  );
}

export default function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  return (
    <>
      <PageHeader title="Calendar" description="Chores, todos, plans, reminders and leave." />
      <Suspense fallback={<div className="bg-muted h-96 animate-pulse rounded-xl" />}>
        <Calendar searchParams={searchParams} />
      </Suspense>
    </>
  );
}
