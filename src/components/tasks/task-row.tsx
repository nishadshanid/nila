"use client";

import { useOptimistic, useTransition } from "react";
import { EllipsisVertical, Lock, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PersonDot } from "@/components/person-dot";
import { PointsPill } from "@/components/points/points-pill";
import { usePointRules } from "@/components/points/rules-context";
import { personById, type Person } from "@/components/chores/people";
import { deleteTask, setTaskDone } from "@/app/(app)/plans/actions";
import { formatTime, priorityMeta } from "@/lib/chore-meta";
import { relativeDay, type DateStr } from "@/lib/dates";
import { pointsFor, taskEarnsPoints } from "@/lib/points";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

function whenLabel(task: Task, today: DateStr) {
  if (!task.date) return null;
  const time = formatTime(task.time);
  const start = relativeDay(task.date, today);
  const range = task.end_date ? `${start} – ${relativeDay(task.end_date, today)}` : start;
  return time ? `${range}, ${time}` : range;
}

/** One todo or plan, with a done checkbox and (optionally) edit/delete. */
export function TaskRow({
  task,
  people,
  meId,
  today,
  onEdit,
}: {
  task: Task;
  people: Person[];
  meId: string;
  today: DateStr;
  /** Shows the edit/delete menu when given. */
  onEdit?: () => void;
}) {
  const [done, setDone] = useOptimistic(task.status === "done");
  const [pending, startTransition] = useTransition();
  const priority = priorityMeta(task.priority);
  const overdue = !done && task.kind === "todo" && task.date !== null && task.date < today;
  const when = whenLabel(task, today);
  const assignee = personById(people, task.assignee_id);
  const completedBy = personById(people, task.completed_by);
  const rules = usePointRules();
  const points = taskEarnsPoints(task) ? pointsFor(task, rules) : 0;

  function toggle(checked: boolean) {
    startTransition(async () => {
      setDone(checked);
      const result = await setTaskDone(task.id, checked);
      if (!result.ok) toast.error(result.error);
      else if (checked && points > 0) toast.success(`+${points} points 🎉`);
    });
  }

  function remove() {
    if (!confirm(`Delete "${task.title}"?`)) return;
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if (result.ok) toast.success("Deleted");
      else toast.error(result.error);
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
        aria-label={`Mark ${task.title} as ${done ? "not done" : "done"}`}
        className="size-5"
      />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-medium", done && "line-through")}>{task.title}</p>
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-xs">
          {task.visibility === "couple" ? (
            <span className="inline-flex items-center gap-1">
              <Users className="size-3" />
              {assignee ? (
                <>
                  <PersonDot profile={assignee} /> {assignee.id === meId ? "You" : assignee.name}
                </>
              ) : (
                "Both"
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3" /> Just me
            </span>
          )}
          {when && (
            <span className={cn(overdue && "text-destructive font-medium")}>
              · {overdue ? `Overdue (${when})` : when}
            </span>
          )}
          {done && completedBy && task.visibility === "couple" && (
            <span>· done by {completedBy.id === meId ? "you" : completedBy.name}</span>
          )}
        </p>
        {task.notes && (
          <p className="text-muted-foreground mt-0.5 truncate text-xs">{task.notes}</p>
        )}
      </div>
      <PointsPill points={points} />
      <span
        className={cn("size-2 shrink-0 rounded-full", priority.dot)}
        title={`${priority.label} priority`}
      />
      {onEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" aria-label="Task actions" />}
          >
            <EllipsisVertical />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={remove}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
