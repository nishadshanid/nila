import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { Crown, Trophy } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PersonDot } from "@/components/person-dot";
import { formatDay, monthKeyIST, toISTDate } from "@/lib/dates";
import { getHousehold } from "@/lib/household";
import { leaderOf, monthLabel, type Score } from "@/lib/points";
import { getAllScores, getLedger, getRewards, type LedgerRow } from "@/lib/points-data";
import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RewardForm } from "./reward-form";
import { Stats } from "./stats";

export const metadata: Metadata = { title: "Points" };

const totalOf = (scores: Score[], id: string) => scores.find((s) => s.user_id === id)?.total ?? 0;
const nameOf = (p: Person, meId: string) => (p.id === meId ? "You" : p.name);

function Scoreboard({
  month,
  current,
  scores,
  people,
  meId,
  reward,
}: {
  month: string;
  current: boolean;
  scores: Score[];
  people: Person[];
  meId: string;
  reward: string | null;
}) {
  const leader = leaderOf(scores);
  const leaderPerson = people.find((p) => p.id === leader);
  const max = Math.max(1, ...people.map((p) => totalOf(scores, p.id)));
  const anyPoints = scores.some((s) => s.total !== 0);
  const status = current ? "leading" : "the winner";

  return (
    <section className="mb-8 rounded-xl border p-4">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{monthLabel(month)}</h2>
        <p className="text-muted-foreground text-sm">
          {!anyPoints
            ? "No points yet"
            : leaderPerson
              ? `${leaderPerson.id === meId ? "You're" : `${leaderPerson.name} is`} ${status}`
              : "It's a tie"}
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {people.map((p) => {
          const total = totalOf(scores, p.id);
          return (
            <li key={p.id}>
              <div className="mb-1 flex items-center gap-2 text-sm">
                <PersonDot profile={p} />
                <span className="font-medium">{nameOf(p, meId)}</span>
                {p.id === leader && <Crown className="size-4 text-amber-500" />}
                <span className="ml-auto font-semibold tabular-nums">{total}</span>
              </div>
              <div className="bg-muted h-3 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(0, (total / max) * 100)}%`,
                    backgroundColor: p.color,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 border-t pt-3">
        {current ? (
          <RewardForm month={month} reward={reward} />
        ) : (
          reward && (
            <p className="text-muted-foreground text-sm">
              Reward: <span className="text-foreground">{reward}</span>
            </p>
          )
        )}
      </div>
    </section>
  );
}

const REASON: Record<LedgerRow["reason"], string | null> = {
  completed: null,
  cover_bonus: "covering bonus",
  reversed: "undone",
};

function Activity({ rows, people, meId }: { rows: LedgerRow[]; people: Person[]; meId: string }) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
        Tick off chores and couple todos to earn points. Private todos don&apos;t count.
      </p>
    );
  }
  const days = Map.groupBy(rows, (r) => toISTDate(r.earned_at));
  return (
    <div className="flex flex-col gap-4">
      {[...days].map(([day, dayRows]) => (
        <section key={day}>
          <h3 className="text-muted-foreground mb-1 text-xs font-semibold">
            {formatDay(day, "EEE, d MMM")}
          </h3>
          <ul className="divide-y rounded-xl border">
            {dayRows.map((r) => {
              const person = people.find((p) => p.id === r.user_id);
              const why = REASON[r.reason];
              return (
                <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  {person && <PersonDot profile={person} />}
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-muted-foreground">
                      {person ? nameOf(person, meId) : "Someone"} ·{" "}
                    </span>
                    {r.title}
                    {why && <span className="text-muted-foreground"> ({why})</span>}
                  </span>
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      r.points > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
                    )}
                  >
                    {r.points > 0 ? `+${r.points}` : r.points}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function History({
  months,
  people,
  meId,
  rewards,
  selected,
}: {
  months: { month: string; scores: Score[] }[];
  people: Person[];
  meId: string;
  rewards: Map<string, string>;
  selected: string;
}) {
  if (months.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-2 text-sm font-semibold">Past months</h2>
      <ul className="divide-y rounded-xl border">
        {months.map(({ month, scores }) => {
          const winner = people.find((p) => p.id === leaderOf(scores));
          return (
            <li key={month}>
              <Link
                href={`/points?month=${month}`}
                aria-current={month === selected ? "page" : undefined}
                className={cn(
                  "hover:bg-muted flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm",
                  month === selected && "bg-muted",
                )}
              >
                <span className="w-28 font-medium">{monthLabel(month)}</span>
                {people.map((p) => (
                  <span key={p.id} className="inline-flex items-center gap-1 tabular-nums">
                    <PersonDot profile={p} /> {totalOf(scores, p.id)}
                  </span>
                ))}
                <span className="text-muted-foreground ml-auto inline-flex items-center gap-1">
                  {winner ? (
                    <>
                      <Trophy className="size-3.5 text-amber-500" /> {nameOf(winner, meId)}
                    </>
                  ) : (
                    "Tie"
                  )}
                  {rewards.get(month) && ` · ${rewards.get(month)}`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Tabs({ tab }: { tab: "scores" | "stats" }) {
  const tabs = [
    { value: "scores", label: "Scoreboard", href: "/points" },
    { value: "stats", label: "Stats", href: "/points?tab=stats" },
  ];
  return (
    <nav aria-label="Points view" className="bg-muted mb-6 flex rounded-lg p-1">
      {tabs.map((t) => (
        <Link
          key={t.value}
          href={t.href}
          aria-current={tab === t.value ? "page" : undefined}
          className={cn(
            "text-muted-foreground flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors",
            tab === t.value && "bg-background text-foreground shadow-sm",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

async function Points({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; tab?: string }>;
}) {
  const params = await searchParams;
  // The current month depends on the clock: render per visit, not ahead of time.
  await connection();
  if (params.tab === "stats") {
    const { me, people } = await getHousehold();
    return (
      <>
        <Tabs tab="stats" />
        <Stats people={people} meId={me.id} />
      </>
    );
  }
  const current = monthKeyIST();
  const month =
    params.month && /^\d{4}-\d{2}$/.test(params.month) && params.month <= current
      ? params.month
      : current;
  const [{ me, people }, all, ledger, rewards] = await Promise.all([
    getHousehold(),
    getAllScores(),
    getLedger(month),
    getRewards(),
  ]);
  const scoresFor = (m: string) => all.find((s) => s.month === m)?.scores ?? [];
  const past = all.filter((s) => s.month < current);

  return (
    <>
      <Tabs tab="scores" />
      {month !== current && (
        <Link href="/points" className="text-muted-foreground mb-3 inline-block text-sm underline">
          ← Back to {monthLabel(current, true)}
        </Link>
      )}
      <Scoreboard
        month={month}
        current={month === current}
        scores={scoresFor(month)}
        people={people}
        meId={me.id}
        reward={rewards.get(month) ?? null}
      />
      <History months={past} people={people} meId={me.id} rewards={rewards} selected={month} />
      <h2 className="mb-2 text-sm font-semibold">Activity in {monthLabel(month, true)}</h2>
      <Activity rows={ledger} people={people} meId={me.id} />
    </>
  );
}

export default function PointsPage({ searchParams }: PageProps<"/points">) {
  return (
    <>
      <PageHeader
        title="Points"
        description="Chores and couple todos earn points. Scores start fresh each month."
      />
      <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl" />}>
        <Points searchParams={searchParams} />
      </Suspense>
    </>
  );
}
