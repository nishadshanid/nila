"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { leaveInputSchema, type LeaveInput } from "@/lib/leave-schema";
import { resolveAssignment, type LeaveSpan } from "@/lib/handover";
import { reapplyLeaves } from "@/lib/occurrences";
import { planOccurrences } from "@/lib/rotation";
import type { Chore, Leave } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: unknown): ActionResult {
  return { ok: false, error: error instanceof Error ? error.message : String(error) };
}

const min = (a: string, b: string) => (a < b ? a : b);
const max = (a: string, b: string) => (a > b ? a : b);

/** Adds a leave, or changes it when `id` is given, then moves the affected chores. */
export async function saveLeave(input: LeaveInput, id?: string): Promise<ActionResult> {
  const parsed = leaveInputSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid leave" };
  const leave = parsed.data;

  try {
    const supabase = await createClient();

    let overlapQuery = supabase
      .from("leaves")
      .select("id")
      .eq("user_id", leave.user_id)
      .lte("start_date", leave.end_date)
      .gte("end_date", leave.start_date);
    if (id) overlapQuery = overlapQuery.neq("id", id);
    const { data: overlaps, error: overlapError } = await overlapQuery;
    if (overlapError) return { ok: false, error: overlapError.message };
    if (overlaps.length > 0) {
      return { ok: false, error: "This overlaps another leave. Edit that one instead." };
    }

    // When editing, chores in the old dates may need to move back.
    let from = leave.start_date;
    let to = leave.end_date;
    if (id) {
      const { data: old, error } = await supabase
        .from("leaves")
        .select("start_date, end_date")
        .eq("id", id)
        .single();
      if (error) return { ok: false, error: error.message };
      from = min(from, old.start_date);
      to = max(to, old.end_date);
    }

    const { error } = id
      ? await supabase.from("leaves").update(leave).eq("id", id)
      : await supabase.from("leaves").insert(leave);
    if (error) return { ok: false, error: error.message };

    await reapplyLeaves(supabase, from, to);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Removes a leave and gives the chores back to whoever they were planned for. */
export async function deleteLeave(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: leave, error: loadError } = await supabase
      .from("leaves")
      .select("start_date, end_date")
      .eq("id", id)
      .single();
    if (loadError) return { ok: false, error: loadError.message };

    const { error } = await supabase.from("leaves").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };

    await reapplyLeaves(supabase, leave.start_date, leave.end_date);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export type LeavePreview = { movedToPartner: number; paused: number };

/** How many chores a leave would hand to the partner or pause, before saving it. */
export async function previewLeave(input: LeaveInput, id?: string): Promise<LeavePreview | null> {
  const parsed = leaveInputSchema.safeParse(input);
  if (!parsed.success) return null;
  const leave = parsed.data;

  const supabase = await createClient();
  const [chores, otherLeaves, profiles] = await Promise.all([
    supabase.from("chores").select("*").eq("active", true).is("flex_target", null),
    supabase
      .from("leaves")
      .select("*")
      .lte("start_date", leave.end_date)
      .gte("end_date", leave.start_date),
    supabase.from("profiles").select("id"),
  ]);
  if (chores.error || otherLeaves.error || profiles.error) return null;

  const people = profiles.data.map((p) => p.id as string);
  const leaves: LeaveSpan[] = [...(otherLeaves.data as Leave[]).filter((l) => l.id !== id), leave];

  const preview: LeavePreview = { movedToPartner: 0, paused: 0 };
  for (const chore of chores.data as Chore[]) {
    for (const o of planOccurrences(chore, leave.start_date, leave.end_date)) {
      const isTheirs = o.assignee_id === leave.user_id || o.assignee_id === null;
      if (!isTheirs) continue;
      const result = resolveAssignment({
        assignmentType: chore.assignment_type,
        planned: o.assignee_id,
        date: o.date,
        leaves,
        people,
      });
      if (result.status === "skipped") preview.paused++;
      else if (result.reassign_reason) preview.movedToPartner++;
    }
  }
  return preview;
}
