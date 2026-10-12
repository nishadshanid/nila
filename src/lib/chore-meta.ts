import {
  Bath,
  BedDouble,
  CircleDot,
  CookingPot,
  ShoppingBasket,
  Sparkles,
  Sprout,
  Trash2,
  Utensils,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";
import type { Priority } from "@/lib/types";

export const CHORE_CATEGORIES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "laundry", label: "Laundry", icon: WashingMachine },
  { value: "cooking", label: "Cooking", icon: CookingPot },
  { value: "dishes", label: "Dishes", icon: Utensils },
  { value: "cleaning", label: "Cleaning", icon: Sparkles },
  { value: "bathroom", label: "Bathroom", icon: Bath },
  { value: "bed", label: "Bed", icon: BedDouble },
  { value: "waste", label: "Waste", icon: Trash2 },
  { value: "groceries", label: "Groceries", icon: ShoppingBasket },
  { value: "plants", label: "Plants", icon: Sprout },
  { value: "other", label: "Other", icon: CircleDot },
];

export function categoryMeta(value: string) {
  return CHORE_CATEGORIES.find((c) => c.value === value) ?? CHORE_CATEGORIES.at(-1)!;
}

export const PRIORITIES: { value: Priority; label: string; dot: string }[] = [
  { value: "low", label: "Low", dot: "bg-slate-400" },
  { value: "med", label: "Medium", dot: "bg-amber-500" },
  { value: "high", label: "High", dot: "bg-red-500" },
];

export function priorityMeta(value: Priority) {
  return PRIORITIES.find((p) => p.value === value) ?? PRIORITIES[1];
}

/** "07:30:00" → "7:30 AM" */
export function formatTime(time: string | null) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}
