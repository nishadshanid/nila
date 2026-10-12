import type { Metadata } from "next";
import { CalendarOff } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Leave" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Leave"
        description="Away or sick days. Chores move to your partner automatically."
      />
      <ComingSoon icon={CalendarOff} phase={2}>
        Add leave or sick days, and your chores move to your partner for those days.
      </ComingSoon>
    </>
  );
}
