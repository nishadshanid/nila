import { addDays, type DateStr } from "@/lib/dates";

export type LedgerEntry = {
  user_id: string;
  source_id: string;
  title: string;
  points: number;
  reason: "completed" | "cover_bonus" | "reversed";
  month: string;
};

export type MonthStats = {
  points: number;
  /** Things finished (undone ones don't count). */
  completions: number;
  /** Times you covered for your partner. */
  covers: number;
};

/**
 * Per month and person: points, completions and covers, from the ledger.
 * An item counts once if it's still done (its rows net to more than zero).
 */
export function monthlyStats(rows: LedgerEntry[]): Map<string, Map<string, MonthStats>> {
  type Acc = { completed: number; bonus: number; total: number };
  const items = new Map<string, Acc>();
  const byMonth = new Map<string, Map<string, MonthStats>>();
  const statsFor = (month: string, user: string) => {
    const users = byMonth.get(month) ?? new Map<string, MonthStats>();
    byMonth.set(month, users);
    const s = users.get(user) ?? { points: 0, completions: 0, covers: 0 };
    users.set(user, s);
    return s;
  };

  // Reversals carry no reason of their own, so net each item's rows: a cover is an
  // item whose total is more than its "completed" share.
  for (const r of rows) {
    statsFor(r.month, r.user_id).points += r.points;
    const key = `${r.month}|${r.user_id}|${r.source_id}`;
    const acc = items.get(key) ?? { completed: 0, bonus: 0, total: 0 };
    if (r.reason === "completed") acc.completed += r.points;
    if (r.reason === "cover_bonus") acc.bonus += r.points;
    acc.total += r.points;
    items.set(key, acc);
  }
  for (const [key, acc] of items) {
    if (acc.total <= 0) continue;
    const [month, user] = key.split("|");
    const s = statsFor(month, user);
    s.completions++;
    if (acc.bonus > 0) s.covers++;
  }
  return byMonth;
}

/** The person's most-done items (still done), most first. */
export function topItems(rows: LedgerEntry[], userId: string, limit = 5) {
  const net = new Map<string, { title: string; points: number }>();
  for (const r of rows) {
    if (r.user_id !== userId) continue;
    const item = net.get(r.source_id) ?? { title: r.title, points: 0 };
    item.points += r.points;
    net.set(r.source_id, item);
  }
  const counts = new Map<string, number>();
  for (const { title, points } of net.values()) {
    if (points > 0) counts.set(title, (counts.get(title) ?? 0) + 1);
  }
  return [...counts]
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export type DayChores = { date: DateStr; total: number; done: number };

/**
 * Streaks of days where you did all your chores. Days without chores don't
 * break a streak (or add to it). Today only counts once it's complete, so an
 * unfinished today doesn't break yesterday's streak.
 */
export function choreStreaks(days: DayChores[], today: DateStr) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const first = days.reduce<DateStr | null>(
    (min, d) => (!min || d.date < min ? d.date : min),
    null,
  );

  let current = 0;
  let countingCurrent = true;
  let best = 0;
  let run = 0;
  if (!first) return { current: 0, best: 0 };

  for (let d = today; d >= first; d = addDays(d, -1)) {
    const day = byDate.get(d);
    if (!day || day.total === 0) continue;
    const complete = day.done >= day.total;
    if (d === today && !complete) continue;
    if (complete) {
      run++;
      if (countingCurrent) current = run;
      best = Math.max(best, run);
    } else {
      countingCurrent = false;
      run = 0;
    }
  }
  return { current, best };
}
