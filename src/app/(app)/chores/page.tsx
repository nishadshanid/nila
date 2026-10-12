import type { Metadata } from "next";
import { WashingMachine } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Chores" };

export default function Page() {
  return (
    <>
      <PageHeader title="Chores" description="Fixed and rotating household chores." />
      <ComingSoon icon={WashingMachine} phase={1}>
        Set up laundry, cooking, waste and more: fixed to one person, rotating weekly, or done
        together.
      </ComingSoon>
    </>
  );
}
