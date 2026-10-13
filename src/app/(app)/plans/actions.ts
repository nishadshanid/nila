"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { taskInputSchema, type TaskInput } from "@/lib/task-schema";
import { notifyPartner } from "@/lib/notify-partner";

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
  const task = parsed.data;
  if (!id && task.visibility === "couple") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // A couple todo assigned only to yourself isn't news for your partner.
    if (user && task.assignee_id !== user.id) {
      const what = task.kind === "plan" ? "a plan" : task.assignee_id ? "a todo for you" : "a todo";
      notifyPartner(user.id, (name) => ({
        body: `${name} added ${what}: ${task.title}`,
        path: task.kind === "plan" ? "/plans" : "/",
      }));
    }
  }
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
