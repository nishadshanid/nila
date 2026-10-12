import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getChores } from "@/lib/chores";
import { todayIST } from "@/lib/dates";
import { getHousehold } from "@/lib/household";
import {
  byDay,
  choreItems,
  leaveItems,
  monthGrid,
  reminderItems,
  taskItems,
  type CalItem,
} from "@/lib/calendar-items";
import type { Chore, ChoreOccurrence, Leave, Reminder, Task } from "@/lib/types";

/** Everything on the calendar for a month's grid (including the edge weeks). */
export async function getCalendarMonth(month: string) {
  const { from, to, days } = monthGrid(month);
  const today = todayIST();
  const supabase = await createClient();
  const [{ me, partner, people }, chores, rows, tasks, reminders, acks, leaves] = await Promise.all(
    [
      getHousehold(),
      getChores(),
      supabase
        .from("chore_occurrences")
        .select("*, chore:chores!inner(*)")
        .gte("date", from)
        .lte("date", to),
      // Todos due in range, and plans that overlap it. RLS hides your partner's private ones.
      supabase
        .from("tasks")
        .select("*")
        .not("date", "is", null)
        .lte("date", to)
        .or(`date.gte.${from},end_date.gte.${from}`),
      supabase.from("reminders").select("*").eq("active", true),
      supabase.from("reminder_acks").select("reminder_id, date").gte("date", from).lte("date", to),
      supabase
        .from("leaves")
        .select("*")
        .lte("start_date", to)
        .gte("end_date", from)
        .order("start_date"),
    ],
  );
  for (const r of [rows, tasks, reminders, acks, leaves]) {
    if (r.error) throw new Error(`Could not load the calendar: ${r.error.message}`);
  }

  const names = new Map(people.map((p) => [p.id, p.name]));
  const items: CalItem[] = [
    ...choreItems({
      rows: rows.data as (ChoreOccurrence & { chore: Chore })[],
      chores,
      leaves: leaves.data as Leave[],
      // Same order as the materializer (profiles by created_at).
      people: [me, partner]
        .filter((p) => p !== null)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((p) => p.id),
      names,
      meId: me.id,
      from,
      to,
      today,
    }),
    ...taskItems(tasks.data as Task[], me.id, from, to),
    ...reminderItems(
      reminders.data as Reminder[],
      new Set(acks.data!.map((a) => `${a.reminder_id}|${a.date}`)),
      me.id,
      from,
      to,
    ),
    ...leaveItems(leaves.data as Leave[], names, me.id, from, to),
  ];

  return { days, today, items: byDay(items), people, meId: me.id };
}
