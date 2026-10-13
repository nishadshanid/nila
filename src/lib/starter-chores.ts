import type { ChoreInput } from "@/lib/chore-schema";
import type { DateStr } from "@/lib/dates";

export type StarterChore = {
  key: string;
  title: string;
  category: string;
  /** "Take turns each week · Saturdays" */
  summary: string;
  /** Rotating chores need both of you. */
  needsPartner: boolean;
  build: (o: { meId: string; partnerId: string | null; today: DateStr }) => ChoreInput;
};

const base = (today: DateStr) => ({
  notes: null,
  rotation_unit: "per_week" as const,
  start_date: today,
  interval_days: 1,
  flex_target: null,
  by_weekday: null,
  by_monthday: null,
  due_time: null,
  duration_min: null,
  remind_before_min: null,
  points: null,
  fixed_assignee: null,
  rotation_order: null,
});

const turns = (meId: string, partnerId: string | null) => (partnerId ? [meId, partnerId] : [meId]);

/** Common household chores to start from; each can be edited after adding. */
export const STARTER_CHORES: StarterChore[] = [
  {
    key: "laundry",
    title: "Laundry",
    category: "laundry",
    summary: "Take turns each week · Saturdays",
    needsPartner: true,
    build: ({ meId, partnerId, today }) => ({
      ...base(today),
      title: "Laundry",
      category: "laundry",
      priority: "med",
      assignment_type: "rotating",
      rotation_order: turns(meId, partnerId),
      freq: "weekly",
      by_weekday: [6],
      duration_min: 45,
    }),
  },
  {
    key: "dishes",
    title: "Dishes",
    category: "dishes",
    summary: "Take turns every day",
    needsPartner: true,
    build: ({ meId, partnerId, today }) => ({
      ...base(today),
      title: "Dishes",
      category: "dishes",
      priority: "med",
      assignment_type: "rotating",
      rotation_order: turns(meId, partnerId),
      rotation_unit: "per_occurrence",
      freq: "daily",
      due_time: "21:00",
      duration_min: 20,
    }),
  },
  {
    key: "waste",
    title: "Take out the waste",
    category: "waste",
    summary: "Take turns · Tuesdays and Fridays",
    needsPartner: true,
    build: ({ meId, partnerId, today }) => ({
      ...base(today),
      title: "Take out the waste",
      category: "waste",
      priority: "low",
      assignment_type: "rotating",
      rotation_order: turns(meId, partnerId),
      rotation_unit: "per_occurrence",
      freq: "weekly",
      by_weekday: [2, 5],
      due_time: "08:00",
    }),
  },
  {
    key: "bathroom",
    title: "Clean the bathroom",
    category: "bathroom",
    summary: "Take turns each week · Sundays",
    needsPartner: true,
    build: ({ meId, partnerId, today }) => ({
      ...base(today),
      title: "Clean the bathroom",
      category: "bathroom",
      priority: "high",
      assignment_type: "rotating",
      rotation_order: turns(meId, partnerId),
      freq: "weekly",
      by_weekday: [7],
      duration_min: 30,
    }),
  },
  {
    key: "bedsheets",
    title: "Change the bed sheets",
    category: "bed",
    summary: "Together · Sundays",
    needsPartner: false,
    build: ({ today }) => ({
      ...base(today),
      title: "Change the bed sheets",
      category: "bed",
      priority: "low",
      assignment_type: "together",
      freq: "weekly",
      by_weekday: [7],
      duration_min: 15,
    }),
  },
  {
    key: "groceries",
    title: "Grocery shopping",
    category: "groceries",
    summary: "Together · Saturdays",
    needsPartner: false,
    build: ({ today }) => ({
      ...base(today),
      title: "Grocery shopping",
      category: "groceries",
      priority: "med",
      assignment_type: "together",
      freq: "weekly",
      by_weekday: [6],
      due_time: "10:00",
      duration_min: 60,
    }),
  },
  {
    key: "plants",
    title: "Water the plants",
    category: "plants",
    summary: "Take turns · every other day",
    needsPartner: true,
    build: ({ meId, partnerId, today }) => ({
      ...base(today),
      title: "Water the plants",
      category: "plants",
      priority: "low",
      assignment_type: "rotating",
      rotation_order: turns(meId, partnerId),
      rotation_unit: "per_occurrence",
      freq: "daily",
      interval_days: 2,
      due_time: "07:30",
    }),
  },
];
