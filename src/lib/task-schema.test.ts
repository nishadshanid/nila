import { describe, expect, it } from "vitest";
import { taskInputSchema, type TaskInput } from "./task-schema";

const A = "11111111-1111-4111-8111-111111111111";
const todo: TaskInput = {
  kind: "todo",
  title: "Pay bill",
  priority: "med",
  visibility: "personal",
};

describe("taskInputSchema", () => {
  it("todos don't need a date", () => {
    const parsed = taskInputSchema.parse({ ...todo, date: "", time: "" });
    expect(parsed.date).toBeNull();
    expect(parsed.time).toBeNull();
  });

  it("plans need a date", () => {
    expect(taskInputSchema.safeParse({ ...todo, kind: "plan" }).success).toBe(false);
    expect(taskInputSchema.safeParse({ ...todo, kind: "plan", date: "2026-10-20" }).success).toBe(
      true,
    );
  });

  it("a time needs a date", () => {
    expect(taskInputSchema.safeParse({ ...todo, time: "10:00" }).success).toBe(false);
  });

  it("personal tasks never have an assignee", () => {
    expect(taskInputSchema.parse({ ...todo, assignee_id: A }).assignee_id).toBeNull();
    expect(
      taskInputSchema.parse({ ...todo, visibility: "couple", assignee_id: A }).assignee_id,
    ).toBe(A);
  });

  it("only plans keep an end date, and it can't be before the start", () => {
    expect(
      taskInputSchema.parse({ ...todo, date: "2026-10-20", end_date: "2026-10-22" }).end_date,
    ).toBeNull();
    const plan = { ...todo, kind: "plan" as const, date: "2026-10-20" };
    expect(taskInputSchema.parse({ ...plan, end_date: "2026-10-22" }).end_date).toBe("2026-10-22");
    expect(taskInputSchema.safeParse({ ...plan, end_date: "2026-10-19" }).success).toBe(false);
  });
});
