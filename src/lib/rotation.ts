import { daysBetween, startOfWeek, type DateStr } from "@/lib/dates";
import { countBefore, datesInRange, type RecurrenceRule } from "@/lib/recurrence";
import type { Chore } from "@/lib/types";

export type ScheduledChore = RecurrenceRule &
  Pick<Chore, "assignment_type" | "fixed_assignee" | "rotation_order" | "rotation_unit">;

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

/**
 * Who does the chore on `date`. Returns null for "together" chores (both of you).
 * - per_week: the turn changes every Monday, counted from the week of start_date.
 * - per_occurrence: the turn changes every time the chore happens.
 */
export function assigneeFor(chore: ScheduledChore, date: DateStr): string | null {
  switch (chore.assignment_type) {
    case "fixed":
      return chore.fixed_assignee;
    case "together":
      return null;
    case "rotating": {
      const order = chore.rotation_order ?? [];
      if (order.length === 0) return null;
      const turn =
        chore.rotation_unit === "per_week"
          ? daysBetween(startOfWeek(chore.start_date), startOfWeek(date)) / 7
          : countBefore(chore, chore.start_date, date);
      return order[mod(turn, order.length)];
    }
  }
}

export type PlannedOccurrence = { date: DateStr; assignee_id: string | null };

/** Every occurrence of the chore in [from, to] with its assignee. */
export function planOccurrences(
  chore: ScheduledChore,
  from: DateStr,
  to: DateStr,
): PlannedOccurrence[] {
  return datesInRange(chore, from, to).map((date) => ({
    date,
    assignee_id: assigneeFor(chore, date),
  }));
}
