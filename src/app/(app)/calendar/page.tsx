import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Calendar" };

export default function Page() {
  return (
    <>
      <PageHeader title="Calendar" description="Everything planned, day by day." />
      <ComingSoon icon={CalendarDays} phase={6}>
        One calendar with chores, tasks, plans, reminders and leaves for both of you.
      </ComingSoon>
    </>
  );
}
