import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, todayIST, type DateStr } from "@/lib/dates";
import { planOccurrences } from "@/lib/rotation";
import type { Chore } from "@/lib/types";

/** How far ahead dated chore rows are created. */
export const MATERIALIZE_DAYS = 14;

/**
 * Creates the dated rows for active chores in [from, to]. Idempotent: rows that
 * already exist (done, reassigned or pending) are left untouched.
 */
export async function materialize(
  supabase: SupabaseClient,
  from: DateStr,
  to: DateStr,
  choreIds?: string[],
) {
  let query = supabase.from("chores").select("*").eq("active", true);
  if (choreIds) query = query.in("id", choreIds);
  const { data: chores, error } = await query;
  if (error) throw new Error(`Could not load chores: ${error.message}`);

  const rows = (chores as Chore[]).flatMap((chore) =>
    planOccurrences(chore, from, to).map((o) => ({
      chore_id: chore.id,
      date: o.date,
      slot: o.slot,
      due_time: o.due_time,
      assignee_id: o.assignee_id,
      original_assignee_id: o.assignee_id,
    })),
  );
  if (rows.length === 0) return;

  const { error: upsertError } = await supabase
    .from("chore_occurrences")
    .upsert(rows, { onConflict: "chore_id,date,slot", ignoreDuplicates: true });
  if (upsertError) throw new Error(`Could not create chore occurrences: ${upsertError.message}`);
}

/** Makes sure rows exist for the coming window and for `date` itself. */
export async function ensureOccurrences(supabase: SupabaseClient, date: DateStr) {
  const today = todayIST();
  const windowEnd = addDays(today, MATERIALIZE_DAYS - 1);
  await materialize(supabase, today, windowEnd);
  if (date < today || date > windowEnd) await materialize(supabase, date, date);
}

/**
 * After a chore is edited, paused or resumed: drop its future pending rows and
 * plan them again. Past rows and anything already done stay as history.
 */
export async function regenerateFuture(supabase: SupabaseClient, choreId: string) {
  const today = todayIST();
  const { error } = await supabase
    .from("chore_occurrences")
    .delete()
    .eq("chore_id", choreId)
    .eq("status", "pending")
    .gte("date", today);
  if (error) throw new Error(`Could not reset future chores: ${error.message}`);
  await materialize(supabase, today, addDays(today, MATERIALIZE_DAYS - 1), [choreId]);
}
