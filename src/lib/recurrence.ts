import { addDays, daysInMonth, isoWeekday, type DateStr } from "@/lib/dates";
import type { RecurFreq } from "@/lib/types";

export type RecurrenceRule = {
  freq: RecurFreq;
  by_weekday: number[] | null;
  by_monthday: number | null;
  start_date: DateStr;
};

/** Whether the rule schedules something on `date`. Nothing happens before start_date. */
export function occursOn(rule: RecurrenceRule, date: DateStr): boolean {
  if (date < rule.start_date) return false;
  switch (rule.freq) {
    case "daily":
      return true;
    case "weekly":
      return rule.by_weekday?.includes(isoWeekday(date)) ?? false;
    case "monthly": {
      if (!rule.by_monthday) return false;
      // The 31st falls on the last day of shorter months.
      const day = Math.min(rule.by_monthday, daysInMonth(date));
      return Number(date.slice(8, 10)) === day;
    }
  }
}

/** Scheduled dates in [from, to], inclusive. */
export function datesInRange(rule: RecurrenceRule, from: DateStr, to: DateStr): DateStr[] {
  const dates: DateStr[] = [];
  for (let d = from < rule.start_date ? rule.start_date : from; d <= to; d = addDays(d, 1)) {
    if (occursOn(rule, d)) dates.push(d);
  }
  return dates;
}

/** How many scheduled dates fall in [from, before), i.e. strictly before `before`. */
export function countBefore(rule: RecurrenceRule, from: DateStr, before: DateStr): number {
  let count = 0;
  for (let d = from < rule.start_date ? rule.start_date : from; d < before; d = addDays(d, 1)) {
    if (occursOn(rule, d)) count++;
  }
  return count;
}

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ordinal(n: number) {
  const suffix =
    n % 10 === 1 && n !== 11
      ? "st"
      : n % 10 === 2 && n !== 12
        ? "nd"
        : n % 10 === 3 && n !== 13
          ? "rd"
          : "th";
  return `${n}${suffix}`;
}

/** "Every day", "Every Mon, Thu", "Monthly on the 1st". */
export function describeRule(rule: Pick<RecurrenceRule, "freq" | "by_weekday" | "by_monthday">) {
  switch (rule.freq) {
    case "daily":
      return "Every day";
    case "weekly": {
      const days = [...(rule.by_weekday ?? [])].sort((a, b) => a - b);
      if (days.length === 7) return "Every day";
      return `Every ${days.map((d) => WEEKDAY_SHORT[d - 1]).join(", ")}`;
    }
    case "monthly":
      return `Monthly on the ${ordinal(rule.by_monthday ?? 1)}`;
  }
}
