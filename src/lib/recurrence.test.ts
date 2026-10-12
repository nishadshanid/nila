import { describe, expect, it } from "vitest";
import {
  countBefore,
  datesInRange,
  describeRule,
  occursOn,
  type RecurrenceRule,
} from "./recurrence";

const weekly = (days: number[], start = "2026-10-01"): RecurrenceRule => ({
  freq: "weekly",
  interval_days: 1,
  by_weekday: days,
  by_monthday: null,
  start_date: start,
});

describe("recurrence", () => {
  it("weekly picks the right weekdays", () => {
    // 2026-10-12 is a Monday
    expect(datesInRange(weekly([1, 4]), "2026-10-12", "2026-10-25")).toEqual([
      "2026-10-12",
      "2026-10-15",
      "2026-10-19",
      "2026-10-22",
    ]);
  });

  it("nothing happens before the start date", () => {
    expect(occursOn(weekly([1], "2026-10-13"), "2026-10-12")).toBe(false);
    expect(
      datesInRange(
        { ...weekly([]), freq: "daily", start_date: "2026-10-14" },
        "2026-10-12",
        "2026-10-15",
      ),
    ).toEqual(["2026-10-14", "2026-10-15"]);
  });

  it("monthly on the 31st falls on the last day of shorter months", () => {
    const rule: RecurrenceRule = {
      freq: "monthly",
      interval_days: 1,
      by_weekday: null,
      by_monthday: 31,
      start_date: "2026-01-01",
    };
    expect(datesInRange(rule, "2026-02-01", "2026-04-30")).toEqual([
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
    expect(occursOn(rule, "2028-02-29")).toBe(true);
  });

  it("counts occurrences before a date", () => {
    expect(countBefore(weekly([1, 4], "2026-10-12"), "2026-10-12", "2026-10-19")).toBe(2);
    expect(countBefore(weekly([1, 4], "2026-10-12"), "2026-10-12", "2026-10-12")).toBe(0);
  });

  it("describes rules", () => {
    expect(describeRule(weekly([4, 1]))).toBe("Every Mon, Thu");
    expect(
      describeRule({ freq: "monthly", interval_days: 1, by_weekday: null, by_monthday: 2 }),
    ).toBe("Monthly on the 2nd");
    expect(
      describeRule({ freq: "daily", interval_days: 1, by_weekday: null, by_monthday: null }),
    ).toBe("Every day");
  });

  it("last day of the month", () => {
    const rule: RecurrenceRule = {
      freq: "monthly",
      interval_days: 1,
      by_weekday: null,
      by_monthday: -1,
      start_date: "2026-01-01",
    };
    expect(datesInRange(rule, "2026-01-01", "2026-04-30")).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
    expect(occursOn(rule, "2028-02-29")).toBe(true);
    expect(describeRule(rule)).toBe("Monthly on the last day");
  });

  it("every N days counts from the start date", () => {
    const rule: RecurrenceRule = {
      freq: "daily",
      interval_days: 2,
      by_weekday: null,
      by_monthday: null,
      start_date: "2026-10-12",
    };
    expect(datesInRange(rule, "2026-10-12", "2026-10-17")).toEqual([
      "2026-10-12",
      "2026-10-14",
      "2026-10-16",
    ]);
    // Viewing from an odd day doesn't shift the pattern.
    expect(datesInRange(rule, "2026-10-13", "2026-10-15")).toEqual(["2026-10-14"]);
    expect(describeRule(rule)).toBe("Every other day");
    expect(describeRule({ ...rule, interval_days: 3 })).toBe("Every 3 days");
  });
});
