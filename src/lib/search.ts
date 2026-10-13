import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Chore, Reminder, ShoppingItem, Task } from "@/lib/types";

/** Characters that would break a PostgREST filter; plain words still match. */
export function cleanQuery(q: string) {
  return q
    .replace(/[%_*,()\\"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/**
 * Finds todos, plans, reminders, shopping items and chores by title (and
 * notes). RLS hides your partner's private things; their own chores are
 * filtered out like everywhere else.
 */
export async function search(query: string) {
  const q = cleanQuery(query);
  if (q.length < 2) return null;
  const like = `*${q}*`;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [tasks, reminders, shopping, chores] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .or(`title.ilike.${like},notes.ilike.${like}`)
      .order("status")
      .order("date", { ascending: false, nullsFirst: true })
      .limit(25),
    supabase.from("reminders").select("*").or(`title.ilike.${like},notes.ilike.${like}`).limit(15),
    supabase
      .from("shopping_items")
      .select("*")
      .or(`name.ilike.${like},notes.ilike.${like}`)
      .order("status", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("chores")
      .select("*")
      .or(`title.ilike.${like},notes.ilike.${like}`)
      .or(`assignment_type.neq.fixed,fixed_assignee.eq.${user?.id}`)
      .limit(15),
  ]);
  for (const r of [tasks, reminders, shopping, chores]) {
    if (r.error) throw new Error(`Search failed: ${r.error.message}`);
  }

  // Keep one row per shopping item name: the needed one, else the latest bought.
  const seen = new Set<string>();
  const items = (shopping.data as ShoppingItem[]).filter((i) => {
    const key = i.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    q,
    tasks: tasks.data as Task[],
    reminders: reminders.data as Reminder[],
    shopping: items,
    chores: chores.data as Chore[],
  };
}
