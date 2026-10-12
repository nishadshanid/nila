import {
  Apple,
  Beef,
  CircleDot,
  Milk,
  ShoppingBasket,
  SprayCan,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { Urgency } from "@/lib/types";

/** Ordered roughly like a walk through the shop. */
export const SHOPPING_CATEGORIES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "produce", label: "Fruit & veg", icon: Apple },
  { value: "dairy", label: "Dairy & eggs", icon: Milk },
  { value: "meat", label: "Meat & fish", icon: Beef },
  { value: "grocery", label: "Grocery", icon: ShoppingBasket },
  { value: "household", label: "Household", icon: SprayCan },
  { value: "personal", label: "Personal care", icon: UserRound },
  { value: "other", label: "Other", icon: CircleDot },
];

export function shoppingCategoryMeta(value: string) {
  return SHOPPING_CATEGORIES.find((c) => c.value === value) ?? SHOPPING_CATEGORIES.at(-1)!;
}

export const URGENCIES: {
  value: Urgency;
  label: string;
  short: string;
  /** Heading color for the section. */
  text: string;
  dot: string;
}[] = [
  {
    value: "today",
    label: "Today",
    short: "Today",
    text: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
  },
  {
    value: "this_week",
    label: "This week",
    short: "Week",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  {
    value: "this_month",
    label: "This month",
    short: "Month",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  {
    value: "someday",
    label: "Someday",
    short: "Someday",
    text: "text-muted-foreground",
    dot: "bg-slate-400",
  },
];

export function urgencyMeta(value: Urgency) {
  return URGENCIES.find((u) => u.value === value) ?? URGENCIES[1];
}

const CATEGORY_GUESSES: [RegExp, string][] = [
  [/\b(milk|curd|yogh?urt|paneer|butter|ghee|cheese|eggs?|cream)\b/i, "dairy"],
  [/\b(chicken|mutton|beef|fish|prawns?|meat|sardines?|tuna)\b/i, "meat"],
  [
    /\b(onions?|tomato(es)?|potato(es)?|carrots?|beans|ginger|garlic|chill(i|ies)|coriander|curry leaves|lemons?|bananas?|apples?|oranges?|grapes|mangoes?|spinach|cabbage|cucumbers?|brinjal|okra|vegetables?|veg|fruits?|coconuts?)\b/i,
    "produce",
  ],
  [
    /\b(soap|detergent|shampoo|toothpaste|toothbrush|deodorant|razor|lotion|sanitary|pads|face ?wash)\b/i,
    "personal",
  ],
  [
    /\b(dish ?wash|vim|floor|cleaner|phenyl|harpic|tissues?|garbage bags?|bin bags?|bulbs?|batteries|mop|broom|foil)\b/i,
    "household",
  ],
];

/** A best guess at the category from the name; "grocery" when unsure. */
export function guessCategory(name: string): string {
  return CATEGORY_GUESSES.find(([re]) => re.test(name))?.[1] ?? "grocery";
}
