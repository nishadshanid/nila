"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { taskInputSchema, type TaskInput } from "@/lib/task-schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Creates a task, or updates it when `id` is given. */
export async function saveTask(input: TaskInput, id?: string): Promise<ActionResult> {
  const parsed = taskInputSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid task" };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("tasks").update(parsed.data).eq("id", id)
    : await supabase.from("tasks").insert(parsed.data);
  // RLS rejects your partner making your couple task personal; explain it plainly.
  if (error?.code === "42501") {
    return { ok: false, error: "Only the person who created it can make it private." };
  }
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function setTaskDone(id: string, done: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're signed out." };

  const { error } = await supabase
    .from("tasks")
    .update(
      done
        ? { status: "done", completed_by: user.id, completed_at: new Date().toISOString() }
        : { status: "open", completed_by: null, completed_at: null },
    )
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}
