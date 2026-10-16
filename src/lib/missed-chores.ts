import type { DateStr } from "@/lib/dates";

type Row = { chore_id: string; assignee_id: string | null; date: DateStr };

/**
 * Folds pending chores from earlier days into today's list: one row per chore
 * and person. Today's row wins when there is one; otherwise the latest missed
 * row stands in. `missed` lists the earlier dates left undone, oldest first.
 */
export function withMissed<T extends Row>(
  todays: T[],
  earlier: T[],
): (T & { missed: DateStr[] })[] {
  const key = (r: Row) => `${r.chore_id}|${r.assignee_id ?? ""}`;
  const missedBy = new Map<string, T[]>();
  for (const r of [...earlier].sort((a, b) => a.date.localeCompare(b.date))) {
    const list = missedBy.get(key(r)) ?? [];
    list.push(r);
    missedBy.set(key(r), list);
  }

  const rows = todays.map((r) => {
    const missed = missedBy.get(key(r)) ?? [];
    missedBy.delete(key(r));
    return { ...r, missed: missed.map((m) => m.date) };
  });
  for (const list of missedBy.values()) {
    const latest = list[list.length - 1];
    rows.push({ ...latest, missed: list.map((m) => m.date) });
  }
  return rows;
}

/** "Missed yesterday", "Missed since Tue 14 Oct" or "Missed 3 times". */
export function missedLabel(missed: DateStr[], yesterday: DateStr, format: (d: DateStr) => string) {
  if (missed.length === 0) return null;
  if (missed.length === 1) {
    return missed[0] === yesterday ? "Missed yesterday" : `Missed since ${format(missed[0])}`;
  }
  return `Missed ${missed.length} times · since ${format(missed[0])}`;
}
