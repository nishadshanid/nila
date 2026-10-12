import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { monthKeyIST } from "@/lib/dates";
import { DEFAULT_RULES, type PointRules, type Score } from "@/lib/points";

export type LedgerRow = {
  id: number;
  user_id: string;
  source: "chore_occurrence" | "task";
  source_id: string;
  title: string;
  points: number;
  reason: "completed" | "cover_bonus" | "reversed";
  month: string;
  earned_at: string;
};

export type MonthScores = { month: string; scores: Score[] };

/** The point rules, cached per request. */
export const getPointRules = cache(async (): Promise<PointRules> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("point_rules")
    .select("low, med, high, cover_bonus")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`Could not load point rules: ${error.message}`);
  return data ?? DEFAULT_RULES;
});

/** Every month's totals per person, newest first. */
export async function getAllScores(): Promise<MonthScores[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monthly_scores")
    .select("month, user_id, total")
    .order("month", { ascending: false });
  if (error) throw new Error(`Could not load scores: ${error.message}`);
  const months = new Map<string, Score[]>();
  for (const row of data as (Score & { month: string })[]) {
    months.set(row.month, [
      ...(months.get(row.month) ?? []),
      { user_id: row.user_id, total: row.total },
    ]);
  }
  return [...months].map(([month, scores]) => ({ month, scores }));
}

/** This month's totals, for the Today page. */
export async function getMonthScores(month = monthKeyIST()): Promise<Score[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monthly_scores")
    .select("user_id, total")
    .eq("month", month);
  if (error) throw new Error(`Could not load scores: ${error.message}`);
  return data as Score[];
}

export async function getLedger(month: string): Promise<LedgerRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("points_ledger")
    .select("*")
    .eq("month", month)
    .order("earned_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(300);
  if (error) throw new Error(`Could not load points history: ${error.message}`);
  return data as LedgerRow[];
}

export async function getRewards(): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("monthly_rewards").select("month, title");
  if (error) throw new Error(`Could not load rewards: ${error.message}`);
  return new Map(data.map((r) => [r.month as string, r.title as string]));
}
