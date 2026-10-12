import { addDays, toISTDate, type DateStr } from "@/lib/dates";

/**
 * How far back a tick looks. Ticks run every 15 minutes; looking back 30 means
 * one missed tick is caught up by the next. The notification log stops repeats.
 */
export const WINDOW_MIN = 30;

const MIN = 60_000;

/** The instant of an IST date and "HH:MM[:SS]" time. */
export function istInstant(date: DateStr, time: string): number {
  const hhmmss = time.length === 5 ? `${time}:00` : time.slice(0, 8);
  return Date.parse(`${date}T${hhmmss}+05:30`);
}

/** Whether `at` falls in this tick's window: (now − window, now]. */
export function inWindow(at: number, now: number, windowMin = WINDOW_MIN): boolean {
  return at > now - windowMin * MIN && at <= now;
}

/** When to remind about something due at `date` `time`, `beforeMin` minutes early. */
export function reminderAt(date: DateStr, time: string, beforeMin: number): number {
  return istInstant(date, time) - beforeMin * MIN;
}

/**
 * Dates whose items could be due for a reminder in this tick: today, and
 * tomorrow when a reminder can be up to a day early. Covers a window that
 * crosses midnight too.
 */
export function candidateDates(now: number, maxBeforeMin: number): DateStr[] {
  const today = toISTDate(now);
  const earliest = toISTDate(now - WINDOW_MIN * MIN);
  const latest = toISTDate(now + maxBeforeMin * MIN);
  const dates: DateStr[] = [];
  for (let d = earliest; d <= latest; d = addDays(d, 1)) dates.push(d);
  return dates.length ? dates : [today];
}

/** Whether this tick should send the daily digest for someone who wants it at `digestTime`. */
export function digestDue(digestTime: string, now: number): DateStr | null {
  const today = toISTDate(now);
  if (inWindow(istInstant(today, digestTime), now)) return today;
  // A digest time just before midnight, caught by the first tick after it.
  const yesterday = addDays(today, -1);
  if (inWindow(istInstant(yesterday, digestTime), now)) return yesterday;
  return null;
}

/**
 * On the 1st from 08:00 IST, the month to summarise ("YYYY-MM"), else null.
 * Any tick that day after 08:00 qualifies; the log makes it send once.
 */
export function monthlySummaryDue(now: number): string | null {
  const today = toISTDate(now);
  if (!today.endsWith("-01") || now < istInstant(today, "08:00")) return null;
  return toISTDate(Date.parse(`${today}T00:00:00+05:30`) - MIN).slice(0, 7);
}
