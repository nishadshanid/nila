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
 * Tasks for one day: todos due that day (plus open overdue ones when it's
 * today) and plans that span it.
 */
export async function getTasksForDay(date: DateStr, today: DateStr): Promise<Task[]> {
  const supabase = await createClient();
  const dueFilter =
    date === today
      ? `and(kind.eq.todo,date.eq.${date}),and(kind.eq.todo,status.eq.open,date.lt.${date})`
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
