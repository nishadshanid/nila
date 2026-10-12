import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ensureOccurrences } from "@/lib/occurrences";
import { addDays, type DateStr } from "@/lib/dates";
import { flexPeriod } from "@/lib/recurrence";
import type { Chore, ChoreOccurrence } from "@/lib/types";

export type OccurrenceWithChore = ChoreOccurrence & { chore: Chore };

/** Chores you can manage: shared ones and your own. Your partner's own chores are theirs. */
export async function getChores(): Promise<Chore[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("chores")
    .select("*")
    .or(`assignment_type.neq.fixed,fixed_assignee.eq.${user?.id}`)
    .order("active", { ascending: false })
    .order("category")
    .order("title");
  if (error) throw new Error(`Could not load chores: ${error.message}`);
  return data as Chore[];
}

/** Chores scheduled on `date`, creating their rows first if needed. */
export async function getChoresForDay(date: DateStr): Promise<OccurrenceWithChore[]> {
  const supabase = await createClient();
  await ensureOccurrences(supabase, date);
  const { data, error } = await supabase
    .from("chore_occurrences")
    .select("*, chore:chores!inner(*)")
    .eq("date", date)
    // Flexible chores are shown with their weekly/monthly progress instead.
    .is("chore.flex_target", null);
  if (error) throw new Error(`Could not load today's chores: ${error.message}`);

  return (data as OccurrenceWithChore[]).sort(
    (a, b) =>
      (a.due_time ?? "99").localeCompare(b.due_time ?? "99") ||
      a.chore.title.localeCompare(b.chore.title),
  );
}

export type FlexibleProgress = {
  chore: Chore;
  period: { from: DateStr; to: DateStr };
  /** Days logged this period, oldest first. */
  doneDates: DateStr[];
  /** Whether it was logged on the day being viewed. */
  doneOnDate: boolean;
  /** How many times it was done in the previous week/month. */
  previousCount: number;
};

/** Flexible chores ("4 times a week") with their progress in the period containing `date`. */
export async function getFlexibleForDay(date: DateStr): Promise<FlexibleProgress[]> {
  const supabase = await createClient();
  const { data: chores, error } = await supabase
    .from("chores")
    .select("*")
    .eq("active", true)
    .not("flex_target", "is", null)
    .order("title");
  if (error) throw new Error(`Could not load flexible chores: ${error.message}`);
  if (chores.length === 0) return [];

  // One query covering this and the previous week and month around `date`.
  const week = flexPeriod("weekly", date);
  const month = flexPeriod("monthly", date);
  const lastWeek = flexPeriod("weekly", addDays(week.from, -1));
  const lastMonth = flexPeriod("monthly", addDays(month.from, -1));
  const { data: logged, error: logError } = await supabase
    .from("chore_occurrences")
    .select("chore_id, date")
    .in(
      "chore_id",
      chores.map((c) => c.id),
    )
    .eq("status", "done")
    .gte("date", lastWeek.from < lastMonth.from ? lastWeek.from : lastMonth.from)
    .lte("date", week.to > month.to ? week.to : month.to)
    .order("date");
  if (logError) throw new Error(`Could not load flexible progress: ${logError.message}`);

  // A chore that starts mid-week still counts for that whole week (or month),
  // so you can log earlier days of the period it starts in.
  const started = (chores as Chore[]).filter((c) => c.start_date <= flexPeriod(c.freq, date).to);
  return started.map((chore) => {
    const period = flexPeriod(chore.freq, date);
    const previous = flexPeriod(chore.freq, addDays(period.from, -1));
    const datesIn = (p: { from: DateStr; to: DateStr }) =>
      logged
        .filter((o) => o.chore_id === chore.id && o.date >= p.from && o.date <= p.to)
        .map((o) => o.date as DateStr);
    const doneDates = datesIn(period);
    return {
      chore,
      period,
      doneDates,
      doneOnDate: doneDates.includes(date),
      previousCount: datesIn(previous).length,
    };
  });
}
