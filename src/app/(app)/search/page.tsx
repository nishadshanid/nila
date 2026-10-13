import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  CalendarHeart,
  ListTodo,
  Lock,
  Search as SearchIcon,
  ShoppingCart,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { describeRule } from "@/lib/recurrence";
import { describeReminder } from "@/lib/reminder-schedule";
import { formatDay, toISTDate } from "@/lib/dates";
import { search } from "@/lib/search";
import { formatQty } from "@/lib/shopping-parse";
import { urgencyMeta } from "@/lib/shopping-meta";

export const metadata: Metadata = { title: "Search" };

type Hit = {
  key: string;
  title: string;
  detail: string | null;
  href: string;
  done?: boolean;
  personal?: boolean;
};

function Group({ title, icon: Icon, hits }: { title: string; icon: LucideIcon; hits: Hit[] }) {
  if (hits.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className="text-muted-foreground mb-1 flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4" /> {title}
      </h2>
      <ul className="divide-y rounded-xl border">
        {hits.map((h) => (
          <li key={h.key}>
            <Link href={h.href} className="hover:bg-muted flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span
                  className={
                    h.done ? "text-muted-foreground block truncate line-through" : "block truncate"
                  }
                >
                  {h.title}
                </span>
                {h.detail && (
                  <span className="text-muted-foreground block truncate text-xs">{h.detail}</span>
                )}
              </span>
              {h.personal && <Lock className="text-muted-foreground size-3.5 shrink-0" />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function Results({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const found = await search(q);
  if (!found) {
    return (
      <p className="text-muted-foreground text-sm">
        Type at least two letters to search todos, plans, reminders, shopping and chores.
      </p>
    );
  }
  const day = (d: string | null) => (d ? formatDay(d, "EEE, d MMM") : null);

  const todos: Hit[] = found.tasks
    .filter((t) => t.kind === "todo")
    .map((t) => ({
      key: t.id,
      title: t.title,
      detail: [day(t.date) ?? "No date", t.status === "done" ? "done" : null]
        .filter(Boolean)
        .join(" · "),
      href: t.date
        ? `/?date=${t.date}`
        : `/plans?tab=${t.visibility === "couple" ? "couple" : "mine"}`,
      done: t.status === "done",
      personal: t.visibility === "personal",
    }));
  const plans: Hit[] = found.tasks
    .filter((t) => t.kind === "plan")
    .map((t) => ({
      key: t.id,
      title: t.title,
      detail: t.end_date ? `${day(t.date)} – ${day(t.end_date)}` : day(t.date),
      href: t.date ? `/?date=${t.date}` : "/plans",
      personal: t.visibility === "personal",
    }));
  const reminders: Hit[] = found.reminders.map((r) => ({
    key: r.id,
    title: r.title,
    detail: describeReminder(r, (d) => formatDay(d, "d MMM yyyy")),
    href: "/reminders",
    personal: r.visibility === "personal",
  }));
  const shopping: Hit[] = found.shopping.map((i) => ({
    key: i.id,
    title: [i.name, formatQty(i.qty, i.unit)].filter(Boolean).join(" · "),
    detail:
      i.status === "needed"
        ? `To buy · ${urgencyMeta(i.urgency).label.toLowerCase()}`
        : `Bought ${i.bought_at ? formatDay(toISTDate(i.bought_at), "d MMM") : ""}`,
    href: "/shopping",
    done: i.status === "bought",
  }));
  const chores: Hit[] = found.chores.map((c) => ({
    key: c.id,
    title: c.title,
    detail: [describeRule(c), c.active ? null : "paused"].filter(Boolean).join(" · "),
    href: "/chores",
    personal: c.assignment_type === "fixed",
  }));

  const total = todos.length + plans.length + reminders.length + shopping.length + chores.length;
  if (total === 0) {
    return (
      <p className="text-muted-foreground text-sm">Nothing matches &ldquo;{found.q}&rdquo;.</p>
    );
  }
  return (
    <>
      <Group title="Todos" icon={ListTodo} hits={todos} />
      <Group title="Plans" icon={CalendarHeart} hits={plans} />
      <Group title="Reminders" icon={Bell} hits={reminders} />
      <Group title="Shopping" icon={ShoppingCart} hits={shopping} />
      <Group title="Chores" icon={WashingMachine} hits={chores} />
    </>
  );
}

async function SearchBox({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  return (
    <form action="/search" className="relative mb-6">
      <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Search everything…"
        aria-label="Search"
        className="pl-9"
        autoFocus
        enterKeyHint="search"
      />
    </form>
  );
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <PageHeader title="Search" />
      <Suspense fallback={<div className="bg-muted mb-6 h-9 animate-pulse rounded-md" />}>
        <SearchBox searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<div className="bg-muted h-40 animate-pulse rounded-xl" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </>
  );
}
