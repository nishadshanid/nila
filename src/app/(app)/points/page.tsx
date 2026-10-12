import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Points" };

export default function Page() {
  return (
    <>
      <PageHeader title="Points" description="Monthly scoreboard." />
      <ComingSoon icon={Trophy} phase={5}>
        Earn points for chores and couple tasks, and see who wins each month.
      </ComingSoon>
    </>
  );
}
