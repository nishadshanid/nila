import { describe, expect, it } from "vitest";
import { missedLabel, withMissed } from "./missed-chores";

const row = (chore_id: string, date: string, assignee_id: string | null = "a") => ({
  chore_id,
  date,
  assignee_id,
});

describe("withMissed", () => {
  it("marks today's row with the earlier misses of the same chore", () => {
    const rows = withMissed(
      [row("dishes", "2026-10-16")],
      [row("dishes", "2026-10-15"), row("dishes", "2026-10-14")],
    );
    expect(rows).toEqual([
      { ...row("dishes", "2026-10-16"), missed: ["2026-10-14", "2026-10-15"] },
    ]);
  });

  it("carries a missed chore with no row today as its latest miss", () => {
    const rows = withMissed([], [row("bins", "2026-10-09"), row("bins", "2026-10-02")]);
    expect(rows).toEqual([{ ...row("bins", "2026-10-09"), missed: ["2026-10-02", "2026-10-09"] }]);
  });

  it("keeps each person's misses apart", () => {
    const rows = withMissed([row("mop", "2026-10-16", "b")], [row("mop", "2026-10-15", "a")]);
    expect(rows).toHaveLength(2);
    expect(rows[0].missed).toEqual([]);
    expect(rows[1]).toMatchObject({ assignee_id: "a", missed: ["2026-10-15"] });
  });
});

describe("missedLabel", () => {
  const fmt = (d: string) => d;
  it("words it by how many were missed", () => {
    expect(missedLabel([], "2026-10-15", fmt)).toBeNull();
    expect(missedLabel(["2026-10-15"], "2026-10-15", fmt)).toBe("Missed yesterday");
    expect(missedLabel(["2026-10-13"], "2026-10-15", fmt)).toBe("Missed since 2026-10-13");
    expect(missedLabel(["2026-10-13", "2026-10-15"], "2026-10-15", fmt)).toBe(
      "Missed 2 times · since 2026-10-13",
    );
  });
});
