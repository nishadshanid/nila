import { z } from "zod";

export const leaveInputSchema = z
  .object({
    user_id: z.uuid("Choose who is on leave"),
    start_date: z.iso.date("Pick a start date"),
    end_date: z.iso.date("Pick an end date"),
    type: z.enum(["away", "sick", "other"]),
    note: z
      .string()
      .trim()
      .max(300)
      .nullable()
      .optional()
      .transform((v) => v || null),
  })
  .refine((l) => l.end_date >= l.start_date, {
    path: ["end_date"],
    message: "The end date can't be before the start date",
  });

export type LeaveInput = z.input<typeof leaveInputSchema>;
export type LeaveValues = z.output<typeof leaveInputSchema>;
