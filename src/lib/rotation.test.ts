import { describe, expect, it } from "vitest";
import { assigneeFor, planOccurrences, type ScheduledChore } from "./rotation";

const A = "user-a";
const B = "user-b";

const laundry: ScheduledChore = {
  assignment_type: "rotating",
  fixed_assignee: null,
  rotation_order: [A, B],
  rotation_unit: "per_week",
  freq: "weekly",
  by_weekday: [1],
  by_monthday: null,
  start_date: "2026-10-12", // Monday
  interval_days: 1,
  due_time: null,
};

describe("rotation", () => {
  it("weekly rotation alternates A, B, A, B", () => {
    expect(planOccurrences(laundry, "2026-10-12", "2026-11-08").map((o) => o.assignee_id)).toEqual([
      A,
      B,
      A,
      B,
    ]);
  });

  it("keeps alternating across a year boundary", () => {
    const dates = planOccurrences(laundry, "2026-12-21", "2027-01-11");
    expect(dates.map((o) => o.date)).toEqual([
      "2026-12-21",
      "2026-12-28",
      "2027-01-04",
      "2027-01-11",
    ]);
    // 2026-12-21 is 10 weeks after the start, so it's A's turn
    expect(dates.map((o) => o.assignee_id)).toEqual([A, B, A, B]);
  });

  it("per_week anchors to the Monday of the start week", () => {
    // Starting on a Wednesday: that whole week is A's, the next week is B's.
    const chore = { ...laundry, freq: "daily" as const, start_date: "2026-10-14" };
    expect(assigneeFor(chore, "2026-10-14")).toBe(A);
    expect(assigneeFor(chore, "2026-10-18")).toBe(A); // Sunday, same week
    expect(assigneeFor(chore, "2026-10-19")).toBe(B); // next Monday
  });

  it("per_occurrence takes turns every time it happens", () => {
    const chore: ScheduledChore = {
      ...laundry,
      rotation_unit: "per_occurrence",
      by_weekday: [1, 4],
    };
    expect(planOccurrences(chore, "2026-10-12", "2026-10-25").map((o) => o.assignee_id)).toEqual([
      A,
      B,
      A,
      B,
    ]);
  });

  it("per_occurrence daily alternates every day", () => {
    const chore: ScheduledChore = { ...laundry, rotation_unit: "per_occurrence", freq: "daily" };
    expect(planOccurrences(chore, "2026-10-12", "2026-10-15").map((o) => o.assignee_id)).toEqual([
      A,
      B,
      A,
      B,
    ]);
  });

  it("fixed and together chores", () => {
    expect(
      assigneeFor({ ...laundry, assignment_type: "fixed", fixed_assignee: B }, "2026-10-19"),
    ).toBe(B);
    expect(assigneeFor({ ...laundry, assignment_type: "together" }, "2026-10-19")).toBeNull();
  });

  it("alternate days, taking turns every time", () => {
    const calls: ScheduledChore = {
      ...laundry,
      freq: "daily",
      interval_days: 2,
      rotation_unit: "per_occurrence",
    };
    expect(
      planOccurrences(calls, "2026-10-12", "2026-10-19").map((o) => [o.date, o.assignee_id]),
    ).toEqual([
      ["2026-10-12", A],
      ["2026-10-14", B],
      ["2026-10-16", A],
      ["2026-10-18", B],
    ]);
  });
});
