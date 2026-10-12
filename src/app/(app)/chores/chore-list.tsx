"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { EllipsisVertical, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AssignmentSummary } from "@/components/chores/assignment-summary";
import { personById, type Person } from "@/components/chores/people";
import { PersonDot } from "@/components/person-dot";
import { categoryMeta, formatTime, priorityMeta } from "@/lib/chore-meta";
import { addDays, formatDay, type DateStr } from "@/lib/dates";
import { describeRule } from "@/lib/recurrence";
import { planOccurrences } from "@/lib/rotation";
import type { Chore } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChoreForm } from "./chore-form";
import { deleteChore, setChoreActive, type ActionResult } from "./actions";

type Editing = { chore?: Chore } | null;

function NextUp({ chore, people, today }: { chore: Chore; people: Person[]; today: DateStr }) {
  const from = chore.start_date > today ? chore.start_date : today;
  const next = planOccurrences(chore, from, addDays(from, 62))[0];
  if (!next) return null;
  const person = personById(people, next.assignee_id);
  return (
    <span className="inline-flex items-center gap-1.5">
      Next: {next.date === today ? "today" : formatDay(next.date)} ·{" "}
      {person ? (
        <>
          <PersonDot profile={person} /> {person.name}
        </>
      ) : (
        "together"
      )}
    </span>
  );
}

export function ChoreList({
  chores,
  people,
  me,
  today,
}: {
  chores: Chore[];
  people: Person[];
  me: Person;
  today: DateStr;
}) {
  const [editing, setEditing] = useState<Editing>(null);
  const [, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(success);
      else toast.error(result.error);
    });
  }

  function confirmDelete(chore: Chore) {
    if (confirm(`Delete "${chore.title}" and its history? Pausing keeps the history.`)) {
      run(() => deleteChore(chore.id), "Chore deleted");
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing({})}>
          <Plus /> Add chore
        </Button>
      </div>

      {chores.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          No chores yet. Add laundry, cooking, waste and the rest. They&apos;ll show up on the{" "}
          <Link href="/" className="underline">
            Today
          </Link>{" "}
          page.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {chores.map((chore) => {
            const Icon = categoryMeta(chore.category).icon;
            const priority = priorityMeta(chore.priority);
            return (
              <li
                key={chore.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3",
                  !chore.active && "opacity-60",
                )}
              >
                <div className="bg-muted mt-0.5 rounded-lg p-2">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{chore.title}</span>
                    <span
                      className={cn("size-2 rounded-full", priority.dot)}
                      title={`${priority.label} priority`}
                    />
                    {!chore.active && <Badge variant="secondary">Paused</Badge>}
                  </div>
                  <div className="text-muted-foreground mt-1 flex flex-col gap-1 text-xs">
                    <span>
                      {describeRule(chore)}
                      {chore.due_time && ` at ${formatTime(chore.due_time)}`}
                    </span>
                    <AssignmentSummary chore={chore} people={people} />
                    {chore.active && <NextUp chore={chore} people={people} today={today} />}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon" aria-label="Chore actions" />}
                  >
                    <EllipsisVertical />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing({ chore })}>
                      <Pencil /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        run(
                          () => setChoreActive(chore.id, !chore.active),
                          chore.active ? "Chore paused" : "Chore resumed",
                        )
                      }
                    >
                      {chore.active ? (
                        <>
                          <Pause /> Pause
                        </>
                      ) : (
                        <>
                          <Play /> Resume
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => confirmDelete(chore)}>
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.chore ? "Edit chore" : "Add chore"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <ChoreForm
              key={editing.chore?.id ?? "new"}
              chore={editing.chore}
              people={people}
              me={me}
              today={today}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
