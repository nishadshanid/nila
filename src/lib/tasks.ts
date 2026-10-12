import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DateStr } from "@/lib/dates";
import type { Task } from "@/lib/types";

/** All tasks you can see: your personal ones and every couple one. */
export async function getTasks(): Promise<Task[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("status")
    .order("date", { nullsFirst: false })
    .order("time", { nullsFirst: true })
    .order("created_at");
  if (error) throw new Error(`Could not load tasks: ${error.message}`);
  return data as Task[];
}

/**
 * Tasks for one day: todos due that day and plans that span it. Today also
 * carries over overdue and undated todos while they're open, and keeps them
 * (ticked) for the rest of the day once they're done.
 */
export async function getTasksForDay(date: DateStr, today: DateStr): Promise<Task[]> {
  const supabase = await createClient();
  const startOfToday = `${today}T00:00:00+05:30`;
  const carriedOver = `or(date.lt.${date},date.is.null),or(status.eq.open,completed_at.gte.${startOfToday})`;
  const dueFilter =
    date === today
      ? `and(kind.eq.todo,date.eq.${date}),and(kind.eq.todo,${carriedOver})`
      : `and(kind.eq.todo,date.eq.${date})`;
  const planFilter = `and(kind.eq.plan,date.lte.${date},or(end_date.gte.${date},and(end_date.is.null,date.eq.${date})))`;
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .or(`${dueFilter},${planFilter}`)
    .order("time", { nullsFirst: true })
    .order("date");
  if (error) throw new Error(`Could not load today's tasks: ${error.message}`);
  return data as Task[];
}
