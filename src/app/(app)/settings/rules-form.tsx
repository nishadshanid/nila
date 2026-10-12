"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveRules } from "@/app/(app)/points/actions";
import type { PointRules } from "@/lib/points";

const FIELDS: { key: keyof PointRules; label: string }[] = [
  { key: "low", label: "Low priority" },
  { key: "med", label: "Medium priority" },
  { key: "high", label: "High priority" },
  { key: "cover_bonus", label: "Covering bonus" },
];

/** Points per priority, shared by both of you. */
export function RulesForm({ rules }: { rules: PointRules }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(FIELDS.map(({ key }) => [key, String(rules[key])])),
  );
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveRules({
        low: Number(values.low),
        med: Number(values.med),
        high: Number(values.high),
        cover_bonus: Number(values.cover_bonus),
      });
      if (result.ok) toast.success("Point rules saved");
      else toast.error(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-2">
            <Label htmlFor={`rule-${key}`}>{label}</Label>
            <Input
              id={`rule-${key}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              required
              value={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        A chore or couple todo can also have its own points. The covering bonus is extra for doing a
        chore that was someone else&apos;s turn, or a together chore alone. Changes only apply from
        now on; points already earned stay.
      </p>
      <Button type="submit" disabled={pending} className="self-start">
        Save
      </Button>
    </form>
  );
}
