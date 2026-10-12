"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const points = z.number().int().min(0, "Points can't be negative").max(100, "At most 100");
const rulesSchema = z.object({ low: points, med: points, high: points, cover_bonus: points });

/** Changes the points per priority. Points already earned stay as they were. */
export async function saveRules(input: z.input<typeof rulesSchema>): Promise<ActionResult> {
  const parsed = rulesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const supabase = await createClient();
  const { error } = await supabase.from("point_rules").update(parsed.data).eq("id", 1);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** Sets this month's reward, or clears it when the title is empty. */
export async function saveReward(month: string, title: string): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}$/.test(month)) return { ok: false, error: "Invalid month" };
  const trimmed = title.trim();
  if (trimmed.length > 200) return { ok: false, error: "Keep it under 200 characters" };

  const supabase = await createClient();
  const { error } = trimmed
    ? await supabase.from("monthly_rewards").upsert({ month, title: trimmed })
    : await supabase.from("monthly_rewards").delete().eq("month", month);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}
