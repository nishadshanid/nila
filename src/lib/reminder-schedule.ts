import { addDays, daysBetween, daysInMonth, type DateStr } from "@/lib/dates";
import { describeRule, occursOn } from "@/lib/recurrence";
import type { Reminder } from "@/lib/types";

export type ReminderRule = Pick<
  Reminder,
  "freq" | "start_date" | "interval_days" | "by_weekday" | "by_monthday"
>;

/** Whether the reminder happens on `date`. */
export function reminderOccursOn(rule: ReminderRule, date: DateStr): boolean {
  if (date < rule.start_date) return false;
  switch (rule.freq) {
    case "once":
      return date === rule.start_date;
    case "yearly": {
      const month = rule.start_date.slice(5, 7);
      const day = Number(rule.start_date.slice(8, 10));
      if (date.slice(5, 7) !== month) return false;
      // A 29 Feb birthday is celebrated on 28 Feb in other years.
      return Number(date.slice(8, 10)) === Math.min(day, daysInMonth(date));
    }
    default:
      return occursOn({ ...rule, freq: rule.freq, flex_target: null }, date);
  }
}

/** The first date on or after `from` the reminder happens, within a year. */
export function nextOccurrence(rule: ReminderRule, from: DateStr): DateStr | null {
  const start = from < rule.start_date ? rule.start_date : from;
  for (let d = start, i = 0; i <= 366; d = addDays(d, 1), i++) {
    if (reminderOccursOn(rule, d)) return d;
  }
  return null;
}

/**
 * What to show on `date`: the reminder itself if it's today, or an
 * "in N days" heads-up if it falls within its lead time.
 */
export function reminderOnDay(
  rule: ReminderRule & Pick<Reminder, "lead_days">,
  date: DateStr,
): { date: DateStr; inDays: number } | null {
  if (reminderOccursOn(rule, date)) return { date, inDays: 0 };
  if (rule.lead_days <= 0) return null;
  const next = nextOccurrence(rule, addDays(date, 1));
  if (!next) return null;
  const inDays = daysBetween(date, next);
  return inDays <= rule.lead_days ? { date: next, inDays } : null;
}

/** "Every year on 14 Mar", "Once", or the chore-style description. */
export function describeReminder(rule: ReminderRule, formatDate: (d: DateStr) => string) {
  switch (rule.freq) {
    case "once":
      return `Once, on ${formatDate(rule.start_date)}`;
    case "yearly":
      return `Every year on ${formatDate(rule.start_date)}`;
    default:
      return describeRule({ ...rule, freq: rule.freq, flex_target: null });
  }
}

/** Age or years married on `date`, when the start year is a real one. */
export function yearsSince(start: DateStr, date: DateStr) {
  const years = Number(date.slice(0, 4)) - Number(start.slice(0, 4));
  return years > 0 ? years : null;
}
