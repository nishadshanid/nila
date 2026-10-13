import { describe, expect, it } from "vitest";
import { choreStreaks, monthlyStats, topItems, type LedgerEntry } from "./stats";

const A = "a";
const B = "b";
const row = (o: Partial<LedgerEntry>): LedgerEntry => ({
  user_id: A,
  source_id: "x",
  title: "Laundry",
  points: 3,
  reason: "completed",
  month: "2026-10",
  ...o,
});

describe("monthlyStats", () => {
  it("counts completions, covers and points; undone items don't count", () => {
    const stats = monthlyStats([
      row({ source_id: "1" }),
      row({ source_id: "2", user_id: B, points: 3 }),
      row({ source_id: "2", user_id: B, points: 1, reason: "cover_bonus" }),
      row({ source_id: "3", points: 5 }),
      row({ source_id: "3", points: -5, reason: "reversed" }),
    ]);
    expect(stats.get("2026-10")!.get(A)).toEqual({ points: 3, completions: 1, covers: 0 });
    expect(stats.get("2026-10")!.get(B)).toEqual({ points: 4, completions: 1, covers: 1 });
  });

  it("an undone cover isn't a cover", () => {
    const stats = monthlyStats([
      row({ source_id: "1", points: 3 }),
      row({ source_id: "1", points: 1, reason: "cover_bonus" }),
      row({ source_id: "1", points: -4, reason: "reversed" }),
    ]);
    expect(stats.get("2026-10")!.get(A)).toEqual({ points: 0, completions: 0, covers: 0 });
  });
});

describe("topItems", () => {
  it("ranks titles by how often they were done", () => {
    const rows = [
      row({ source_id: "1", title: "Dishes" }),
      row({ source_id: "2", title: "Dishes" }),
      row({ source_id: "3", title: "Laundry" }),
      row({ source_id: "4", title: "Laundry" }),
      row({ source_id: "4", title: "Laundry", points: -3, reason: "reversed" }),
      row({ source_id: "5", title: "Waste", user_id: B }),
    ];
    expect(topItems(rows, A)).toEqual([
      { title: "Dishes", count: 2 },
      { title: "Laundry", count: 1 },
    ]);
  });
});

describe("choreStreaks", () => {
  const day = (date: string, total: number, done: number) => ({ date, total, done });

  it("counts consecutive complete days, skipping days without chores", () => {
    const days = [
      day("2026-10-08", 2, 1), // broke here
      day("2026-10-09", 1, 1),
      day("2026-10-10", 0, 0),
      day("2026-10-11", 2, 2),
      day("2026-10-12", 1, 1),
    ];
    expect(choreStreaks(days, "2026-10-12")).toEqual({ current: 3, best: 3 });
  });

  it("an unfinished today doesn't break the streak", () => {
    const days = [day("2026-10-11", 1, 1), day("2026-10-12", 2, 0)];
    expect(choreStreaks(days, "2026-10-12")).toEqual({ current: 1, best: 1 });
  });

  it("keeps the best streak from before a break", () => {
    const days = [
      day("2026-10-05", 1, 1),
      day("2026-10-06", 1, 1),
      day("2026-10-07", 1, 1),
      day("2026-10-08", 1, 0),
      day("2026-10-09", 1, 1),
    ];
    expect(choreStreaks(days, "2026-10-09")).toEqual({ current: 1, best: 3 });
  });

  it("is zero with no chores", () => {
    expect(choreStreaks([], "2026-10-12")).toEqual({ current: 0, best: 0 });
  });
});
