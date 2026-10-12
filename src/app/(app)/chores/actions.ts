"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { choreInputSchema, type ChoreInput } from "@/lib/chore-schema";
import { regenerateFuture } from "@/lib/occurrences";
import { todayIST } from "@/lib/dates";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: unknown): ActionResult {
  return { ok: false, error: error instanceof Error ? error.message : String(error) };
}

/** Creates a chore, or updates it when `id` is given, then re-plans its future days. */
export async function saveChore(input: ChoreInput, id?: string): Promise<ActionResult> {
  const parsed = choreInputSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid chore" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You're signed out." };

    // "One person" always means you: you can't assign a chore only to your partner.
    const values = {
      ...parsed.data,
      fixed_assignee: parsed.data.assignment_type === "fixed" ? user.id : null,
    };
    const query = id
      ? supabase.from("chores").update(values).eq("id", id).select("id").single()
      : supabase.from("chores").insert(values).select("id").single();
    const { data, error } = await query;
    if (error) return { ok: false, error: error.message };

    await regenerateFuture(supabase, data.id);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setChoreActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("chores").update({ active }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    await regenerateFuture(supabase, id);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Deletes the chore and its whole history. Pausing keeps the history. */
export async function deleteChore(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("chores").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function setOccurrenceDone(id: string, done: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're signed out." };

  // You tick off your own and together chores; your partner's are theirs.
  const { data: occurrence, error: loadError } = await supabase
    .from("chore_occurrences")
    .select("assignee_id")
    .eq("id", id)
    .single();
  if (loadError) return { ok: false, error: loadError.message };
  if (occurrence.assignee_id && occurrence.assignee_id !== user.id) {
    return { ok: false, error: "Only the person doing this chore can tick it off." };
  }

  const { error } = await supabase
    .from("chore_occurrences")
    .update(
      done
        ? { status: "done", completed_by: user.id, completed_at: new Date().toISOString() }
        : { status: "pending", completed_by: null, completed_at: null },
    )
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** Logs (or un-logs) a flexible chore like "gym 4 times a week" on one day. */
export async function logFlexibleChore(
  choreId: string,
  date: string,
  done: boolean,
): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Invalid date" };
  if (date > todayIST())
    return { ok: false, error: "You can't log a day that hasn't happened yet." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're signed out." };

  const { data: chore, error: choreError } = await supabase
    .from("chores")
    .select("assignment_type, fixed_assignee, flex_target")
    .eq("id", choreId)
    .single();
  if (choreError) return { ok: false, error: choreError.message };
  if (chore.flex_target == null) return { ok: false, error: "This chore has set days." };
  if (chore.assignment_type === "fixed" && chore.fixed_assignee !== user.id) {
    return { ok: false, error: "Only the person doing this chore can log it." };
  }

  const assignee = chore.assignment_type === "fixed" ? user.id : null;
  const { error } = done
    ? await supabase.from("chore_occurrences").upsert(
        {
          chore_id: choreId,
          date,
          assignee_id: assignee,
          original_assignee_id: assignee,
          status: "done",
          completed_by: user.id,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "chore_id,date" },
      )
    : await supabase.from("chore_occurrences").delete().eq("chore_id", choreId).eq("date", date);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/**
 * "Can't do it": hands one of your chores for one day to your partner, with a
 * short reason they can see.
 */
export async function handOverOccurrence(id: string, reason: string): Promise<ActionResult> {
  const note = reason.trim().slice(0, 300);
  if (!note) return { ok: false, error: "Add a short reason" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're signed out." };

  const [{ data: row, error: loadError }, { data: partner, error: partnerError }] =
    await Promise.all([
      supabase.from("chore_occurrences").select("assignee_id, status").eq("id", id).single(),
      supabase.from("profiles").select("id").neq("id", user.id).maybeSingle(),
    ]);
  if (loadError) return { ok: false, error: loadError.message };
  if (partnerError) return { ok: false, error: partnerError.message };
  if (!partner) return { ok: false, error: "There's no partner to hand it to yet." };
  if (row.status !== "pending")
    return { ok: false, error: "Only chores still to do can be handed over." };
  if (row.assignee_id && row.assignee_id !== user.id) {
    return { ok: false, error: "You can only hand over your own chores." };
  }

  const { error } = await supabase
    .from("chore_occurrences")
    .update({
      assignee_id: partner.id,
      reassign_reason: "split",
      reassign_note: note,
      reassigned_by: user.id,
      reassigned_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** Takes back a chore you handed over, if your partner hasn't done it yet. */
export async function takeBackOccurrence(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're signed out." };

  const { data: row, error: loadError } = await supabase
    .from("chore_occurrences")
    .select("status, reassign_reason, reassigned_by, original_assignee_id")
    .eq("id", id)
    .single();
  if (loadError) return { ok: false, error: loadError.message };
  if (row.reassign_reason !== "split" || row.reassigned_by !== user.id) {
    return { ok: false, error: "Only the person who handed it over can take it back." };
  }
  if (row.status !== "pending") return { ok: false, error: "It's already done." };

  const { error } = await supabase
    .from("chore_occurrences")
    .update({
      assignee_id: row.original_assignee_id,
      reassign_reason: null,
      reassign_note: null,
      reassigned_by: null,
      reassigned_at: null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}
