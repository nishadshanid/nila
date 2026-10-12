"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuy } from "@/components/shopping/item-row";
import { SHOPPING_CATEGORIES, urgencyMeta } from "@/lib/shopping-meta";
import { formatQty } from "@/lib/shopping-parse";
import type { ShoppingItem } from "@/lib/types";
import { cn } from "@/lib/utils";

function ModeRow({ item }: { item: ShoppingItem }) {
  const { bought, pending, toggle } = useBuy(item, { quiet: true });
  const qty = formatQty(item.qty, item.unit);
  const urgency = urgencyMeta(item.urgency);
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={bought}
        disabled={pending}
        onClick={() => toggle(!bought)}
        className={cn(
          "bg-card flex min-h-14 w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition-opacity active:scale-[0.99]",
          bought && "opacity-50",
        )}
      >
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full border-2",
            bought ? "border-primary bg-primary text-primary-foreground" : "border-input",
          )}
        >
          {bought && <Check className="size-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-lg font-medium", bought && "line-through")}>
            {item.name}
          </span>
          {(qty || item.notes) && (
            <span className="text-muted-foreground block text-sm">
              {[qty, item.notes].filter(Boolean).join(" · ")}
            </span>
          )}
        </span>
        {item.urgency === "today" && !bought && (
          <span className={cn("text-xs font-semibold", urgency.text)}>Today</span>
        )}
      </button>
    </li>
  );
}

/**
 * Full screen, big tap targets, grouped by category like the shop's aisles.
 * Items ticked here stay (crossed out, at the bottom) until you close it.
 */
export function ShoppingMode({
  items,
  includeSomeday,
  onClose,
}: {
  items: ShoppingItem[];
  includeSomeday: boolean;
  onClose: () => void;
}) {
  // The items on the list when you started; ticked ones stay visible.
  const [ids] = useState(
    () =>
      new Set(
        items
          .filter((i) => i.status === "needed" && (includeSomeday || i.urgency !== "someday"))
          .map((i) => i.id),
      ),
  );
  const trip = items.filter((i) => ids.has(i.id));
  const left = trip.filter((i) => i.status === "needed").length;

  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shopping mode"
      className="bg-background fixed inset-0 z-50 flex flex-col"
    >
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div>
          <p className="text-lg font-semibold">Shopping mode</p>
          <p className="text-muted-foreground text-sm">
            {left === 0 ? "All done!" : `${left} of ${trip.length} left`}
          </p>
        </div>
        <Button size="lg" variant="outline" onClick={onClose}>
          <X /> Done
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {trip.length === 0 ? (
          <p className="text-muted-foreground mt-10 text-center">Nothing to buy right now.</p>
        ) : (
          SHOPPING_CATEGORIES.map((category) => {
            const group = trip
              .filter((i) => i.category === category.value)
              .sort(
                (a, b) =>
                  Number(a.status === "bought") - Number(b.status === "bought") ||
                  Number(b.urgency === "today") - Number(a.urgency === "today") ||
                  a.name.localeCompare(b.name),
              );
            if (group.length === 0) return null;
            const Icon = category.icon;
            return (
              <section key={category.value} className="mb-6">
                <h2 className="text-muted-foreground mb-2 flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                  <Icon className="size-4" /> {category.label}
                </h2>
                <ul className="flex flex-col gap-2">
                  {group.map((item) => (
                    <ModeRow key={item.id} item={item} />
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
