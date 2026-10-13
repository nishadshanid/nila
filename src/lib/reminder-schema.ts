import { z } from "zod";

const TIME = /^\d{2}:\d{2}(:\d{2})?$/;

export const reminderInputSchema = z
  .object({
    title: z.string().trim().min(1, "Give it a name").max(120),
    type: z.enum(["birthday", "anniversary", "call", "custom"]),
    freq: z.enum(["once", "daily", "weekly", "monthly", "yearly"]),
    start_date: z.iso.date("Pick a date"),
    interval_days: z.number().int().min(1, "At least every day").max(365),
    by_weekday: z.array(z.number().int().min(1).max(7)).nullable().optional(),
    by_monthday: z
      .number()
      .int()
      .refine((d) => d === -1 || (d >= 1 && d <= 31), "Pick a day between 1 and 31")
      .nullable()
      .optional(),
    time: z
      .union([z.literal(""), z.string().regex(TIME, "Enter a valid time")])
      .nullable()
      .optional()
      .transform((v) => v || null),
    lead_days: z.number().int().min(0).max(30),
    notes: z
      .string()
      .trim()
      .max(1000)
      .nullable()
      .optional()
      .transform((v) => v || null),
    visibility: z.enum(["personal", "couple"]),
  })
  .superRefine((r, ctx) => {
    if (r.freq === "weekly" && !r.by_weekday?.length) {
      ctx.addIssue({ code: "custom", path: ["by_weekday"], message: "Pick at least one day" });
    }
    if (r.freq === "monthly" && !r.by_monthday) {
      ctx.addIssue({ code: "custom", path: ["by_monthday"], message: "Pick a day of the month" });
    }
  })
  .transform((r) => {
    // Birthdays and anniversaries always come back every year.
    const freq = r.type === "birthday" || r.type === "anniversary" ? "yearly" : r.freq;
    return {
      ...r,
      freq,
      interval_days: freq === "daily" ? r.interval_days : 1,
      by_weekday: freq === "weekly" ? [...new Set(r.by_weekday ?? [])].sort((a, b) => a - b) : null,
      by_monthday: freq === "monthly" ? (r.by_monthday ?? null) : null,
    };
  });

export type ReminderInput = z.input<typeof reminderInputSchema>;
