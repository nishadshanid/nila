"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/native-select";
import { formatTime } from "@/lib/chore-meta";
import { updateNudgeTimes } from "./actions";
import { TIMES } from "./notifications-form";

const SLOTS = ["Morning", "Afternoon", "Evening"] as const;

/** Up to three pushes a day saying how many things are still pending today. */
export function NudgeTimesForm({ times, enabled }: { times: string[]; enabled: boolean }) {
  const [slots, setSlots] = useState(() => SLOTS.map((_, i) => times[i]?.slice(0, 5) ?? ""));
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateNudgeTimes(slots.filter(Boolean));
      if (result.error) toast.error(result.error);
      else toast.success("Pending reminders saved");
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <div>
        <Label>Pending reminders</Label>
        <p className="text-muted-foreground text-xs">
          A phone notification with how many chores, todos, reminders and buys are still open today.
          Skipped when everything is done.
        </p>
      </div>
      {SLOTS.map((label, i) => (
        <div key={label} className="flex items-center justify-between gap-4">
          <Label htmlFor={`nudge-${i}`} className="font-normal">
            {label}
          </Label>
          <NativeSelect
            id={`nudge-${i}`}
            value={slots[i]}
            onChange={(e) => setSlots((s) => s.map((v, j) => (j === i ? e.target.value : v)))}
            disabled={!enabled}
            className="w-32"
          >
            <option value="">Off</option>
            {TIMES.map((t) => (
              <option key={t} value={t}>
                {formatTime(t)}
              </option>
            ))}
          </NativeSelect>
        </div>
      ))}
      <Button type="submit" disabled={pending || !enabled} className="self-start">
        Save
      </Button>
    </form>
  );
}
