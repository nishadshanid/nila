"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/native-select";
import { WhenPicker, type When } from "@/components/shopping/when-picker";
import { guessCategory, SHOPPING_CATEGORIES } from "@/lib/shopping-meta";
import type { ShoppingItem } from "@/lib/types";
import { saveItem } from "./actions";

const UNITS = ["", "kg", "g", "L", "ml", "pcs", "pack", "dozen", "bunch", "bottle", "box", "can"];

/** Add an item with all its details, or edit one. */
export function ItemForm({
  item,
  when: defaultWhen,
  names,
  onDone,
}: {
  item?: ShoppingItem;
  when: When;
  /** Past item names, for autocomplete. */
  names: string[];
  onDone: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [qty, setQty] = useState(item?.qty?.toString() ?? "");
  const [unit, setUnit] = useState(item?.unit ?? "");
  const [category, setCategory] = useState(item?.category ?? "grocery");
  const [categoryTouched, setCategoryTouched] = useState(item !== undefined);
  const [when, setWhen] = useState<When>(
    item ? { urgency: item.urgency, needBy: item.need_by } : defaultWhen,
  );
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [pending, startTransition] = useTransition();
  const units = unit && !UNITS.includes(unit) ? [...UNITS, unit] : UNITS;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveItem(
        {
          name,
          qty: qty ? Number(qty) : null,
          unit,
          category,
          urgency: when.urgency,
          need_by: when.needBy,
          notes,
        },
        item?.id,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(item ? "Saved" : `Added ${name.trim()}`);
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="item-name">Item</Label>
        <Input
          id="item-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!categoryTouched) setCategory(guessCategory(e.target.value));
          }}
          list="shopping-names"
          maxLength={80}
          required
          autoFocus={!item}
        />
        <datalist id="shopping-names">
          {names.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="item-qty">Quantity (optional)</Label>
          <Input
            id="item-qty"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="item-unit">Unit</Label>
          <NativeSelect id="item-unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {units.map((u) => (
              <option key={u} value={u}>
                {u || "—"}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>When do you need it?</Label>
        <WhenPicker value={when} onChange={setWhen} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="item-category">Category</Label>
        <NativeSelect
          id="item-category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setCategoryTouched(true);
          }}
        >
          {SHOPPING_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="item-notes">Notes (optional)</Label>
        <Input
          id="item-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. the brown bread, not white"
          maxLength={500}
        />
      </div>

      <Button type="submit" disabled={pending || !name.trim()}>
        {item ? "Save" : "Add to list"}
      </Button>
    </form>
  );
}
