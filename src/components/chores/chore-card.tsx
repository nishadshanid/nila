"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { PersonDot } from "@/components/person-dot";
import { setOccurrenceDone } from "@/app/(app)/chores/actions";
import { categoryMeta, formatTime, priorityMeta } from "@/lib/chore-meta";
import type { OccurrenceWithChore } from "@/lib/chores";
import { cn } from "@/lib/utils";
import { personById, type Person } from "./people";

/**
 * One chore on one day. `readOnly` shows your partner's chores: you see whether
 * they're done, but only they can tick them off.
 */
export function ChoreCard({
  occurrence,
  people,
  readOnly = false,
}: {
  occurrence: OccurrenceWithChore;
  people: Person[];
  readOnly?: boolean;
}) {
  const { chore } = occurrence;
  const [done, setDone] = useOptimistic(occurrence.status === "done");
  const [pending, startTransition] = useTransition();
  const Icon = categoryMeta(chore.category).icon;
  const priority = priorityMeta(chore.priority);
  const completedBy = personById(people, occurrence.completed_by);
  const time = formatTime(occurrence.due_time);
  const details = time;

  function toggle(checked: boolean) {
    startTransition(async () => {
      setDone(checked);
      const result = await setOccurrenceDone(occurrence.id, checked);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <li
      className={cn(
        "bg-card flex items-center gap-3 rounded-xl border p-3 transition-opacity",
        done && "opacity-60",
      )}
    >
      <Checkbox
        checked={done}
        disabled={pending || readOnly}
        onCheckedChange={(checked) => toggle(checked === true)}
        aria-label={
          readOnly
            ? `${chore.title}: ${done ? "done" : "not done yet"}`
            : `Mark ${chore.title} as ${done ? "not done" : "done"}`
        }
        className="size-5"
      />
      <Icon className="text-muted-foreground size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-medium", done && "line-through")}>{chore.title}</p>
        {(details || (done && completedBy)) && (
          <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
            {details}
            {details && done && completedBy && " · "}
            {done && completedBy && (
              <>
                done by <PersonDot profile={completedBy} /> {completedBy.name}
              </>
            )}
          </p>
        )}
      </div>
      <span
        className={cn("size-2 shrink-0 rounded-full", priority.dot)}
        title={`${priority.label} priority`}
      />
    </li>
  );
}
