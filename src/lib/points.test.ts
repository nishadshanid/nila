import { describe, expect, it } from "vitest";
import { monthKeyIST } from "./dates";
import {
  DEFAULT_RULES,
  leaderOf,
  monthLabel,
  pointsFor,
  previousMonth,
  taskEarnsPoints,
} from "./points";

describe("pointsFor", () => {
  it("uses the priority's points by default", () => {
    expect(pointsFor({ priority: "low" }, DEFAULT_RULES)).toBe(1);
    expect(pointsFor({ priority: "med", points: null }, DEFAULT_RULES)).toBe(3);
    expect(pointsFor({ priority: "high" }, DEFAULT_RULES)).toBe(5);
  });

  it("uses the item's own points when set, even 0", () => {
    expect(pointsFor({ priority: "high", points: 8 }, DEFAULT_RULES)).toBe(8);
    expect(pointsFor({ priority: "high", points: 0 }, DEFAULT_RULES)).toBe(0);
  });

  it("follows changed rules", () => {
    expect(pointsFor({ priority: "med" }, { ...DEFAULT_RULES, med: 4 })).toBe(4);
  });
});

describe("taskEarnsPoints", () => {
  it("is only couple todos", () => {
    expect(taskEarnsPoints({ kind: "todo", visibility: "couple" })).toBe(true);
    expect(taskEarnsPoints({ kind: "todo", visibility: "personal" })).toBe(false);
    expect(taskEarnsPoints({ kind: "plan", visibility: "couple" })).toBe(false);
  });
});

describe("leaderOf", () => {
  it("picks the higher score", () => {
    expect(
      leaderOf([
        { user_id: "a", total: 10 },
        { user_id: "b", total: 12 },
      ]),
    ).toBe("b");
  });
  it("is null on a tie or with no points", () => {
    expect(
      leaderOf([
        { user_id: "a", total: 7 },
        { user_id: "b", total: 7 },
      ]),
    ).toBeNull();
    expect(leaderOf([])).toBeNull();
    expect(leaderOf([{ user_id: "a", total: 0 }])).toBeNull();
  });
});

describe("months", () => {
  it("counts by the IST month", () => {
    // 23:50 IST on 31 Oct is still October; 00:10 IST on 1 Nov is November.
    expect(monthKeyIST("2026-10-31T18:20:00Z")).toBe("2026-10");
    expect(monthKeyIST("2026-10-31T18:40:00Z")).toBe("2026-11");
  });
  it("labels and steps back", () => {
    expect(monthLabel("2026-10")).toBe("October 2026");
    expect(monthLabel("2026-10", true)).toBe("October");
    expect(previousMonth("2026-10")).toBe("2026-09");
    expect(previousMonth("2027-01")).toBe("2026-12");
  });
});
