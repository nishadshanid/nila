import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { todayIST } from "@/lib/dates";
import { getHousehold } from "@/lib/household";
import { getShoppingItems, pastNames } from "@/lib/shopping";
import { ShoppingView } from "./shopping-view";

export const metadata: Metadata = { title: "Shopping" };

async function Shopping() {
  const [{ me, people }, items] = await Promise.all([getHousehold(), getShoppingItems()]);
  return (
    <ShoppingView
      items={items}
      names={pastNames(items)}
      people={people}
      me={me}
      today={todayIST()}
    />
  );
}

export default function ShoppingPage() {
  return (
    <>
      <PageHeader title="Shopping" description="Things to buy, shared by both of you." />
      <Suspense fallback={<div className="bg-muted h-40 animate-pulse rounded-xl" />}>
        <Shopping />
      </Suspense>
    </>
  );
}
