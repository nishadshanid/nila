import { Suspense } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { UserChip } from "@/components/nav/user-chip";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-6 border-r p-4 md:flex">
        <Link href="/" className="px-3 text-xl font-semibold tracking-tight">
          Nila
        </Link>
        <Sidebar />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/95 sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur">
          <Link href="/" className="text-lg font-semibold tracking-tight md:invisible">
            Nila
          </Link>
          <Suspense fallback={<div className="bg-muted h-8 w-40 animate-pulse rounded" />}>
            <UserChip />
          </Suspense>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 pb-24 md:pb-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
