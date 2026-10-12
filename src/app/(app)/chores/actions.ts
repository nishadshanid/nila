"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { choreInputSchema, type ChoreInput } from "@/lib/chore-schema";
import { regenerateFuture } from "@/lib/occurrences";

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
    const query = id
      ? supabase.from("chores").update(parsed.data).eq("id", id).select("id").single()
      : supabase.from("chores").insert(parsed.data).select("id").single();
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
