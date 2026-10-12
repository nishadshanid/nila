import { Bell, Cake, Heart, Phone, type LucideIcon } from "lucide-react";
import type { ReminderType } from "@/lib/types";

export const REMINDER_TYPES: { value: ReminderType; label: string; icon: LucideIcon }[] = [
  { value: "birthday", label: "Birthday", icon: Cake },
  { value: "anniversary", label: "Anniversary", icon: Heart },
  { value: "call", label: "Call", icon: Phone },
  { value: "custom", label: "Other", icon: Bell },
];

export function reminderTypeMeta(type: ReminderType) {
  return REMINDER_TYPES.find((t) => t.value === type) ?? REMINDER_TYPES[3];
}
