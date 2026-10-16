import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { BuyTodayItem } from "@/components/shopping/buy-today-item";
import type { ShoppingItem } from "@/lib/types";

/** How many of today's must-buys to list before "+N more". */
const SHOWN = 2;

/** Today's must-buys on the Today page in one small box, plus a count of this week's. */
export function BuyToday({ items, weekCount }: { items: ShoppingItem[]; weekCount: number }) {
  if (items.length === 0 && weekCount === 0) return null;
  const more = weekCount > 0 ? `${weekCount} more this week` : "Open list";
  return (
    <section className="mb-6">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <ShoppingCart className="size-4" />
        {items.length > 0 ? "Buy today" : "Shopping"}
        <Link
          href="/shopping"
          className="text-muted-foreground ml-auto text-xs font-normal underline-offset-2 hover:underline"
        >
          {more}
        </Link>
      </h2>
      {items.length > 0 && (
        <div className="bg-card flex items-center gap-3 rounded-xl border p-3">
          <ul className="flex min-w-0 flex-1 flex-col gap-2">
            {items.slice(0, SHOWN).map((item) => (
              <BuyTodayItem key={item.id} item={item} />
            ))}
          </ul>
          {items.length > SHOWN && (
            <Link
              href="/shopping"
              className="bg-muted text-muted-foreground hover:text-foreground shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
              aria-label={`${items.length - SHOWN} more to buy today`}
            >
              +{items.length - SHOWN}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
