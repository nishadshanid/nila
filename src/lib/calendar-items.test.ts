import { describe, expect, it } from "vitest";
import {
  byDay,
  choreItems,
  leaveItems,
  monthGrid,
  reminderItems,
  taskItems,
} from "./calendar-items";
import { planOccurrences } from "./rotation";
import type { Chore, ChoreOccurrence, Leave, Reminder, Task } from "./types";

const A = "user-a";
const B = "user-b";
const names = new Map([
  [A, "Nishad"],
  [B, "Asha"],
]);

function chore(overrides: Partial<Chore> = {}): Chore {
  return {
    id: "laundry",
    title: "Laundry",
    category: "laundry",
    notes: null,
    priority: "med",
    points: null,
    assignment_type: "rotating",
    fixed_assignee: null,
    rotation_order: [A, B],
    rotation_unit: "per_week",
    start_date: "2026-10-12",
    freq: "weekly",
    by_weekday: [1],
    by_monthday: null,
    interval_days: 1,
    flex_target: null,
    due_time: null,
    duration_min: null,
    remind_before_min: null,
    active: true,
    created_by: A,
    created_at: "",
    updated_at: "",
    ...overrides,
  } as Chore;
}

function row(c: Chore, date: string, overrides: Partial<ChoreOccurrence> = {}) {
  return {
    id: `${c.id}-${date}`,
    chore_id: c.id,
    date,
    due_time: null,
    assignee_id: A,
    original_assignee_id: A,
    status: "pending",
    completed_by: null,
    completed_at: null,
    reassign_reason: null,
    reassign_note: null,
    reassigned_by: null,
    reassigned_at: null,
    created_at: "",
    ...overrides,
    chore: c,
  } as ChoreOccurrence & { chore: Chore };
}

const base = { leaves: [], people: [A, B], names, meId: A };

describe("monthGrid", () => {
  it("runs Monday to Sunday around the month", () => {
    const { from, to, days } = monthGrid("2026-10");
    expect(from).toBe("2026-09-28");
    expect(to).toBe("2026-11-01");
    expect(days).toHaveLength(35);
  });
});

describe("choreItems", () => {
  it("projects a month of weekly rotation with the right person each week", () => {
    const c = chore();
    const items = choreItems({
      ...base,
      rows: [],
      chores: [c],
      from: "2026-10-12",
      to: "2026-11-08",
      today: "2026-10-12",
    });
    expect(items.map((i) => [i.date, i.personId, i.projected])).toEqual([
      ["2026-10-12", A, true],
      ["2026-10-19", B, true],
      ["2026-10-26", A, true],
      ["2026-11-02", B, true],
    ]);
    // Same as what the materializer would create.
    expect(items.map((i) => i.personId)).toEqual(
      planOccurrences(c, "2026-10-12", "2026-11-08").map((o) => o.assignee_id),
    );
  });

  it("uses an existing row instead of projecting, so nothing is doubled", () => {
    const c = chore();
    const handedOver = row(c, "2026-10-12", {
      assignee_id: B,
      original_assignee_id: A,
      reassign_reason: "split",
    });
    const items = choreItems({
      ...base,
      rows: [handedOver],
      chores: [c],
      from: "2026-10-12",
      to: "2026-10-19",
      today: "2026-10-12",
    });
    expect(items).toHaveLength(2);
    const first = items.find((i) => i.date === "2026-10-12")!;
    expect(first.projected).toBe(false);
    expect(first.personId).toBe(B);
    expect(first.note).toBe("Covering for you");
  });

  it("moves projected turns to the partner during a leave", () => {
    const leave = {
      user_id: A,
      start_date: "2026-10-25",
      end_date: "2026-10-28",
      type: "away",
    } as const;
    const items = choreItems({
      ...base,
      leaves: [leave],
      rows: [],
      chores: [chore()],
      from: "2026-10-26",
      to: "2026-10-26",
      today: "2026-10-12",
    });
    expect(items[0]).toMatchObject({ personId: B, note: "Covering for you", status: "open" });
  });

  it("doesn't project past days", () => {
    const items = choreItems({
      ...base,
      rows: [],
      chores: [chore()],
      from: "2026-10-12",
      to: "2026-10-26",
      today: "2026-10-20",
    });
    expect(items.map((i) => i.date)).toEqual(["2026-10-26"]);
  });

  it("hides your partner's own chores but shows yours", () => {
    const mine = chore({
      id: "gym",
      title: "Gym",
      assignment_type: "fixed",
      fixed_assignee: A,
      rotation_order: null,
    });
    const hers = chore({
      id: "yoga",
      title: "Yoga",
      assignment_type: "fixed",
      fixed_assignee: B,
      rotation_order: null,
    });
    const items = choreItems({
      ...base,
      rows: [row(hers, "2026-10-12", { assignee_id: B, original_assignee_id: B })],
      chores: [mine, hers],
      from: "2026-10-12",
      to: "2026-10-12",
      today: "2026-10-12",
    });
    expect(items.map((i) => [i.title, i.personId])).toEqual([["Gym", A]]);
  });

  it("skips flexible chores' schedule but shows their logs", () => {
    const gym = chore({
      id: "gym",
      freq: "weekly",
      flex_target: 4,
      assignment_type: "fixed",
      fixed_assignee: A,
      rotation_order: null,
      by_weekday: null,
    });
    const items = choreItems({
      ...base,
      rows: [row(gym, "2026-10-13", { status: "done" })],
      chores: [gym],
      from: "2026-10-12",
      to: "2026-10-18",
      today: "2026-10-12",
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ date: "2026-10-13", status: "done", projected: false });
  });
});

describe("taskItems", () => {
  const task = (o: Partial<Task>) =>
    ({
      id: "t",
      kind: "todo",
      title: "T",
      notes: null,
      priority: "med",
      points: null,
      visibility: "couple",
      owner_id: A,
      assignee_id: null,
      date: "2026-10-14",
      time: null,
      end_date: null,
      status: "open",
      ...o,
    }) as Task;

  it("puts a multi-day plan on each day in range", () => {
    const items = taskItems(
      [task({ kind: "plan", date: "2026-10-30", end_date: "2026-11-03", time: "18:00:00" })],
      A,
      "2026-09-28",
      "2026-11-01",
    );
    expect(items.map((i) => [i.date, i.time, i.note])).toEqual([
      ["2026-10-30", "18:00:00", "Starts"],
      ["2026-10-31", null, null],
      ["2026-11-01", null, null],
    ]);
  });

  it("shows private todos as yours", () => {
    const [item] = taskItems([task({ visibility: "personal" })], A, "2026-10-01", "2026-10-31");
    expect(item).toMatchObject({ personId: A, personal: true });
  });
});

describe("reminderItems and leaveItems", () => {
  it("shows a birthday with the age and whether it was ticked", () => {
    const r = {
      id: "r",
      title: "Amma's birthday",
      type: "birthday",
      freq: "yearly",
      start_date: "1965-10-20",
      interval_days: 1,
      by_weekday: null,
      by_monthday: null,
      time: null,
      lead_days: 1,
      notes: null,
      visibility: "couple",
      owner_id: A,
      active: true,
    } as unknown as Reminder;
    const [item] = reminderItems([r], new Set(["r|2026-10-20"]), A, "2026-10-01", "2026-10-31");
    expect(item).toMatchObject({
      date: "2026-10-20",
      note: "Turns 61",
      status: "done",
      personId: null,
    });
  });

  it("shades each day of a leave", () => {
    const leave = {
      id: "l",
      user_id: B,
      start_date: "2026-10-30",
      end_date: "2026-11-02",
      type: "sick",
      note: null,
    } as Leave;
    const items = leaveItems([leave], names, A, "2026-09-28", "2026-11-01");
    expect(items.map((i) => i.date)).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
    expect(items[0].title).toBe("Asha: Sick");
  });
});

describe("byDay", () => {
  it("groups and orders leaves, reminders, plans, then by time", () => {
    const mk = (kind: "chore" | "leave" | "plan", time: string | null, title: string) =>
      ({ key: title, kind, title, date: "2026-10-14", time }) as never;
    const days = byDay([
      mk("chore", "18:00", "b"),
      mk("chore", "07:00", "a"),
      mk("leave", null, "l"),
      mk("plan", null, "p"),
    ]);
    expect(days["2026-10-14"].map((i) => i.title)).toEqual(["l", "p", "a", "b"]);
  });
});
