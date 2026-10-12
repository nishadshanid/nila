import type { Priority } from "@/lib/types";

export type PointRules = { low: number; med: number; high: number; cover_bonus: number };

export const DEFAULT_RULES: PointRules = { low: 1, med: 3, high: 5, cover_bonus: 1 };

/** What finishing an item is worth: its own points, or its priority's. */
export function pointsFor(
  item: { priority: Priority; points?: number | null },
  rules: PointRules,
): number {
  return item.points ?? rules[item.priority];
}

/** Whether ticking this task earns points: only couple todos do. */
export function taskEarnsPoints(task: { kind: string; visibility: string }) {
  return task.kind === "todo" && task.visibility === "couple";
}

export type Score = { user_id: string; total: number };

/** The leader's id, or null for a tie or when nobody has scored. */
export function leaderOf(scores: Score[]): string | null {
  const sorted = [...scores].sort((a, b) => b.total - a.total);
  if (sorted.length === 0 || sorted[0].total <= 0) return null;
  if (sorted.length > 1 && sorted[1].total === sorted[0].total) return null;
  return sorted[0].user_id;
}

/** "2026-10" → "October 2026" (or just "October" when `short`). */
export function monthLabel(month: string, short = false): string {
  const [y, m] = month.split("-").map(Number);
  const name = new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-IN", {
    month: "long",
    timeZone: "UTC",
  });
  return short ? name : `${name} ${y}`;
}

/** "2026-10" → "2026-09" */
export function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}
