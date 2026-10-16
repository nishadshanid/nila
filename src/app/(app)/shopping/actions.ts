"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { shoppingInputSchema, type ShoppingInput } from "@/lib/shopping-schema";
import { notifyPartner } from "@/lib/notify-partner";
import { todayIST } from "@/lib/dates";
import { urgencyFor } from "@/lib/shopping-meta";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Adds an item, or updates it when `id` is given. */
export async function saveItem(input: ShoppingInput, id?: string): Promise<ActionResult> {
  const parsed = shoppingInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid item" };
  }
  const { need_by } = parsed.data;
  const values = {
    ...parsed.data,
    qty: parsed.data.qty ?? null,
    // A date decides the section; picking a section instead drops the date.
    urgency: need_by ? urgencyFor(need_by, todayIST()) : parsed.data.urgency,
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("shopping_items").update(values).eq("id", id)
    : await supabase.from("shopping_items").insert(values);
  if (error) return { ok: false, error: error.message };
  if (!id) await notifyNewItem(supabase, values);
  refresh();
  return { ok: true };
}

async function notifyNewItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  item: { name: string; qty: number | null; unit: string | null },
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const amount = [item.qty, item.unit].filter(Boolean).join(" ");
  const label = `${item.name}${amount ? ` (${amount})` : ""}`;
  // The phone folds items added close together into one notification.
  notifyPartner(user.id, (name) => ({
    title: "🛒 Shopping list",
    body: `${name} added ${label}`,
    path: "/shopping",
    group: { key: `shopping:${user.id}`, who: name, item: label },
  }));
}

export async function setBought(id: string, bought: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You're signed out." };

  const { error } = await supabase
    .from("shopping_items")
    .update(
      bought
        ? { status: "bought", bought_by: user.id, bought_at: new Date().toISOString() }
        : { status: "needed", bought_by: null, bought_at: null },
    )
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** Adds a bought item back to the list as a new needed item. */
export async function buyAgain(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopping_items")
    .select("name, qty, unit, category, notes")
    .eq("id", id)
    .single();
  if (error) return { ok: false, error: error.message };

  const { error: insertError } = await supabase
    .from("shopping_items")
    .insert({ ...data, urgency: "this_week" });
  if (insertError) return { ok: false, error: insertError.message };
  await notifyNewItem(supabase, data);
  refresh();
  return { ok: true };
}

export async function deleteItem(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}
