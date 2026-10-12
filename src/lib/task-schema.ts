import { z } from "zod";

const TIME = /^\d{2}:\d{2}(:\d{2})?$/;
const emptyToNull = (v: string | null | undefined) => v || null;

export const taskInputSchema = z
  .object({
    kind: z.enum(["todo", "plan"]),
    title: z.string().trim().min(1, "Give it a title").max(120),
    notes: z.string().trim().max(2000).nullable().optional().transform(emptyToNull),
    priority: z.enum(["low", "med", "high"]),
    // Own points (couple todos only); null = the priority's points.
    points: z.number().int().min(0).max(100).nullable().optional(),
    visibility: z.enum(["personal", "couple"]),
    assignee_id: z.uuid().nullable().optional(),
    date: z
      .union([z.literal(""), z.iso.date()])
      .nullable()
      .optional()
      .transform(emptyToNull),
    time: z
      .union([z.literal(""), z.string().regex(TIME, "Enter a valid time")])
      .nullable()
      .optional()
      .transform(emptyToNull),
    end_date: z
      .union([z.literal(""), z.iso.date()])
      .nullable()
      .optional()
      .transform(emptyToNull),
    remind_before_min: z.number().int().min(0).max(10080).nullable().optional(),
  })
  .superRefine((t, ctx) => {
    if (t.kind === "plan" && !t.date) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "Plans need a date" });
    }
    if (t.time && !t.date) {
      ctx.addIssue({ code: "custom", path: ["time"], message: "Add a date for the time" });
    }
    if (t.end_date && t.date && t.end_date < t.date) {
      ctx.addIssue({
        code: "custom",
        path: ["end_date"],
        message: "The end can't be before the start",
      });
    }
  })
  .transform((t) => ({
    ...t,
    // Only couple tasks have an assignee; personal ones are always yours.
    assignee_id: t.visibility === "couple" ? (t.assignee_id ?? null) : null,
    end_date: t.kind === "plan" && t.end_date && t.end_date !== t.date ? t.end_date : null,
    remind_before_min: t.date ? (t.remind_before_min ?? null) : null,
    points: t.kind === "todo" && t.visibility === "couple" ? (t.points ?? null) : null,
  }));

export type TaskInput = z.input<typeof taskInputSchema>;
