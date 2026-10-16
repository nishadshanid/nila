"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { useBuy } from "@/components/shopping/item-row";
import { shoppingCategoryMeta } from "@/lib/shopping-meta";
import { formatQty } from "@/lib/shopping-parse";
import type { ShoppingItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** One slim line in the Buy today box: tick, icon, name and quantity. */
export function BuyTodayItem({ item }: { item: ShoppingItem }) {
  const { bought, pending, toggle } = useBuy(item);
  const Icon = shoppingCategoryMeta(item.category).icon;
  const qty = formatQty(item.qty, item.unit);
  return (
    <li className={cn("flex items-center gap-3 transition-opacity", bought && "opacity-60")}>
      <Checkbox
        checked={bought}
        disabled={pending}
        onCheckedChange={(checked) => toggle(checked === true)}
        aria-label={`Mark ${item.name} as ${bought ? "not bought" : "bought"}`}
        className="size-5"
      />
      <Icon className="text-muted-foreground size-4 shrink-0" />
      <span className={cn("min-w-0 flex-1 truncate font-medium", bought && "line-through")}>
        {item.name}
        {qty && <span className="text-muted-foreground font-normal"> · {qty}</span>}
      </span>
    </li>
  );
}
