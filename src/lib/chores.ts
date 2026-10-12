import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ensureOccurrences } from "@/lib/occurrences";
import type { DateStr } from "@/lib/dates";
import type { Chore, ChoreOccurrence } from "@/lib/types";

export type OccurrenceWithChore = ChoreOccurrence & { chore: Chore };

/** Chores you can manage: shared ones and your own. Your partner's own chores are theirs. */
export async function getChores(): Promise<Chore[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("chores")
    .select("*")
    .or(`assignment_type.neq.fixed,fixed_assignee.eq.${user?.id}`)
    .order("active", { ascending: false })
    .order("category")
    .order("title");
  if (error) throw new Error(`Could not load chores: ${error.message}`);
  return data as Chore[];
}

/** Chores scheduled on `date`, creating their rows first if needed. */
export async function getChoresForDay(date: DateStr): Promise<OccurrenceWithChore[]> {
  const supabase = await createClient();
  await ensureOccurrences(supabase, date);
  const { data, error } = await supabase
    .from("chore_occurrences")
    .select("*, chore:chores!inner(*)")
    .eq("date", date);
  if (error) throw new Error(`Could not load today's chores: ${error.message}`);

  return (data as OccurrenceWithChore[]).sort(
    (a, b) =>
      (a.due_time ?? "99").localeCompare(b.due_time ?? "99") ||
      a.chore.title.localeCompare(b.chore.title) ||
      a.slot - b.slot,
  );
}
