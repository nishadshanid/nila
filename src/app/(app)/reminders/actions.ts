"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { reminderInputSchema, type ReminderInput } from "@/lib/reminder-schema";
import { notifyPartner } from "@/lib/notify-partner";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveReminder(input: ReminderInput, id?: string): Promise<ActionResult> {
  const parsed = reminderInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid reminder" };
  }

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("reminders").update(parsed.data).eq("id", id)
    : await supabase.from("reminders").insert(parsed.data);
  if (error?.code === "42501") {
    return { ok: false, error: "Only the person who created it can make it private." };
  }
  if (error) return { ok: false, error: error.message };
  if (!id && parsed.data.visibility === "couple") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      notifyPartner(user.id, (name) => ({
        body: `${name} added a reminder: ${parsed.data.title}`,
        path: "/reminders",
      }));
    }
  }
  refresh();
  return { ok: true };
}

export async function setReminderActive(id: string, active: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("reminders").update({ active }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteReminder(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("reminders").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** Ticks a reminder off (or back on) for one date, e.g. "called today". */
export async function ackReminder(id: string, date: string, acked: boolean): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Invalid date" };
  const supabase = await createClient();
  const { error } = acked
    ? await supabase.from("reminder_acks").upsert({ reminder_id: id, date })
    : await supabase.from("reminder_acks").delete().eq("reminder_id", id).eq("date", date);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}
