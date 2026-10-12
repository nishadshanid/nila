import { describe, expect, it } from "vitest";
import { choreInputSchema, type ChoreInput } from "./chore-schema";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

const base: ChoreInput = {
  title: "Laundry",
  category: "laundry",
  notes: "",
  priority: "med",
  assignment_type: "rotating",
  fixed_assignee: A,
  rotation_order: [A, B],
  rotation_unit: "per_week",
  start_date: "2026-10-12",
  freq: "weekly",
  by_weekday: [1],
  by_monthday: 12,
  due_time: "",
  duration_min: null,
  remind_before_min: null,
};

describe("choreInputSchema", () => {
  it("treats empty optional fields as null", () => {
    const parsed = choreInputSchema.parse(base);
    expect(parsed.due_time).toBeNull();
    expect(parsed.notes).toBeNull();
  });

  it("accepts a time", () => {
    expect(choreInputSchema.parse({ ...base, due_time: "07:30" }).due_time).toBe("07:30");
  });

  it("rejects a malformed time", () => {
    expect(choreInputSchema.safeParse({ ...base, due_time: "7pm" }).success).toBe(false);
  });

  it("drops fields that don't apply", () => {
    const parsed = choreInputSchema.parse(base);
    expect(parsed.fixed_assignee).toBeNull();
    expect(parsed.by_monthday).toBeNull();
    expect(parsed.rotation_order).toEqual([A, B]);
  });

  it("needs weekdays for weekly chores", () => {
    expect(choreInputSchema.safeParse({ ...base, by_weekday: [] }).success).toBe(false);
  });
});
