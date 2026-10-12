// Hand-written row types. Once the schema settles, `npm run db:types`
// generates src/lib/database.types.ts from the live database.

export type Profile = {
  id: string;
  name: string;
  email: string;
  color: string;
  email_notifications: boolean;
  digest_time: string;
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
  assignment_type: AssignmentType;
  fixed_assignee: string | null;
  rotation_order: string[] | null;
  rotation_unit: RotationUnit;
  start_date: string;
  freq: RecurFreq;
  by_weekday: number[] | null;
  /** 1–31, or -1 for the last day of the month. */
  by_monthday: number | null;
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
  reassign_reason: string | null;
  created_at: string;
};
