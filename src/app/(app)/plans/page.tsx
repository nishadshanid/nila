import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { todayIST } from "@/lib/dates";
import { getHousehold } from "@/lib/household";
import { getTasks } from "@/lib/tasks";
import { TasksView, type Tab } from "./tasks-view";

export const metadata: Metadata = { title: "Plans" };

const TABS: Tab[] = ["plans", "mine", "couple"];

async function Plans({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [{ people }, tasks, { tab }] = await Promise.all([
    getHousehold(),
    getTasks(),
    searchParams,
  ]);
  const initialTab = TABS.find((t) => t === tab) ?? "plans";
  return (
    <TasksView
      key={initialTab}
      tasks={tasks}
      people={people}
      me={people[0]}
      today={todayIST()}
      initialTab={initialTab}
    />
  );
}

export default function PlansPage({ searchParams }: PageProps<"/plans">) {
  return (
    <>
      <PageHeader
        title="Plans"
        description="Outings, trips and visits, plus every todo. Add daily todos on Today."
      />
      <Suspense fallback={<div className="bg-muted h-40 animate-pulse rounded-xl" />}>
        <Plans searchParams={searchParams} />
      </Suspense>
    </>
  );
}
