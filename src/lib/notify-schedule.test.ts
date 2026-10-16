import { describe, expect, it } from "vitest";
import {
  candidateDates,
  digestDue,
  dueAt,
  inWindow,
  istInstant,
  monthlySummaryDue,
  reminderAt,
} from "./notify-schedule";

const at = (iso: string) => Date.parse(iso);

describe("item reminders", () => {
  // Due 10:00 IST, remind 15 minutes before → 09:45 IST.
  const fire = reminderAt("2026-10-14", "10:00:00", 15);

  it("fires on the 09:45 tick", () => {
    expect(inWindow(fire, at("2026-10-14T09:45:00+05:30"))).toBe(true);
  });

  it("is caught by the next tick if one is missed, but not later", () => {
    expect(inWindow(fire, at("2026-10-14T10:00:00+05:30"))).toBe(true);
    expect(inWindow(fire, at("2026-10-14T10:15:00+05:30"))).toBe(false);
  });

  it("doesn't fire early", () => {
    expect(inWindow(fire, at("2026-10-14T09:30:00+05:30"))).toBe(false);
  });

  it("reads times with or without seconds", () => {
    expect(istInstant("2026-10-14", "10:00")).toBe(istInstant("2026-10-14", "10:00:00"));
    expect(istInstant("2026-10-14", "00:30")).toBe(at("2026-10-13T19:00:00Z"));
  });

  it("looks at tomorrow when reminders can be a day early", () => {
    const now = at("2026-10-14T20:00:00+05:30");
    expect(candidateDates(now, 0)).toEqual(["2026-10-14"]);
    expect(candidateDates(now, 24 * 60)).toEqual(["2026-10-14", "2026-10-15"]);
    // Just after midnight the window still reaches back into yesterday.
    expect(candidateDates(at("2026-10-15T00:10:00+05:30"), 0)).toEqual([
      "2026-10-14",
      "2026-10-15",
    ]);
  });
});

describe("digest", () => {
  it("is due on the tick at or just after the digest time", () => {
    expect(digestDue("07:00", at("2026-10-14T07:00:00+05:30"))).toBe("2026-10-14");
    expect(digestDue("07:00", at("2026-10-14T07:15:00+05:30"))).toBe("2026-10-14");
    expect(digestDue("07:00", at("2026-10-14T06:45:00+05:30"))).toBeNull();
    expect(digestDue("07:00", at("2026-10-14T07:45:00+05:30"))).toBeNull();
  });

  it("handles a time just before midnight", () => {
    expect(digestDue("23:50", at("2026-10-15T00:00:00+05:30"))).toBe("2026-10-14");
  });
});

describe("monthly summary", () => {
  it("is due on the 1st from 08:00 IST, for the previous month", () => {
    expect(monthlySummaryDue(at("2026-11-01T08:00:00+05:30"))).toBe("2026-10");
    expect(monthlySummaryDue(at("2026-11-01T21:00:00+05:30"))).toBe("2026-10");
    expect(monthlySummaryDue(at("2027-01-01T09:00:00+05:30"))).toBe("2026-12");
  });

  it("isn't due before 08:00 or on other days", () => {
    expect(monthlySummaryDue(at("2026-11-01T07:45:00+05:30"))).toBeNull();
    expect(monthlySummaryDue(at("2026-11-02T09:00:00+05:30"))).toBeNull();
  });
});

describe("dueAt", () => {
  it("fires once per time, on the tick at or just after it", () => {
    expect(dueAt("14:00:00", at("2026-10-16T14:00:00+05:30"))).toBe("2026-10-16");
    expect(dueAt("14:00:00", at("2026-10-16T14:15:00+05:30"))).toBe("2026-10-16");
    expect(dueAt("14:00:00", at("2026-10-16T13:45:00+05:30"))).toBeNull();
    expect(dueAt("14:00:00", at("2026-10-16T14:45:00+05:30"))).toBeNull();
  });
});
