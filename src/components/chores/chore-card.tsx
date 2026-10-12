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

export function ChoreCard({
  occurrence,
  people,
}: {
  occurrence: OccurrenceWithChore;
  people: Person[];
}) {
  const { chore } = occurrence;
  const [done, setDone] = useOptimistic(occurrence.status === "done");
  const [pending, startTransition] = useTransition();
  const Icon = categoryMeta(chore.category).icon;
  const priority = priorityMeta(chore.priority);
  const completedBy = personById(people, occurrence.completed_by);
  const time = formatTime(chore.due_time);

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
        disabled={pending}
        onCheckedChange={(checked) => toggle(checked === true)}
        aria-label={`Mark ${chore.title} as ${done ? "not done" : "done"}`}
        className="size-5"
      />
      <Icon className="text-muted-foreground size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-medium", done && "line-through")}>{chore.title}</p>
        {(time || (done && completedBy)) && (
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            {time}
            {time && done && completedBy && " · "}
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
