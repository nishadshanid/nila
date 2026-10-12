import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Reminders" };

export default function Page() {
  return (
    <>
      <PageHeader title="Reminders" description="Birthdays, calls and other recurring reminders." />
      <ComingSoon icon={Bell} phase={3}>
        Birthdays, anniversaries, calling parents and custom recurring reminders.
      </ComingSoon>
    </>
  );
}
