import { addDays, daysInMonth, startOfWeek, type DateStr } from "@/lib/dates";
import { resolveAssignment, type LeaveSpan } from "@/lib/handover";
import { reminderOccursOn, yearsSince } from "@/lib/reminder-schedule";
import { planOccurrences } from "@/lib/rotation";
import type { Chore, ChoreOccurrence, Leave, Priority, Reminder, Task } from "@/lib/types";

export type CalKind = "chore" | "todo" | "plan" | "reminder" | "leave";

/** One thing on one day of the calendar. */
export type CalItem = {
  key: string;
  kind: CalKind;
  title: string;
  date: DateStr;
  time: string | null;
  /** Who it's for; null = both of you (together chores, couple items for both). */
  personId: string | null;
  /** Only you can see it (private todo, plan or reminder). */
  personal: boolean;
  status: "open" | "done" | "skipped";
  /** Worked out from the chore's schedule; not created yet, so it may still change. */
  projected: boolean;
  priority: Priority | null;
  /** Extra line, e.g. "Covering for Asha" or "Turns 30". */
  note: string | null;
};

/** Monday before the 1st to the Sunday after the last day: the month grid. */
export function monthGrid(month: string): { from: DateStr; to: DateStr; days: DateStr[] } {
  const first = `${month}-01`;
  const last = `${month}-${String(daysInMonth(first)).padStart(2, "0")}`;
  const from = startOfWeek(first);
  const to = addDays(startOfWeek(last), 6);
  const days: DateStr[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return { from, to, days };
}

/** Dates in [from, to] that `a`–`b` covers. */
function overlapDays(a: DateStr, b: DateStr, from: DateStr, to: DateStr): DateStr[] {
  const days: DateStr[] = [];
  for (let d = a < from ? from : a; d <= b && d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

type Names = Map<string, string>;

function choreNote(
  o: Pick<ChoreOccurrence, "assignee_id" | "original_assignee_id" | "reassign_reason" | "status">,
  names: Names,
  meId: string,
): string | null {
  if (!o.reassign_reason) return null;
  const who = (id: string | null) => (id === meId ? "you" : (names.get(id ?? "") ?? "partner"));
  if (o.status === "skipped") return "Paused";
  if (o.original_assignee_id === null) return `${who(o.assignee_id)} alone`;
  return `Covering for ${who(o.original_assignee_id)}`;
}

/** Your partner's "just me" chores are theirs alone: never shown to you. */
export function visibleChore(
  chore: Pick<Chore, "assignment_type" | "fixed_assignee">,
  meId: string,
) {
  return chore.assignment_type !== "fixed" || chore.fixed_assignee === meId;
}

/**
 * Chores on the calendar: the dated rows that exist, plus "projected" ones
 * from each chore's schedule (with the same rotation and leave rules) for
 * future days that don't have a row yet. A row always wins over a projection.
 */
export function choreItems({
  rows,
  chores,
  leaves,
  people,
  names,
  meId,
  from,
  to,
  today,
}: {
  rows: (ChoreOccurrence & { chore: Chore })[];
  chores: Chore[];
  leaves: LeaveSpan[];
  /** Both partners' ids, in profile order. */
  people: string[];
  names: Names;
  meId: string;
  from: DateStr;
  to: DateStr;
  today: DateStr;
}): CalItem[] {
  const items: CalItem[] = [];
  const seen = new Set<string>();

  for (const o of rows) {
    if (!visibleChore(o.chore, meId)) continue;
    seen.add(`${o.chore_id}|${o.date}`);
    items.push({
      key: `chore-${o.id}`,
      kind: "chore",
      title: o.chore.title,
      date: o.date,
      time: o.due_time,
      personId: o.assignee_id,
      personal: o.chore.assignment_type === "fixed",
      status: o.status === "done" ? "done" : o.status === "skipped" ? "skipped" : "open",
      projected: false,
      priority: o.chore.priority,
      note: choreNote(o, names, meId),
    });
  }

  const start = from < today ? today : from;
  if (start > to) return items;
  for (const chore of chores) {
    // Flexible chores ("gym 4 times a week") have no set days; only their logs show.
    if (!chore.active || chore.flex_target != null || !visibleChore(chore, meId)) continue;
    for (const p of planOccurrences(chore, start, to)) {
      if (seen.has(`${chore.id}|${p.date}`)) continue;
      const r = resolveAssignment({
        assignmentType: chore.assignment_type,
        planned: p.assignee_id,
        date: p.date,
        leaves,
        people,
      });
      items.push({
        key: `proj-${chore.id}-${p.date}`,
        kind: "chore",
        title: chore.title,
        date: p.date,
        time: p.due_time,
        personId: r.assignee_id,
        personal: chore.assignment_type === "fixed",
        status: r.status === "skipped" ? "skipped" : "open",
        projected: true,
        priority: chore.priority,
        note: choreNote({ ...r, original_assignee_id: p.assignee_id }, names, meId),
      });
    }
  }
  return items;
}

/** Todos on their due date; plans on every day they span. */
export function taskItems(tasks: Task[], meId: string, from: DateStr, to: DateStr): CalItem[] {
  return tasks.flatMap((t) => {
    if (!t.date) return [];
    const personal = t.visibility === "personal";
    const days = t.kind === "plan" ? overlapDays(t.date, t.end_date ?? t.date, from, to) : [t.date];
    return days
      .filter((d) => d >= from && d <= to)
      .map((date) => ({
        key: `${t.kind}-${t.id}-${date}`,
        kind: t.kind,
        title: t.title,
        date,
        // A multi-day plan's time is when it starts.
        time: date === t.date ? t.time : null,
        personId: personal ? meId : t.assignee_id,
        personal,
        status: t.status === "done" ? ("done" as const) : ("open" as const),
        projected: false,
        priority: t.priority,
        note:
          t.kind === "plan" && t.end_date && t.end_date !== t.date
            ? date === t.date
              ? "Starts"
              : date === t.end_date
                ? "Last day"
                : null
            : null,
      }));
  });
}

/** Each reminder on the days it happens (no heads-up days here). */
export function reminderItems(
  reminders: Reminder[],
  acks: Set<string>,
  meId: string,
  from: DateStr,
  to: DateStr,
): CalItem[] {
  const items: CalItem[] = [];
  for (const r of reminders) {
    if (!r.active) continue;
    for (let d = from; d <= to; d = addDays(d, 1)) {
      if (!reminderOccursOn(r, d)) continue;
      const years =
        r.type === "birthday" || r.type === "anniversary" ? yearsSince(r.start_date, d) : null;
      const personal = r.visibility === "personal";
      items.push({
        key: `reminder-${r.id}-${d}`,
        kind: "reminder",
        title: r.title,
        date: d,
        time: r.time,
        personId: personal ? meId : null,
        personal,
        status: acks.has(`${r.id}|${d}`) ? "done" : "open",
        projected: false,
        priority: null,
        note:
          years === null || years <= 0
            ? null
            : r.type === "birthday"
              ? `Turns ${years}`
              : `${years} years`,
      });
    }
  }
  return items;
}

const LEAVE_WORD = { away: "Away", sick: "Sick", other: "On leave" } as const;

export function leaveItems(
  leaves: Leave[],
  names: Names,
  meId: string,
  from: DateStr,
  to: DateStr,
) {
  return leaves.flatMap((l) =>
    overlapDays(l.start_date, l.end_date, from, to).map((date): CalItem => ({
      key: `leave-${l.id}-${date}`,
      kind: "leave",
      title: `${l.user_id === meId ? "You" : (names.get(l.user_id) ?? "Partner")}: ${LEAVE_WORD[l.type]}`,
      date,
      time: null,
      personId: l.user_id,
      personal: false,
      status: "open",
      projected: false,
      priority: null,
      note: l.note,
    })),
  );
}

const KIND_ORDER: Record<CalKind, number> = { leave: 0, reminder: 1, plan: 2, chore: 3, todo: 4 };

/** Groups items by day, each day sorted: leaves, reminders, plans, then by time. */
export function byDay(items: CalItem[]): Record<DateStr, CalItem[]> {
  const days: Record<DateStr, CalItem[]> = {};
  for (const item of items) (days[item.date] ??= []).push(item);
  for (const list of Object.values(days)) {
    list.sort(
      (a, b) =>
        KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
        (a.time ?? "99").localeCompare(b.time ?? "99") ||
        a.title.localeCompare(b.title),
    );
  }
  return days;
}
