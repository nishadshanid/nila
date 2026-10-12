import { daysBetween, startOfWeek, type DateStr } from "@/lib/dates";
import { countBefore, datesInRange, type RecurrenceRule } from "@/lib/recurrence";
import type { Chore } from "@/lib/types";

export type ScheduledChore = RecurrenceRule &
  Pick<
    Chore,
    | "assignment_type"
    | "fixed_assignee"
    | "rotation_order"
    | "rotation_unit"
    | "times_per_day"
    | "slot_times"
  >;

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

/**
 * Who does the chore on `date` (and `slot`, for chores done several times a day).
 * Returns null for "together" chores (both of you).
 * - per_week: the turn changes every Monday, counted from the week of start_date.
 * - per_day: the turn changes every day the chore happens; all slots that day go to one person.
 * - per_occurrence: the turn changes every single time, slot by slot.
 */
export function assigneeFor(chore: ScheduledChore, date: DateStr, slot = 0): string | null {
  switch (chore.assignment_type) {
    case "fixed":
      return chore.fixed_assignee;
    case "together":
      return null;
    case "rotating": {
      const order = chore.rotation_order ?? [];
      if (order.length === 0) return null;
      let turn: number;
      switch (chore.rotation_unit) {
        case "per_week":
          turn = daysBetween(startOfWeek(chore.start_date), startOfWeek(date)) / 7;
          break;
        case "per_day":
          turn = countBefore(chore, chore.start_date, date);
          break;
        case "per_occurrence":
          turn = countBefore(chore, chore.start_date, date) * chore.times_per_day + slot;
          break;
      }
      return order[mod(turn, order.length)];
    }
  }
}

export type PlannedOccurrence = {
  date: DateStr;
  slot: number;
  due_time: string | null;
  assignee_id: string | null;
};

/** Every occurrence of the chore in [from, to], slot by slot, with its assignee. */
export function planOccurrences(
  chore: ScheduledChore,
  from: DateStr,
  to: DateStr,
): PlannedOccurrence[] {
  return datesInRange(chore, from, to).flatMap((date) =>
    Array.from({ length: chore.times_per_day }, (_, slot) => ({
      date,
      slot,
      due_time: chore.slot_times?.[slot] ?? null,
      assignee_id: assigneeFor(chore, date, slot),
    })),
  );
}
