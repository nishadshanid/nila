// Hand-written row types. Once the schema settles, `npm run db:types`
// generates src/lib/database.types.ts from the live database.

export type Profile = {
  id: string;
  name: string;
  email: string;
  color: string;
  email_notifications: boolean;
  push_notifications: boolean;
  digest_time: string;
  /** "HH:MM:SS" times for the "things pending" push, at most three. */
  nudge_times: string[];
  created_at: string;
  updated_at: string;
};

export type Person = Pick<Profile, "id" | "name" | "color">;

export type Priority = "low" | "med" | "high";
export type AssignmentType = "fixed" | "rotating" | "together";
export type RotationUnit = "per_week" | "per_occurrence";
export type RecurFreq = "daily" | "weekly" | "monthly";
export type OccStatus = "pending" | "done" | "skipped";

export type Chore = {
  id: string;
  title: string;
  category: string;
  notes: string | null;
  priority: Priority;
  /** Own points; null = the priority's points. */
  points: number | null;
  assignment_type: AssignmentType;
  fixed_assignee: string | null;
  rotation_order: string[] | null;
  rotation_unit: RotationUnit;
  start_date: string;
  freq: RecurFreq;
  by_weekday: number[] | null;
  /** 1–31, or -1 for the last day of the month. */
  by_monthday: number | null;
  /** Flexible chores: N times per week/month on any days. Null for scheduled chores. */
  flex_target: number | null;
  /** Daily chores repeat every N days: 1 = every day, 2 = alternate days. */
  interval_days: number;
  due_time: string | null;
  duration_min: number | null;
  remind_before_min: number | null;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ChoreOccurrence = {
  id: string;
  chore_id: string;
  date: string;
  due_time: string | null;
  assignee_id: string | null;
  original_assignee_id: string | null;
  status: OccStatus;
  completed_by: string | null;
  completed_at: string | null;
  reassign_reason: ReassignReason | null;
  reassign_note: string | null;
  reassigned_by: string | null;
  reassigned_at: string | null;
  created_at: string;
};

/** leave / sick: moved or paused by a leave. split: handed over by hand. */
export type ReassignReason = "leave" | "sick" | "split";

export type LeaveType = "away" | "sick" | "other";

export type Leave = {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  type: LeaveType;
  note: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Visibility = "personal" | "couple";
export type TaskKind = "todo" | "plan";
export type TaskStatus = "open" | "done";

export type Task = {
  id: string;
  kind: TaskKind;
  title: string;
  notes: string | null;
  priority: Priority;
  points: number | null;
  visibility: Visibility;
  owner_id: string;
  /** Couple tasks: who does it. Null = both of you. */
  assignee_id: string | null;
  /** Todo: due date (optional). Plan: the day it starts. */
  date: string | null;
  time: string | null;
  end_date: string | null;
  duration_min: number | null;
  remind_before_min: number | null;
  status: TaskStatus;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ReminderType = "birthday" | "anniversary" | "call" | "custom";
export type ReminderFreq = "once" | "daily" | "weekly" | "monthly" | "yearly";

export type Reminder = {
  id: string;
  title: string;
  type: ReminderType;
  freq: ReminderFreq;
  start_date: string;
  interval_days: number;
  by_weekday: number[] | null;
  by_monthday: number | null;
  time: string | null;
  lead_days: number;
  notes: string | null;
  visibility: Visibility;
  owner_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Urgency = "today" | "this_week" | "this_month" | "someday";

export type ShoppingItem = {
  id: string;
  name: string;
  qty: number | null;
  unit: string | null;
  category: string;
  urgency: Urgency;
  notes: string | null;
  status: "needed" | "bought";
  added_by: string;
  bought_by: string | null;
  bought_at: string | null;
  created_at: string;
  updated_at: string;
};
