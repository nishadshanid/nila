import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getChores } from "@/lib/chores";
import { todayIST } from "@/lib/dates";
import { getHousehold } from "@/lib/household";
import { getPointRules } from "@/lib/points-data";
import { PointRulesProvider } from "@/components/points/rules-context";
import { ChoreList } from "./chore-list";

export const metadata: Metadata = { title: "Chores" };

async function Chores() {
  const [{ people }, chores, rules] = await Promise.all([
    getHousehold(),
    getChores(),
    getPointRules(),
  ]);
  return (
    <PointRulesProvider rules={rules}>
      <ChoreList chores={chores} people={people} me={people[0]} today={todayIST()} />
    </PointRulesProvider>
  );
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
