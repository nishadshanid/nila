import { describe, expect, it } from "vitest";
import {
  nextOccurrence,
  reminderOccursOn,
  reminderOnDay,
  type ReminderRule,
} from "./reminder-schedule";

const birthday: ReminderRule & { lead_days: number } = {
  freq: "yearly",
  start_date: "1965-03-14",
  interval_days: 1,
  by_weekday: null,
  by_monthday: null,
  lead_days: 2,
};

describe("reminders", () => {
  it("yearly reminders repeat on the same day every year", () => {
    expect(reminderOccursOn(birthday, "2027-03-14")).toBe(true);
    expect(reminderOccursOn(birthday, "2027-03-15")).toBe(false);
    expect(nextOccurrence(birthday, "2026-10-12")).toBe("2027-03-14");
  });

  it("a 29 Feb birthday falls on 28 Feb in other years", () => {
    const leap = { ...birthday, start_date: "1996-02-29" };
    expect(reminderOccursOn(leap, "2027-02-28")).toBe(true);
    expect(reminderOccursOn(leap, "2028-02-28")).toBe(false);
    expect(reminderOccursOn(leap, "2028-02-29")).toBe(true);
  });

  it("shows a heads-up within the lead days", () => {
    expect(reminderOnDay(birthday, "2027-03-12")).toEqual({ date: "2027-03-14", inDays: 2 });
    expect(reminderOnDay(birthday, "2027-03-11")).toBeNull();
    expect(reminderOnDay(birthday, "2027-03-14")).toEqual({ date: "2027-03-14", inDays: 0 });
  });

  it("once reminders happen only on their date", () => {
    const once: ReminderRule = { ...birthday, freq: "once", start_date: "2026-10-20" };
    expect(reminderOccursOn(once, "2026-10-20")).toBe(true);
    expect(nextOccurrence(once, "2026-10-21")).toBeNull();
  });

  it("weekly reminders use the chore recurrence", () => {
    const call: ReminderRule = {
      ...birthday,
      freq: "weekly",
      start_date: "2026-10-01",
      by_weekday: [7],
    };
    expect(reminderOccursOn(call, "2026-10-18")).toBe(true); // Sunday
    expect(reminderOccursOn(call, "2026-10-17")).toBe(false);
  });
});
