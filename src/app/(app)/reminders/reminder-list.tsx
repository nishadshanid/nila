"use client";

import { useState, useTransition } from "react";
import { EllipsisVertical, Lock, Pause, Pencil, Play, Plus, Trash2 } from "lucide-react";
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
import { formatTime } from "@/lib/chore-meta";
import { formatDay, relativeDay, type DateStr } from "@/lib/dates";
import { REMINDER_TYPES, reminderTypeMeta } from "@/lib/reminder-meta";
import { describeReminder, nextOccurrence, yearsSince } from "@/lib/reminder-schedule";
import type { Reminder } from "@/lib/types";
import { cn } from "@/lib/utils";
import { deleteReminder, setReminderActive, type ActionResult } from "./actions";
import { ReminderForm } from "./reminder-form";

function ReminderRow({
  reminder,
  today,
  onEdit,
}: {
  reminder: Reminder;
  today: DateStr;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const Icon = reminderTypeMeta(reminder.type).icon;
  const next = reminder.active ? nextOccurrence(reminder, today) : null;
  const years =
    next && (reminder.type === "birthday" || reminder.type === "anniversary")
      ? yearsSince(reminder.start_date, next)
      : null;
  const time = formatTime(reminder.time);

  function run(action: () => Promise<ActionResult>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(success);
      else toast.error(result.error);
    });
  }

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3",
        !reminder.active && "opacity-60",
      )}
    >
      <div className="bg-muted mt-0.5 rounded-lg p-2">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{reminder.title}</span>
          {reminder.visibility === "personal" && (
            <Lock className="text-muted-foreground size-3" aria-label="Private" />
          )}
          {!reminder.active && <Badge variant="secondary">Paused</Badge>}
        </div>
        <p className="text-muted-foreground text-xs">
          {describeReminder(reminder, (d) => formatDay(d, "d MMM"))}
          {time && ` at ${time}`}
          {reminder.lead_days > 0 &&
            ` · heads-up ${reminder.lead_days} day${reminder.lead_days === 1 ? "" : "s"} before`}
        </p>
        {next && (
          <p className="text-xs">
            Next: {relativeDay(next, today)}
            {years !== null &&
              (reminder.type === "birthday" ? ` · turns ${years}` : ` · ${years} years`)}
          </p>
        )}
        {reminder.notes && <p className="text-muted-foreground mt-1 text-xs">{reminder.notes}</p>}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" aria-label="Reminder actions" disabled={pending} />
          }
        >
          <EllipsisVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              run(
                () => setReminderActive(reminder.id, !reminder.active),
                reminder.active ? "Paused" : "Resumed",
              )
            }
          >
            {reminder.active ? (
              <>
                <Pause /> Pause
              </>
            ) : (
              <>
                <Play /> Resume
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() =>
              confirm(`Delete "${reminder.title}"?`) &&
              run(() => deleteReminder(reminder.id), "Reminder deleted")
            }
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

export function ReminderList({
  reminders,
  meId,
  hasPartner,
  today,
}: {
  reminders: Reminder[];
  meId: string;
  hasPartner: boolean;
  today: DateStr;
}) {
  const [editing, setEditing] = useState<{ reminder?: Reminder } | null>(null);

  // Soonest first within each type.
  const nextOf = (r: Reminder) => (r.active ? (nextOccurrence(r, today) ?? "9999") : "9999");
  const groups = REMINDER_TYPES.map((t) => ({
    ...t,
    items: reminders
      .filter((r) => r.type === t.value)
      .sort((a, b) => nextOf(a).localeCompare(nextOf(b))),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing({})}>
          <Plus /> Add reminder
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
          Add birthdays, anniversaries, calls and anything else you don&apos;t want to forget. They
          show on the Today page when they&apos;re due.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.value} className="mb-6">
            <h2 className="mb-2 text-sm font-semibold">{group.label}s</h2>
            <ul className="flex flex-col gap-2">
              {group.items.map((reminder) => (
                <ReminderRow
                  key={reminder.id}
                  reminder={reminder}
                  today={today}
                  onEdit={() => setEditing({ reminder })}
                />
              ))}
            </ul>
          </section>
        ))
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.reminder ? "Edit reminder" : "Add reminder"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <ReminderForm
              key={editing.reminder?.id ?? "new"}
              reminder={editing.reminder}
              hasPartner={hasPartner}
              canChangeVisibility={!editing.reminder || editing.reminder.owner_id === meId}
              today={today}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
