import { describe, expect, it } from "vitest";
import { resolveAssignment, type LeaveSpan } from "./handover";

const A = "user-a";
const B = "user-b";
const people = [A, B];
const aAway: LeaveSpan = {
  user_id: A,
  start_date: "2026-10-12",
  end_date: "2026-10-14",
  type: "away",
};
const bSick: LeaveSpan = {
  user_id: B,
  start_date: "2026-10-14",
  end_date: "2026-10-14",
  type: "sick",
};

const resolve = (
  assignmentType: "fixed" | "rotating" | "together",
  planned: string | null,
  date: string,
  leaves: LeaveSpan[],
) => resolveAssignment({ assignmentType, planned, date, leaves, people });

describe("resolveAssignment", () => {
  it("leaves chores alone when nobody is on leave", () => {
    expect(resolve("rotating", A, "2026-10-12", [])).toEqual({
      assignee_id: A,
      status: "pending",
      reassign_reason: null,
    });
  });

  it("moves a take-turns chore to the partner during leave", () => {
    expect(resolve("rotating", A, "2026-10-13", [aAway])).toEqual({
      assignee_id: B,
      status: "pending",
      reassign_reason: "leave",
    });
  });

  it("only applies inside the leave dates", () => {
    expect(resolve("rotating", A, "2026-10-15", [aAway]).assignee_id).toBe(A);
    expect(resolve("rotating", A, "2026-10-11", [aAway]).assignee_id).toBe(A);
  });

  it("pauses personal chores during your own leave", () => {
    expect(resolve("fixed", A, "2026-10-12", [aAway])).toEqual({
      assignee_id: A,
      status: "skipped",
      reassign_reason: "leave",
    });
  });

  it("together chores go to whoever is at home", () => {
    expect(resolve("together", null, "2026-10-12", [aAway])).toEqual({
      assignee_id: B,
      status: "pending",
      reassign_reason: "leave",
    });
  });

  it("uses 'sick' as the reason for sick leave", () => {
    expect(resolve("rotating", B, "2026-10-14", [bSick])).toEqual({
      assignee_id: A,
      status: "pending",
      reassign_reason: "sick",
    });
  });

  it("pauses chores when both of you are away", () => {
    expect(resolve("rotating", A, "2026-10-14", [aAway, bSick]).status).toBe("skipped");
    expect(resolve("together", null, "2026-10-14", [aAway, bSick])).toEqual({
      assignee_id: null,
      status: "skipped",
      reassign_reason: "leave",
    });
  });
});
