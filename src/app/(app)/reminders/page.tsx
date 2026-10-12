import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { todayIST } from "@/lib/dates";
import { getHousehold } from "@/lib/household";
import { getReminders } from "@/lib/reminders";
import { ReminderList } from "./reminder-list";

export const metadata: Metadata = { title: "Reminders" };

async function Reminders() {
  const [{ me, partner }, reminders] = await Promise.all([getHousehold(), getReminders()]);
  return (
    <ReminderList
      reminders={reminders}
      meId={me.id}
      hasPartner={partner !== null}
      today={todayIST()}
    />
  );
}

export default function RemindersPage() {
  return (
    <>
      <PageHeader title="Reminders" description="Birthdays, anniversaries, calls and more." />
      <Suspense fallback={<div className="bg-muted h-40 animate-pulse rounded-xl" />}>
        <Reminders />
      </Suspense>
    </>
  );
}
