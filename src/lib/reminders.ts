import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DateStr } from "@/lib/dates";
import { reminderOnDay } from "@/lib/reminder-schedule";
import type { Reminder } from "@/lib/types";

export async function getReminders(): Promise<Reminder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .order("active", { ascending: false })
    .order("type")
    .order("title");
  if (error) throw new Error(`Could not load reminders: ${error.message}`);
  return data as Reminder[];
}

export type DayReminder = {
  reminder: Reminder;
  /** When it actually happens (later than the viewed day for heads-ups). */
  date: DateStr;
  inDays: number;
  /** Ticked off for that date. */
  acked: boolean;
};

/** Reminders happening on `date`, plus heads-ups for ones coming up within their lead days. */
export async function getRemindersForDay(date: DateStr): Promise<DayReminder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("reminders").select("*").eq("active", true);
  if (error) throw new Error(`Could not load reminders: ${error.message}`);

  const items = (data as Reminder[]).flatMap((reminder) => {
    const hit = reminderOnDay(reminder, date);
    return hit ? [{ reminder, ...hit }] : [];
  });
  if (items.length === 0) return [];

  const { data: acks, error: ackError } = await supabase
    .from("reminder_acks")
    .select("reminder_id, date")
    .in(
      "reminder_id",
      items.map((i) => i.reminder.id),
    );
  if (ackError) throw new Error(`Could not load reminders: ${ackError.message}`);

  return items
    .map((i) => ({
      ...i,
      acked: acks.some((a) => a.reminder_id === i.reminder.id && a.date === i.date),
    }))
    .sort(
      (a, b) =>
        a.inDays - b.inDays ||
        (a.reminder.time ?? "99").localeCompare(b.reminder.time ?? "99") ||
        a.reminder.title.localeCompare(b.reminder.title),
    );
}
