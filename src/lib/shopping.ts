import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ShoppingItem } from "@/lib/types";

/** How long bought items stay in the history. */
export const HISTORY_DAYS = 30;

/** Everything still needed, plus what was bought in the last 30 days. */
export async function getShoppingItems(): Promise<ShoppingItem[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("shopping_items")
    .select("*")
    .or(`status.eq.needed,bought_at.gte.${since}`)
    .order("created_at");
  if (error) throw new Error(`Could not load the shopping list: ${error.message}`);
  return data as ShoppingItem[];
}

/** Names you've added before, most recent first, for autocomplete. */
export function pastNames(items: ShoppingItem[]): string[] {
  const seen = new Set<string>();
  return [...items]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((i) => i.name)
    .filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** What Today shows: items to buy today, and how many more are due this week. */
export async function getShoppingSummary() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopping_items")
    .select("*")
    .eq("status", "needed")
    .in("urgency", ["today", "this_week"])
    .order("created_at");
  if (error) throw new Error(`Could not load the shopping list: ${error.message}`);
  const items = data as ShoppingItem[];
  return {
    today: items.filter((i) => i.urgency === "today"),
    weekCount: items.filter((i) => i.urgency === "this_week").length,
  };
}
