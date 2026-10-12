import type { DateStr } from "@/lib/dates";
import type { AssignmentType, Leave, ReassignReason } from "@/lib/types";

type LeaveReason = Exclude<ReassignReason, "split">;

export type LeaveSpan = Pick<Leave, "user_id" | "start_date" | "end_date" | "type">;

export function leaveOn(leaves: LeaveSpan[], userId: string | null, date: DateStr) {
  if (!userId) return undefined;
  return leaves.find((l) => l.user_id === userId && l.start_date <= date && date <= l.end_date);
}

const reasonFor = (leave: LeaveSpan): LeaveReason => (leave.type === "sick" ? "sick" : "leave");

export type Resolution = {
  assignee_id: string | null;
  status: "pending" | "skipped";
  reassign_reason: LeaveReason | null;
};

/**
 * Who actually does a chore on `date`, given who it was planned for (`planned`,
 * null = together) and any leaves.
 * - Take-turns chores move to the partner while the planned person is on leave.
 * - Together chores are done by whoever is at home.
 * - "Just me" chores are personal, so they pause during your own leave.
 * - If nobody is at home, the chore is paused.
 */
export function resolveAssignment({
  assignmentType,
  planned,
  date,
  leaves,
  people,
}: {
  assignmentType: AssignmentType;
  planned: string | null;
  date: DateStr;
  leaves: LeaveSpan[];
  /** Both partners' ids. */
  people: string[];
}): Resolution {
  const asPlanned: Resolution = { assignee_id: planned, status: "pending", reassign_reason: null };

  if (assignmentType === "together") {
    const away = people.map((id) => leaveOn(leaves, id, date));
    const home = people.filter((_, i) => !away[i]);
    const firstAway = away.find(Boolean);
    if (!firstAway) return asPlanned;
    const reason = reasonFor(firstAway);
    if (home.length === 0) return { assignee_id: null, status: "skipped", reassign_reason: reason };
    return { assignee_id: home[0], status: "pending", reassign_reason: reason };
  }

  const leave = leaveOn(leaves, planned, date);
  if (!leave) return asPlanned;
  const reason = reasonFor(leave);

  if (assignmentType === "fixed") {
    return { assignee_id: planned, status: "skipped", reassign_reason: reason };
  }
  const partner = people.find((id) => id !== planned);
  if (!partner || leaveOn(leaves, partner, date)) {
    return { assignee_id: planned, status: "skipped", reassign_reason: reason };
  }
  return { assignee_id: partner, status: "pending", reassign_reason: reason };
}
