import { z } from "zod";

const TIME = /^\d{2}:\d{2}(:\d{2})?$/;

const optionalInt = (min: number, max: number) =>
  z
    .number()
    .int()
    .min(min)
    .max(max)
    .nullable()
    .optional()
    .transform((v) => v ?? null);

/** Input for creating or editing a chore. Shared by the form and the server action. */
export const choreInputSchema = z
  .object({
    title: z.string().trim().min(1, "Give the chore a name").max(80),
    category: z.string().min(1),
    notes: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .optional()
      .transform((v) => v || null),
    priority: z.enum(["low", "med", "high"]),
    assignment_type: z.enum(["fixed", "rotating", "together"]),
    fixed_assignee: z.uuid().nullable().optional(),
    rotation_order: z.array(z.uuid()).nullable().optional(),
    rotation_unit: z.enum(["per_week", "per_day", "per_occurrence"]),
    start_date: z.iso.date("Pick a start date"),
    freq: z.enum(["daily", "weekly", "monthly"]),
    by_weekday: z.array(z.number().int().min(1).max(7)).nullable().optional(),
    // 1–31, or -1 for the last day of the month.
    by_monthday: z
      .number()
      .int()
      .refine((d) => d === -1 || (d >= 1 && d <= 31), "Pick a day between 1 and 31")
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    times_per_day: z.number().int().min(1).max(4),
    // One entry per slot; "" or null means no set time for that slot.
    slot_times: z
      .array(
        z
          .union([z.literal(""), z.string().regex(TIME, "Enter a valid time")])
          .nullable()
          .transform((v) => v || null),
      )
      .nullable()
      .optional(),
    duration_min: optionalInt(1, 24 * 60),
    remind_before_min: optionalInt(0, 7 * 24 * 60),
  })
  .superRefine((c, ctx) => {
    if (c.assignment_type === "fixed" && !c.fixed_assignee) {
      ctx.addIssue({ code: "custom", path: ["fixed_assignee"], message: "Choose who does it" });
    }
    if (c.assignment_type === "rotating" && new Set(c.rotation_order ?? []).size < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["rotation_order"],
        message: "Rotation needs both of you",
      });
    }
    if (c.freq === "weekly" && !c.by_weekday?.length) {
      ctx.addIssue({ code: "custom", path: ["by_weekday"], message: "Pick at least one day" });
    }
    if (c.freq === "monthly" && !c.by_monthday) {
      ctx.addIssue({ code: "custom", path: ["by_monthday"], message: "Pick a day of the month" });
    }
  })
  // Drop fields that don't apply, so the database stays consistent.
  .transform((c) => ({
    ...c,
    fixed_assignee: c.assignment_type === "fixed" ? (c.fixed_assignee ?? null) : null,
    rotation_order: c.assignment_type === "rotating" ? (c.rotation_order ?? null) : null,
    by_weekday: c.freq === "weekly" ? [...new Set(c.by_weekday ?? [])].sort((a, b) => a - b) : null,
    by_monthday: c.freq === "monthly" ? c.by_monthday : null,
    // Store times only if at least one slot has one, sized to times_per_day.
    slot_times: c.slot_times?.some(Boolean)
      ? Array.from({ length: c.times_per_day }, (_, i) => c.slot_times?.[i] ?? null)
      : null,
    // "Every day" only differs from "every time" with several slots a day.
    rotation_unit:
      c.rotation_unit === "per_day" && c.times_per_day === 1 ? "per_occurrence" : c.rotation_unit,
  }));

export type ChoreInput = z.input<typeof choreInputSchema>;
export type ChoreValues = z.output<typeof choreInputSchema>;
