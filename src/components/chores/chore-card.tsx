"use client";

import { useOptimistic, useState, useTransition } from "react";
import { EllipsisVertical, Hand, Undo2 } from "lucide-react";
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
import {
  handOverOccurrence,
  setOccurrenceDone,
  takeBackOccurrence,
} from "@/app/(app)/chores/actions";
import { categoryMeta, formatTime, priorityMeta } from "@/lib/chore-meta";
import type { OccurrenceWithChore } from "@/lib/chores";
import { cn } from "@/lib/utils";
import { HandOverDialog } from "./hand-over-dialog";
import { personById, type Person } from "./people";

const LEAVE_WORD = { leave: "away", sick: "sick" } as const;

/** Why this chore isn't with the person it was planned for, if it's moved. */
function movedNote(o: OccurrenceWithChore, people: Person[], meId: string) {
  if (!o.reassign_reason) return null;
  const name = (id: string | null) => (id === meId ? "you" : (personById(people, id)?.name ?? ""));
  const why = o.reassign_reason === "split" ? o.reassign_note : LEAVE_WORD[o.reassign_reason];

  if (o.status === "skipped") {
    const who =
      o.original_assignee_id === null
        ? "you're both"
        : o.original_assignee_id === meId
          ? "you're"
          : `${name(o.original_assignee_id)} is`;
    return `Paused · ${who} ${why}`;
  }

  const doing = o.assignee_id === meId ? "You're" : `${name(o.assignee_id)} is`;
  if (o.original_assignee_id === null) return `${doing} doing it alone · ${why}`;
  return `${doing} covering for ${name(o.original_assignee_id)} · ${why}`;
}

/**
 * One chore on one day.
 * - `readOnly`: someone else's chore; you see whether it's done but can't tick it.
 * - `showTurn`: show whose turn it is (taking-turns chores in the Couple view).
 * - `canTakeBack`: you handed it over and can take it back.
 */
export function ChoreCard({
  occurrence,
  people,
  meId,
  readOnly = false,
  showTurn = false,
  canTakeBack = false,
}: {
  occurrence: OccurrenceWithChore;
  people: Person[];
  meId: string;
  readOnly?: boolean;
  showTurn?: boolean;
  canTakeBack?: boolean;
}) {
  const { chore } = occurrence;
  const [done, setDone] = useOptimistic(occurrence.status === "done");
  const [pending, startTransition] = useTransition();
  const [handingOver, setHandingOver] = useState(false);
  const Icon = categoryMeta(chore.category).icon;
  const priority = priorityMeta(chore.priority);
  const completedBy = personById(people, occurrence.completed_by);
  const partner = people.find((p) => p.id !== meId) ?? null;
  const paused = occurrence.status === "skipped";
  const time = formatTime(occurrence.due_time);
  const turnOf = showTurn && !done ? personById(people, occurrence.assignee_id) : null;
  const moved = movedNote(occurrence, people, meId);
  const canHandOver =
    !readOnly && !done && !paused && partner !== null && occurrence.assignee_id !== partner.id;

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.error);
      else if (success) toast.success(success);
    });
  }

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
        (done || paused) && "opacity-60",
      )}
    >
      <Checkbox
        checked={done}
        disabled={pending || readOnly || paused}
        onCheckedChange={(checked) => toggle(checked === true)}
        aria-label={
          readOnly || paused
            ? `${chore.title}: ${done ? "done" : paused ? "paused" : "not done yet"}`
            : `Mark ${chore.title} as ${done ? "not done" : "done"}`
        }
        className="size-5"
      />
      <Icon className="text-muted-foreground size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-medium", (done || paused) && "line-through")}>
          {chore.title}
        </p>
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-xs">
          {turnOf && (
            <>
              <PersonDot profile={turnOf} /> {turnOf.id === meId ? "Your" : `${turnOf.name}'s`} turn
              {time && " · "}
            </>
          )}
          {time}
          {done && completedBy && (
            <>
              {(time || turnOf) && " · "}
              done by <PersonDot profile={completedBy} />{" "}
              {completedBy.id === meId ? "you" : completedBy.name}
            </>
          )}
        </p>
        {moved && <p className="text-xs text-amber-700 dark:text-amber-400">{moved}</p>}
      </div>

      {canTakeBack && !done ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => takeBackOccurrence(occurrence.id), "Taken back")}
        >
          <Undo2 /> Take back
        </Button>
      ) : (
        <span
          className={cn("size-2 shrink-0 rounded-full", priority.dot)}
          title={`${priority.label} priority`}
        />
      )}

      {canHandOver && partner && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label="Chore actions" />}
            >
              <EllipsisVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setHandingOver(true)}>
                <Hand /> Can&apos;t do it: hand to {partner.name}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <HandOverDialog
            open={handingOver}
            onOpenChange={setHandingOver}
            choreTitle={chore.title}
            partnerName={partner.name}
            pending={pending}
            onConfirm={(reason) =>
              run(async () => {
                const result = await handOverOccurrence(occurrence.id, reason);
                if (result.ok) setHandingOver(false);
                return result;
              }, `Handed to ${partner.name}`)
            }
          />
        </>
      )}
    </li>
  );
}
