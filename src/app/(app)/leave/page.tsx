import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { todayIST } from "@/lib/dates";
import { getHousehold } from "@/lib/household";
import { getCoverCounts, getLeaves } from "@/lib/leaves";
import { LeaveList } from "./leave-list";

export const metadata: Metadata = { title: "Leave" };

async function Leaves() {
  const [{ people }, leaves, covers] = await Promise.all([
    getHousehold(),
    getLeaves(),
    getCoverCounts(),
  ]);
  return (
    <LeaveList leaves={leaves} people={people} me={people[0]} today={todayIST()} covers={covers} />
  );
}

export default function LeavePage() {
  return (
    <>
      <PageHeader
        title="Leave"
        description="Away or sick days. Shared chores move to the other person; your own chores pause."
      />
      <Suspense fallback={<div className="bg-muted h-40 animate-pulse rounded-xl" />}>
        <Leaves />
      </Suspense>
    </>
  );
}
