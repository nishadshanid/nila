import { Flame, HandHelping, ListChecks, Medal } from "lucide-react";
import { PersonDot } from "@/components/person-dot";
import { addDays, monthKeyIST, todayIST } from "@/lib/dates";
import { monthLabel, previousMonth } from "@/lib/points";
import { getAllLedger, getChoreDays } from "@/lib/points-data";
import { choreStreaks, monthlyStats, topItems } from "@/lib/stats";
import type { Person } from "@/lib/types";

const MONTHS = 6;
const STREAK_DAYS = 120;

function MonthChart({
  months,
  people,
  value,
}: {
  months: string[];
  people: Person[];
  value: (month: string, userId: string) => number;
}) {
  const max = Math.max(1, ...months.flatMap((m) => people.map((p) => value(m, p.id))));
  const groupW = 100 / months.length;
  const barW = (groupW * 0.7) / people.length;
  return (
    <figure>
      <svg
        viewBox="0 0 100 50"
        className="h-40 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Points per month"
      >
        {months.map((m, i) =>
          people.map((p, j) => {
            const v = value(m, p.id);
            const h = (v / max) * 46;
            return (
              <rect
                key={`${m}-${p.id}`}
                x={i * groupW + groupW * 0.15 + j * barW}
                y={48 - h}
                width={barW * 0.9}
                height={Math.max(h, v > 0 ? 0.6 : 0)}
                rx={0.6}
                fill={p.color}
              >
                <title>{`${p.name}, ${monthLabel(m)}: ${v}`}</title>
              </rect>
            );
          }),
        )}
        <line x1="0" x2="100" y1="48" y2="48" className="stroke-border" strokeWidth="0.3" />
      </svg>
      <figcaption
        className="text-muted-foreground mt-1 grid text-center text-[11px]"
        style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }}
      >
        {months.map((m) => (
          <span key={m}>{monthLabel(m, true).slice(0, 3)}</span>
        ))}
      </figcaption>
    </figure>
  );
}

export async function Stats({ people, meId }: { people: Person[]; meId: string }) {
  const today = todayIST();
  const current = monthKeyIST();
  const [ledger, choreDays] = await Promise.all([
    getAllLedger(),
    getChoreDays(
      people.map((p) => p.id),
      addDays(today, -STREAK_DAYS),
      today,
    ),
  ]);
  const stats = monthlyStats(ledger);
  const months = [current];
  while (months.length < MONTHS) months.unshift(previousMonth(months[0]));
  const now = (id: string) =>
    stats.get(current)?.get(id) ?? { points: 0, completions: 0, covers: 0 };
  const thisMonth = ledger.filter((r) => r.month === current);
  const name = (p: Person) => (p.id === meId ? "You" : p.name);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold">{monthLabel(current, true)} so far</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {people.map((p) => {
            const s = now(p.id);
            const streak = choreStreaks(choreDays.get(p.id) ?? [], today);
            return (
              <div key={p.id} className="rounded-xl border p-4">
                <p className="mb-3 flex items-center gap-2 font-medium">
                  <PersonDot profile={p} /> {name(p)}
                </p>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground flex items-center gap-1 text-xs">
                      <ListChecks className="size-3.5" /> Done
                    </dt>
                    <dd className="text-xl font-semibold tabular-nums">{s.completions}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground flex items-center gap-1 text-xs">
                      <HandHelping className="size-3.5" /> Covered
                    </dt>
                    <dd className="text-xl font-semibold tabular-nums">{s.covers}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Flame className="size-3.5 text-orange-500" /> Streak
                    </dt>
                    <dd className="text-xl font-semibold tabular-nums">
                      {streak.current}{" "}
                      <span className="text-muted-foreground text-xs font-normal">days</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Medal className="size-3.5 text-amber-500" /> Best streak
                    </dt>
                    <dd className="text-xl font-semibold tabular-nums">
                      {streak.best}{" "}
                      <span className="text-muted-foreground text-xs font-normal">days</span>
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          A streak is days in a row with all your chores done (together ones included). Days without
          chores don&apos;t break it.
        </p>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold">Points, last {MONTHS} months</h2>
        <div className="text-muted-foreground mb-2 flex gap-4 text-xs">
          {people.map((p) => (
            <span key={p.id} className="flex items-center gap-1">
              <PersonDot profile={p} /> {name(p)}
            </span>
          ))}
        </div>
        <MonthChart
          months={months}
          people={people}
          value={(m, id) => Math.max(0, stats.get(m)?.get(id)?.points ?? 0)}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Most done in {monthLabel(current, true)}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {people.map((p) => {
            const top = topItems(thisMonth, p.id);
            return (
              <div key={p.id} className="rounded-xl border p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <PersonDot profile={p} /> {name(p)}
                </p>
                {top.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nothing yet.</p>
                ) : (
                  <ol className="flex flex-col gap-1 text-sm">
                    {top.map((t) => (
                      <li key={t.title} className="flex justify-between gap-2">
                        <span className="truncate">{t.title}</span>
                        <span className="text-muted-foreground tabular-nums">×{t.count}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
