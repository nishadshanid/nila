import { z } from "zod";
import { SHOPPING_CATEGORIES } from "@/lib/shopping-meta";

const emptyToNull = (v: string | null | undefined) => v || null;

export const shoppingInputSchema = z.object({
  name: z.string().trim().min(1, "What do you need?").max(80),
  qty: z.number().positive("Quantity must be more than 0").lt(100000).nullable().optional(),
  unit: z.string().trim().max(12).nullable().optional().transform(emptyToNull),
  category: z.enum(SHOPPING_CATEGORIES.map((c) => c.value) as [string, ...string[]]),
  urgency: z.enum(["today", "this_week", "this_month", "someday"]),
  need_by: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date")
    .nullable()
    .optional()
    .transform(emptyToNull),
  notes: z.string().trim().max(500).nullable().optional().transform(emptyToNull),
});

export type ShoppingInput = z.input<typeof shoppingInputSchema>;
