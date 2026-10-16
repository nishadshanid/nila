import { describe, expect, it } from "vitest";
import { urgencyFor } from "./shopping-meta";

// Thursday 16 Oct 2026: the week runs Mon 12 – Sun 18 Oct.
const today = "2026-10-16";

describe("urgencyFor", () => {
  it("puts today and past dates under today", () => {
    expect(urgencyFor("2026-10-16", today)).toBe("today");
    expect(urgencyFor("2026-10-10", today)).toBe("today");
  });

  it("puts the rest of this week under this week", () => {
    expect(urgencyFor("2026-10-17", today)).toBe("this_week");
    expect(urgencyFor("2026-10-18", today)).toBe("this_week");
  });

  it("puts the rest of the month under this month", () => {
    expect(urgencyFor("2026-10-19", today)).toBe("this_month");
    expect(urgencyFor("2026-10-31", today)).toBe("this_month");
  });

  it("puts later dates under someday", () => {
    expect(urgencyFor("2026-11-01", today)).toBe("someday");
    expect(urgencyFor("2027-01-05", today)).toBe("someday");
  });

  it("counts a week running into next month as this week", () => {
    // Thu 29 Oct: the week ends Sun 1 Nov.
    expect(urgencyFor("2026-11-01", "2026-10-29")).toBe("this_week");
    expect(urgencyFor("2026-11-02", "2026-10-29")).toBe("someday");
  });
});
