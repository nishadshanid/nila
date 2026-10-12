"use client";

import { useOptimistic, useTransition } from "react";
import { EllipsisVertical, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buyAgain, deleteItem, saveItem, setBought } from "@/app/(app)/shopping/actions";
import { personById, type Person } from "@/components/chores/people";
import { daysBetween, formatDay, toISTDate, type DateStr } from "@/lib/dates";
import { shoppingCategoryMeta, URGENCIES } from "@/lib/shopping-meta";
import { formatQty } from "@/lib/shopping-parse";
import type { ShoppingItem, Urgency } from "@/lib/types";
import { cn } from "@/lib/utils";

function ago(days: number) {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/** Marks an item bought, with an Undo in the toast unless `quiet`. */
export function useBuy(item: ShoppingItem, { quiet = false } = {}) {
  const [bought, setOptimistic] = useOptimistic(item.status === "bought");
  const [pending, startTransition] = useTransition();

  function toggle(next: boolean) {
    startTransition(async () => {
      setOptimistic(next);
      const result = await setBought(item.id, next);
      if (!result.ok) {
        toast.error(result.error);
      } else if (next && !quiet) {
        toast.success(`Bought ${item.name}`, {
          action: { label: "Undo", onClick: () => void setBought(item.id, false) },
        });
      }
    });
  }

  return { bought, pending, toggle, startTransition };
}

/**
 * One shopping item.
 * - `history`: a bought item in the Bought tab, with "Buy again".
 * - `onEdit`: shows the edit / move / delete menu.
 */
export function ItemRow({
  item,
  people,
  meId,
  today,
  history = false,
  onEdit,
}: {
  item: ShoppingItem;
  people: Person[];
  meId: string;
  today: DateStr;
  history?: boolean;
  onEdit?: () => void;
}) {
  const { bought, pending, toggle, startTransition } = useBuy(item);
  const Icon = shoppingCategoryMeta(item.category).icon;
  const qty = formatQty(item.qty, item.unit);
  const nameOf = (id: string | null) =>
    id === meId ? "you" : (personById(people, id)?.name ?? "someone");
  const age = daysBetween(toISTDate(item.created_at), today);
  // A "this week" item that's been waiting over a week is worth a nudge.
  const stale = !bought && item.urgency === "this_week" && age >= 7;

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.error);
      else toast.success(success);
    });
  }

  function remove() {
    if (!confirm(`Delete "${item.name}"?`)) return;
    run(() => deleteItem(item.id), "Deleted");
  }

  function move(urgency: Urgency) {
    run(
      () =>
        saveItem(
          {
            name: item.name,
            qty: item.qty,
            unit: item.unit,
            category: item.category,
            notes: item.notes,
            urgency,
          },
          item.id,
        ),
      `Moved to ${URGENCIES.find((u) => u.value === urgency)?.label.toLowerCase()}`,
    );
  }

  return (
    <li
      className={cn(
        "bg-card flex items-center gap-3 rounded-xl border p-3 transition-opacity",
        bought && !history && "opacity-60",
      )}
    >
      {!history && (
        <Checkbox
          checked={bought}
          disabled={pending}
          onCheckedChange={(checked) => toggle(checked === true)}
          aria-label={`Mark ${item.name} as ${bought ? "still needed" : "bought"}`}
          className="size-5"
        />
      )}
      <Icon className="text-muted-foreground size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-medium", bought && !history && "line-through")}>
          {item.name}
          {qty && <span className="text-muted-foreground font-normal"> · {qty}</span>}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {history && item.bought_at ? (
            <>
              Bought by {nameOf(item.bought_by)} ·{" "}
              {formatDay(toISTDate(item.bought_at), "EEE, d MMM")}
            </>
          ) : (
            <span className={cn(stale && "text-amber-700 dark:text-amber-400")}>
              Added by {nameOf(item.added_by)} {ago(age)}
            </span>
          )}
          {item.notes && <> · {item.notes}</>}
        </p>
      </div>

      {history ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => buyAgain(item.id), `${item.name} added to this week`)}
        >
          <RotateCcw /> Buy again
        </Button>
      ) : (
        onEdit &&
        !bought && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label="Item actions" />}
            >
              <EllipsisVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Move to</DropdownMenuLabel>
                {URGENCIES.filter((u) => u.value !== item.urgency).map((u) => (
                  <DropdownMenuItem key={u.value} onClick={() => move(u.value)}>
                    <span className={cn("size-2 rounded-full", u.dot)} /> {u.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={remove}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      )}
    </li>
  );
}
