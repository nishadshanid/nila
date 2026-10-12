"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { Plus, ShoppingCart, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/native-select";
import { Segmented } from "@/components/segmented";
import { ItemRow } from "@/components/shopping/item-row";
import type { Person } from "@/components/chores/people";
import type { DateStr } from "@/lib/dates";
import {
  guessCategory,
  SHOPPING_CATEGORIES,
  shoppingCategoryMeta,
  URGENCIES,
} from "@/lib/shopping-meta";
import { parseQuickAdd } from "@/lib/shopping-parse";
import type { ShoppingItem, Urgency } from "@/lib/types";
import { cn } from "@/lib/utils";
import { saveItem } from "./actions";
import { ItemForm } from "./item-form";
import { ShoppingMode } from "./shopping-mode";

const CATEGORY_ORDER = SHOPPING_CATEGORIES.map((c) => c.value);

function byCategory(a: ShoppingItem, b: ShoppingItem) {
  return (
    CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
    a.name.localeCompare(b.name)
  );
}

export function ShoppingView({
  items,
  names,
  people,
  me,
  today,
}: {
  items: ShoppingItem[];
  names: string[];
  people: Person[];
  me: Person;
  today: DateStr;
}) {
  const [tab, setTab] = useState<"list" | "bought">("list");
  const [text, setText] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("this_week");
  // "auto" guesses from the name (milk → Dairy); picking one sticks until you add.
  const [category, setCategory] = useState("auto");
  const [editing, setEditing] = useState<{ item?: ShoppingItem } | null>(null);
  const [shopping, setShopping] = useState(false);
  const [includeSomeday, setIncludeSomeday] = useState(false);
  const [pending, startTransition] = useTransition();
  const closeShopping = useCallback(() => setShopping(false), []);

  const needed = items.filter((i) => i.status === "needed");
  const bought = useMemo(
    () =>
      items
        .filter((i) => i.status === "bought")
        .sort((a, b) => (b.bought_at ?? "").localeCompare(a.bought_at ?? "")),
    [items],
  );
  const parsed = text.trim() ? parseQuickAdd(text) : null;
  const guessed = parsed ? guessCategory(parsed.name) : null;

  function quickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed?.name) return;
    const chosen = category === "auto" ? (guessed ?? "grocery") : category;
    startTransition(async () => {
      const result = await saveItem({ ...parsed, category: chosen, urgency });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setText("");
      setCategory("auto");
    });
  }

  return (
    <>
      <Segmented
        aria-label="List"
        value={tab}
        onChange={setTab}
        className="mb-4"
        options={[
          { value: "list", label: `To buy (${needed.length})` },
          { value: "bought", label: "Bought" },
        ]}
      />

      {tab === "list" ? (
        <>
          <form onSubmit={quickAdd} className="mb-4 flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. 2 kg rice, milk, 1.5L oil"
                aria-label="New item"
                list="shopping-quick-names"
                maxLength={100}
                disabled={pending}
              />
              <datalist id="shopping-quick-names">
                {names.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              <Button type="submit" disabled={pending || !parsed?.name} aria-label="Add item">
                <Plus />
              </Button>
              <Button
                type="button"
                variant="outline"
                aria-label="Add with details"
                onClick={() => setEditing({})}
              >
                <SlidersHorizontal />
              </Button>
            </div>
            <div className="flex gap-2">
              <Segmented
                aria-label="When do you need it?"
                value={urgency}
                onChange={setUrgency}
                className="flex-1"
                options={URGENCIES.map((u) => ({
                  value: u.value,
                  label: (
                    <>
                      <span className={cn("size-1.5 rounded-full", u.dot)} />
                      {u.short}
                    </>
                  ),
                }))}
              />
              <NativeSelect
                aria-label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-32 shrink-0"
              >
                <option value="auto">
                  {guessed ? shoppingCategoryMeta(guessed).label : "Auto"}
                </option>
                {SHOPPING_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            {parsed && (parsed.qty !== null || parsed.name !== text.trim()) && (
              <p className="text-muted-foreground text-xs">
                Adds <span className="text-foreground font-medium">{parsed.name}</span>
                {parsed.qty !== null && (
                  <>
                    {" "}
                    × {parsed.qty}
                    {parsed.unit ? ` ${parsed.unit}` : ""}
                  </>
                )}
              </p>
            )}
          </form>

          {needed.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Button size="lg" className="flex-1 sm:flex-none" onClick={() => setShopping(true)}>
                <ShoppingCart /> Start shopping
              </Button>
              {needed.some((i) => i.urgency === "someday") && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="include-someday"
                    checked={includeSomeday}
                    onCheckedChange={setIncludeSomeday}
                  />
                  <Label htmlFor="include-someday" className="text-muted-foreground font-normal">
                    Include someday
                  </Label>
                </div>
              )}
            </div>
          )}

          {needed.length === 0 ? (
            <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
              Nothing to buy. Add things as you notice they&apos;re running out; you both see this
              list.
            </p>
          ) : (
            URGENCIES.map((u) => {
              const group = needed.filter((i) => i.urgency === u.value).sort(byCategory);
              if (group.length === 0) return null;
              return (
                <section key={u.value} className="mb-6">
                  <h2 className={cn("mb-2 flex items-center gap-2 text-sm font-semibold", u.text)}>
                    <span className={cn("size-2 rounded-full", u.dot)} />
                    {u.label}
                    <span className="text-muted-foreground font-normal">{group.length}</span>
                  </h2>
                  <ul className="flex flex-col gap-2">
                    {group.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        people={people}
                        meId={me.id}
                        today={today}
                        onEdit={() => setEditing({ item })}
                      />
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </>
      ) : bought.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
          Things you tick off show up here for 30 days, so you can buy them again in one tap.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {bought.map((item) => (
            <ItemRow key={item.id} item={item} people={people} meId={me.id} today={today} history />
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.item ? "Edit item" : "Add item"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <ItemForm
              key={editing.item?.id ?? "new"}
              item={editing.item}
              urgency={urgency}
              names={names}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {shopping && (
        <ShoppingMode items={items} includeSomeday={includeSomeday} onClose={closeShopping} />
      )}
    </>
  );
}
