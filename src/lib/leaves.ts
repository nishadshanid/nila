import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, daysInMonth, monthKeyIST, todayIST, type DateStr } from "@/lib/dates";
import type { Leave } from "@/lib/types";

/** How far back the leave page shows past leaves. */
const PAST_DAYS = 60;

export async function getLeaves(): Promise<Leave[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leaves")
    .select("*")
    .gte("end_date", addDays(todayIST(), -PAST_DAYS))
    .order("start_date");
  if (error) throw new Error(`Could not load leaves: ${error.message}`);
  return data as Leave[];
}

/** Leaves that include `date`. */
export async function getLeavesOn(date: DateStr): Promise<Leave[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leaves")
    .select("*")
    .lte("start_date", date)
    .gte("end_date", date);
  if (error) throw new Error(`Could not load leaves: ${error.message}`);
  return data as Leave[];
}

/** How many chores each person did for the other this month (by person id). */
export async function getCoverCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const month = monthKeyIST();
  const { data, error } = await supabase
    .from("chore_occurrences")
    .select("completed_by")
    .eq("status", "done")
    .not("reassign_reason", "is", null)
    .gte("date", `${month}-01`)
    // Not "-31": Postgres rejects dates like 2026-02-31.
    .lte("date", `${month}-${String(daysInMonth(`${month}-01`)).padStart(2, "0")}`);
  if (error) throw new Error(`Could not load covers: ${error.message}`);
  const counts: Record<string, number> = {};
  for (const row of data) {
    if (row.completed_by) counts[row.completed_by] = (counts[row.completed_by] ?? 0) + 1;
  }
  return counts;
}
