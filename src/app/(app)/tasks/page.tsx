import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { todayIST } from "@/lib/dates";
import { getHousehold } from "@/lib/household";
import { getTasks } from "@/lib/tasks";
import { TasksView } from "./tasks-view";

export const metadata: Metadata = { title: "Tasks" };

async function Tasks() {
  const [{ people }, tasks] = await Promise.all([getHousehold(), getTasks()]);
  return <TasksView tasks={tasks} people={people} me={people[0]} today={todayIST()} />;
}

export default function TasksPage() {
  return (
    <>
      <PageHeader title="Tasks" description="Private todos, couple todos and plans." />
      <Suspense fallback={<div className="bg-muted h-40 animate-pulse rounded-xl" />}>
        <Tasks />
      </Suspense>
    </>
  );
}
