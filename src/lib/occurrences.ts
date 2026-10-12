import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, todayIST, type DateStr } from "@/lib/dates";
import { resolveAssignment, type LeaveSpan } from "@/lib/handover";
import { planOccurrences } from "@/lib/rotation";
import type { AssignmentType, Chore } from "@/lib/types";

/** How far ahead dated chore rows are created. */
export const MATERIALIZE_DAYS = 14;

/** Rows a leave may change: not done, and not handed over by hand. */
const LEAVE_MANAGED = "status.eq.pending,and(status.eq.skipped,reassign_reason.in.(leave,sick))";

async function loadPeopleAndLeaves(supabase: SupabaseClient, from: DateStr, to: DateStr) {
  const [profiles, leaves] = await Promise.all([
    supabase.from("profiles").select("id").order("created_at"),
    supabase
      .from("leaves")
      .select("user_id, start_date, end_date, type")
      .lte("start_date", to)
      .gte("end_date", from),
  ]);
  if (profiles.error) throw new Error(`Could not load profiles: ${profiles.error.message}`);
  if (leaves.error) throw new Error(`Could not load leaves: ${leaves.error.message}`);
  return {
    people: profiles.data.map((p) => p.id as string),
    leaves: leaves.data as LeaveSpan[],
  };
}

/**
 * Creates the dated rows for active chores in [from, to], taking leaves into
 * account. Idempotent: rows that already exist are left untouched.
 */
export async function materialize(
  supabase: SupabaseClient,
  from: DateStr,
  to: DateStr,
  choreIds?: string[],
) {
  let query = supabase.from("chores").select("*").eq("active", true);
  if (choreIds) query = query.in("id", choreIds);
  const [{ data: chores, error }, { people, leaves }] = await Promise.all([
    query,
    loadPeopleAndLeaves(supabase, from, to),
  ]);
  if (error) throw new Error(`Could not load chores: ${error.message}`);

  const rows = (chores as Chore[]).flatMap((chore) =>
    planOccurrences(chore, from, to).map((o) => ({
      chore_id: chore.id,
      date: o.date,
      due_time: o.due_time,
      original_assignee_id: o.assignee_id,
      ...resolveAssignment({
        assignmentType: chore.assignment_type,
        planned: o.assignee_id,
        date: o.date,
        leaves,
        people,
      }),
    })),
  );
  if (rows.length === 0) return;

  const { error: upsertError } = await supabase
    .from("chore_occurrences")
    .upsert(rows, { onConflict: "chore_id,date", ignoreDuplicates: true });
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
 * After a chore is edited, paused or resumed: drop its future rows that aren't
 * done or handed over, and plan them again. Past rows stay as history.
 */
export async function regenerateFuture(supabase: SupabaseClient, choreId: string) {
  const today = todayIST();
  const { error } = await supabase
    .from("chore_occurrences")
    .delete()
    .eq("chore_id", choreId)
    .or(LEAVE_MANAGED)
    .gte("date", today);
  if (error) throw new Error(`Could not reset future chores: ${error.message}`);
  await materialize(supabase, today, addDays(today, MATERIALIZE_DAYS - 1), [choreId]);
}

/**
 * Re-checks existing rows in [from, to] against the current leaves, after a
 * leave is added, changed or removed. Done chores and hand-overs are kept.
 */
export async function reapplyLeaves(supabase: SupabaseClient, from: DateStr, to: DateStr) {
  const [{ data, error }, { people, leaves }] = await Promise.all([
    supabase
      .from("chore_occurrences")
      .select(
        "id, date, assignee_id, original_assignee_id, status, reassign_reason, chore:chores!inner(assignment_type)",
      )
      .gte("date", from)
      .lte("date", to)
      .or(LEAVE_MANAGED),
    loadPeopleAndLeaves(supabase, from, to),
  ]);
  if (error) throw new Error(`Could not load chores to update: ${error.message}`);

  type Row = {
    id: string;
    date: DateStr;
    assignee_id: string | null;
    original_assignee_id: string | null;
    status: string;
    reassign_reason: string | null;
    chore: { assignment_type: AssignmentType };
  };

  const updates = (data as unknown as Row[]).flatMap((row) => {
    const next = resolveAssignment({
      assignmentType: row.chore.assignment_type,
      planned: row.original_assignee_id,
      date: row.date,
      leaves,
      people,
    });
    const unchanged =
      next.assignee_id === row.assignee_id &&
      next.status === row.status &&
      next.reassign_reason === row.reassign_reason;
    return unchanged ? [] : [{ id: row.id, ...next }];
  });

  const results = await Promise.all(
    updates.map(({ id, ...values }) =>
      supabase
        .from("chore_occurrences")
        .update({ ...values, reassign_note: null, reassigned_by: null, reassigned_at: null })
        .eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(`Could not update chores: ${failed.error.message}`);
  return updates.length;
}
