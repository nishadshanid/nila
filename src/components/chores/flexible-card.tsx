"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { logFlexibleChore } from "@/app/(app)/chores/actions";
import { categoryMeta, priorityMeta } from "@/lib/chore-meta";
import type { FlexibleProgress } from "@/lib/chores";
import { formatDay, type DateStr } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * A flexible chore ("gym 4 times a week") with this period's progress.
 * Logging marks the viewed day; `readOnly` shows your partner's progress.
 */
export function FlexibleCard({
  progress,
  date,
  dayLabel,
  canLog,
  readOnly = false,
}: {
  progress: FlexibleProgress;
  date: DateStr;
  /** "today", "yesterday" or a weekday, for the button label. */
  dayLabel: string;
  /** False for future days. */
  canLog: boolean;
  readOnly?: boolean;
}) {
  const { chore, doneDates } = progress;
  const target = chore.flex_target ?? 1;
  const [doneOnDate, setDoneOnDate] = useOptimistic(progress.doneOnDate);
  const [pending, startTransition] = useTransition();
  const count = doneDates.length - (progress.doneOnDate ? 1 : 0) + (doneOnDate ? 1 : 0);
  const reached = count >= target;
  const Icon = categoryMeta(chore.category).icon;
  const priority = priorityMeta(chore.priority);
  const periodName = chore.freq === "monthly" ? "this month" : "this week";
  const periodRange =
    chore.freq === "monthly"
      ? formatDay(progress.period.from, "MMMM")
      : `${formatDay(progress.period.from, "d MMM")} – ${formatDay(progress.period.to, "d MMM")}`;

  function toggle() {
    startTransition(async () => {
      setDoneOnDate(!doneOnDate);
      const result = await logFlexibleChore(chore.id, date, !doneOnDate);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <li className="bg-card flex flex-col gap-3 rounded-xl border p-3">
      <div className="flex items-center gap-3">
        <Icon className="text-muted-foreground size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{chore.title}</p>
          <p className="text-muted-foreground text-xs">
            {count} of {target} {periodName} ({periodRange}){reached && " · goal reached 🎉"}
          </p>
        </div>
        <span
          className={cn("size-2 shrink-0 rounded-full", priority.dot)}
          title={`${priority.label} priority`}
        />
      </div>

      <div className="flex items-center gap-3">
        <div
          className="flex flex-1 flex-wrap gap-1"
          role="img"
          aria-label={`${count} of ${target} done ${periodName}`}
        >
          {Array.from({ length: Math.max(target, count) }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 min-w-3 flex-1 rounded-full",
                i < count ? "bg-primary" : "bg-muted",
                target > 10 && "min-w-1.5",
              )}
            />
          ))}
        </div>
        {!readOnly &&
          canLog &&
          (doneOnDate ? (
            <div className="flex shrink-0 items-center gap-1">
              <span className="text-primary flex items-center gap-1 text-sm font-medium">
                <Check className="size-4" /> Done {dayLabel}
              </span>
              <Button size="sm" variant="ghost" disabled={pending} onClick={toggle}>
                Undo
              </Button>
            </div>
          ) : (
            <Button size="sm" disabled={pending} onClick={toggle} className="shrink-0">
              Mark done {dayLabel}
            </Button>
          ))}
      </div>

      <p className="text-muted-foreground text-xs">
        {doneDates.length > 0 &&
          `Done on ${doneDates.map((d) => formatDay(d, "EEE d")).join(", ")} · `}
        {chore.freq === "monthly" ? "Last month" : "Last week"}: {progress.previousCount} of{" "}
        {target}
      </p>
    </li>
  );
}
