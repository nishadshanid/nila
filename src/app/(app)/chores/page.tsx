import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getChores } from "@/lib/chores";
import { todayIST } from "@/lib/dates";
import { getHousehold } from "@/lib/household";
import { ChoreList } from "./chore-list";

export const metadata: Metadata = { title: "Chores" };

async function Chores() {
  const [{ people }, chores] = await Promise.all([getHousehold(), getChores()]);
  return <ChoreList chores={chores} people={people} me={people[0]} today={todayIST()} />;
}

export default function ChoresPage() {
  return (
    <>
      <PageHeader title="Chores" description="Fixed, rotating and together chores." />
      <Suspense fallback={<div className="bg-muted h-40 animate-pulse rounded-xl" />}>
        <Chores />
      </Suspense>
    </>
  );
}
