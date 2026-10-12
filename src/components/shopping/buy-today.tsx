import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { ItemRow } from "@/components/shopping/item-row";
import type { DateStr } from "@/lib/dates";
import type { Person, ShoppingItem } from "@/lib/types";

/** Today's must-buys on the Today page, plus a count of this week's. */
export function BuyToday({
  items,
  weekCount,
  people,
  meId,
  today,
}: {
  items: ShoppingItem[];
  weekCount: number;
  people: Person[];
  meId: string;
  today: DateStr;
}) {
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
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} people={people} meId={meId} today={today} />
          ))}
        </ul>
      )}
    </section>
  );
}
