import type { Metadata } from "next";
import { ListTodo } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Tasks" };

export default function Page() {
  return (
    <>
      <PageHeader title="Tasks" description="Personal and couple todos and plans." />
      <ComingSoon icon={ListTodo} phase={3}>
        Personal todos only you can see, couple todos you both edit, and plans.
      </ComingSoon>
    </>
  );
}
