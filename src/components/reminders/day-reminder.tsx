"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { ackReminder } from "@/app/(app)/reminders/actions";
import { formatTime } from "@/lib/chore-meta";
import { formatDay } from "@/lib/dates";
import { reminderTypeMeta } from "@/lib/reminder-meta";
import { yearsSince } from "@/lib/reminder-schedule";
import type { DayReminder } from "@/lib/reminders";
import { cn } from "@/lib/utils";

/** A reminder on the Today page: tick it off on the day, or a heads-up before it. */
export function DayReminderRow({ item }: { item: DayReminder }) {
  const { reminder, inDays } = item;
  const [acked, setAcked] = useOptimistic(item.acked);
  const [pending, startTransition] = useTransition();
  const Icon = reminderTypeMeta(reminder.type).icon;
  const time = formatTime(reminder.time);
  const years =
    reminder.type === "birthday" || reminder.type === "anniversary"
      ? yearsSince(reminder.start_date, item.date)
      : null;
  const yearsText =
    years === null ? "" : reminder.type === "birthday" ? ` · turns ${years}` : ` · ${years} years`;

  function toggle(checked: boolean) {
    startTransition(async () => {
      setAcked(checked);
      const result = await ackReminder(reminder.id, item.date, checked);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <li
      className={cn(
        "bg-card flex items-center gap-3 rounded-xl border p-3",
        acked && "opacity-60",
        inDays > 0 && "border-dashed",
      )}
    >
      {inDays === 0 ? (
        <Checkbox
          checked={acked}
          disabled={pending}
          onCheckedChange={(checked) => toggle(checked === true)}
          aria-label={`Mark ${reminder.title} as done`}
          className="size-5"
        />
      ) : (
        <span className="w-5" />
      )}
      <Icon className="text-muted-foreground size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-medium", acked && "line-through")}>{reminder.title}</p>
        <p className="text-muted-foreground text-xs">
          {inDays === 0
            ? `Today${time ? ` at ${time}` : ""}`
            : `In ${inDays} day${inDays === 1 ? "" : "s"} · ${formatDay(item.date)}`}
          {yearsText}
        </p>
        {reminder.notes && (
          <p className="text-muted-foreground truncate text-xs">{reminder.notes}</p>
        )}
      </div>
    </li>
  );
}
