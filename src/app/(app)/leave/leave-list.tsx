"use client";

import { useState, useTransition } from "react";
import { EllipsisVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PersonDot } from "@/components/person-dot";
import { personById, type Person } from "@/components/chores/people";
import { daysBetween, formatDay, type DateStr } from "@/lib/dates";
import type { Leave } from "@/lib/types";
import { cn } from "@/lib/utils";
import { deleteLeave } from "./actions";
import { LEAVE_TYPES, LeaveForm } from "./leave-form";

type Editing = { leave?: Leave } | null;

function dateRange(leave: Leave) {
  const days = daysBetween(leave.start_date, leave.end_date) + 1;
  if (days === 1) return formatDay(leave.start_date, "EEE, d MMM");
  return `${formatDay(leave.start_date, "EEE d MMM")} – ${formatDay(leave.end_date, "EEE d MMM")} · ${days} days`;
}

function LeaveRow({
  leave,
  people,
  me,
  muted,
  onEdit,
}: {
  leave: Leave;
  people: Person[];
  me: Person;
  muted?: boolean;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const person = personById(people, leave.user_id);
  const type = LEAVE_TYPES.find((t) => t.value === leave.type)?.label ?? leave.type;

  function remove() {
    if (!confirm("Delete this leave? Chores on those days go back to normal.")) return;
    startTransition(async () => {
      const result = await deleteLeave(leave.id);
      if (result.ok) toast.success("Leave deleted");
      else toast.error(result.error);
    });
  }

  return (
    <li className={cn("flex items-start gap-3 rounded-xl border p-3", muted && "opacity-60")}>
      {person && <PersonDot profile={person} className="mt-1.5" />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{person?.id === me.id ? "You" : person?.name}</span>
          <Badge variant={leave.type === "sick" ? "destructive" : "secondary"}>{type}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">{dateRange(leave)}</p>
        {leave.note && <p className="mt-1 text-sm">{leave.note}</p>}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" aria-label="Leave actions" disabled={pending} />
          }
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
    </li>
  );
}

export function LeaveList({
  leaves,
  people,
  me,
  today,
  covers,
}: {
  leaves: Leave[];
  people: Person[];
  me: Person;
  today: DateStr;
  covers: Record<string, number>;
}) {
  const [editing, setEditing] = useState<Editing>(null);
  const current = leaves.filter((l) => l.end_date >= today);
  const past = leaves.filter((l) => l.end_date < today).reverse();

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {people.length > 1 && (
          <p className="text-muted-foreground text-sm">
            Covered for each other this month:{" "}
            {people.map((p, i) => (
              <span key={p.id}>
                {i > 0 && " · "}
                <PersonDot profile={p} className="mr-1" />
                {p.id === me.id ? "you" : p.name} {covers[p.id] ?? 0}
              </span>
            ))}
          </p>
        )}
        <Button onClick={() => setEditing({})} className="ml-auto">
          <Plus /> Add leave
        </Button>
      </div>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold">Now &amp; upcoming</h2>
        {current.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
            No leave planned. When one of you is away or sick, add it here and the shared chores
            move to the other person for those days.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {current.map((leave) => (
              <LeaveRow
                key={leave.id}
                leave={leave}
                people={people}
                me={me}
                onEdit={() => setEditing({ leave })}
              />
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Past</h2>
          <ul className="flex flex-col gap-2">
            {past.map((leave) => (
              <LeaveRow
                key={leave.id}
                leave={leave}
                people={people}
                me={me}
                muted
                onEdit={() => setEditing({ leave })}
              />
            ))}
          </ul>
        </section>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.leave ? "Edit leave" : "Add leave"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <LeaveForm
              key={editing.leave?.id ?? "new"}
              leave={editing.leave}
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
