import {
  addDays,
  daysBetween,
  daysInMonth,
  isoWeekday,
  startOfWeek,
  type DateStr,
} from "@/lib/dates";
import type { RecurFreq } from "@/lib/types";

export type RecurrenceRule = {
  freq: RecurFreq;
  /** Daily only: every N days, counted from start_date. 1 = every day, 2 = alternate days. */
  interval_days: number;
  by_weekday: number[] | null;
  /** 1–31, or -1 for the last day of the month. */
  by_monthday: number | null;
  /**
   * Flexible chores: N times per week (freq "weekly") or per month (freq "monthly"),
   * on any days. They're never scheduled on specific dates.
   */
  flex_target?: number | null;
  start_date: DateStr;
};

export function isFlexible(rule: Pick<RecurrenceRule, "flex_target">) {
  return rule.flex_target != null;
}

/** The week (Mon–Sun) or calendar month that `date` falls in, for flexible chores. */
export function flexPeriod(freq: RecurFreq, date: DateStr): { from: DateStr; to: DateStr } {
  if (freq === "monthly") {
    const from = `${date.slice(0, 8)}01`;
    return { from, to: `${date.slice(0, 8)}${String(daysInMonth(date)).padStart(2, "0")}` };
  }
  const from = startOfWeek(date);
  return { from, to: addDays(from, 6) };
}

/** Whether the rule schedules something on `date`. Nothing happens before start_date. */
export function occursOn(rule: RecurrenceRule, date: DateStr): boolean {
  if (date < rule.start_date || isFlexible(rule)) return false;
  switch (rule.freq) {
    case "daily":
      return daysBetween(rule.start_date, date) % Math.max(1, rule.interval_days) === 0;
    case "weekly":
      return rule.by_weekday?.includes(isoWeekday(date)) ?? false;
    case "monthly": {
      if (!rule.by_monthday) return false;
      // -1 means the last day; the 31st also falls on the last day of shorter months.
      const last = daysInMonth(date);
      const day = rule.by_monthday === -1 ? last : Math.min(rule.by_monthday, last);
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

function timesLabel(n: number) {
  return n === 1 ? "Once" : n === 2 ? "Twice" : `${n} times`;
}

/** "Every day", "Every Mon, Thu", "Monthly on the 1st", "4 times a week". */
export function describeRule(
  rule: Pick<
    RecurrenceRule,
    "freq" | "interval_days" | "by_weekday" | "by_monthday" | "flex_target"
  >,
) {
  if (rule.flex_target != null) {
    return `${timesLabel(rule.flex_target)} a ${rule.freq === "monthly" ? "month" : "week"}`;
  }
  switch (rule.freq) {
    case "daily":
      if (rule.interval_days <= 1) return "Every day";
      if (rule.interval_days === 2) return "Every other day";
      return `Every ${rule.interval_days} days`;
    case "weekly": {
      const days = [...(rule.by_weekday ?? [])].sort((a, b) => a - b);
      if (days.length === 7) return "Every day";
      return `Every ${days.map((d) => WEEKDAY_SHORT[d - 1]).join(", ")}`;
    }
    case "monthly":
      return rule.by_monthday === -1
        ? "Monthly on the last day"
        : `Monthly on the ${ordinal(rule.by_monthday ?? 1)}`;
  }
}
