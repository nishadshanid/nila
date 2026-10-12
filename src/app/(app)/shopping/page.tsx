import type { Metadata } from "next";
import { ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Shopping" };

export default function Page() {
  return (
    <>
      <PageHeader title="Shopping" description="Things to buy, by urgency." />
      <ComingSoon icon={ShoppingCart} phase={4}>
        Add items as you notice them, grouped by today, this week, this month or someday.
      </ComingSoon>
    </>
  );
}
