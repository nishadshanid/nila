"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABLES = [
  "chore_occurrences",
  "chores",
  "tasks",
  "reminders",
  "reminder_acks",
  "shopping_items",
  "leaves",
  "points_ledger",
  "monthly_rewards",
];

/**
 * Refreshes the page when anything shared changes, so your partner's ticks,
 * shopping and todos show up without pulling to refresh. RLS decides which
 * changes reach you, so their private items never do.
 */
export function LiveSync() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // One tick can touch several rows (a chore, its points); refresh once.
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };

    let channel = supabase.channel("nila-live");
    for (const table of TABLES) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    }
    channel.subscribe();

    // Catch up after the phone was asleep or the app was in the background.
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
