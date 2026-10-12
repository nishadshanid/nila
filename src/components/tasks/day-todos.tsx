"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Lock, Plus, SlidersHorizontal, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TaskRow } from "@/components/tasks/task-row";
import type { Person } from "@/components/chores/people";
import { saveTask } from "@/app/(app)/plans/actions";
import { TaskForm, type TaskDefaults } from "@/app/(app)/plans/task-form";
import type { DateStr } from "@/lib/dates";
import type { Task, Visibility } from "@/lib/types";

/**
 * The todo list on Today: add a todo for the day you're looking at, tick,
 * edit or delete. In the Couple view new todos are always for both of you.
 */
export function DayTodos({
  title,
  tasks,
  people,
  me,
  date,
  today,
  coupleOnly = false,
}: {
  title: string;
  tasks: Task[];
  people: Person[];
  me: Person;
  date: DateStr;
  today: DateStr;
  coupleOnly?: boolean;
}) {
  const hasPartner = people.length > 1;
  const [visibility, setVisibility] = useState<Visibility>(coupleOnly ? "couple" : "personal");
  const [quickTitle, setQuickTitle] = useState("");
  const [editing, setEditing] = useState<{ task?: Task; defaults: TaskDefaults } | null>(null);
  const [pending, startTransition] = useTransition();
  const done = tasks.filter((t) => t.status === "done").length;
  const defaults: TaskDefaults = { kind: "todo", visibility, date };
  const shared = visibility === "couple";

  function quickAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    startTransition(async () => {
      const result = await saveTask({ kind: "todo", title, priority: "med", visibility, date });
      if (result.ok) setQuickTitle("");
      else toast.error(result.error);
    });
  }

  return (
    <section className="mb-6">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {title}
        {tasks.length > 0 && (
          <span className="text-muted-foreground font-normal">
            {done}/{tasks.length}
          </span>
        )}
        <Link
          href={`/plans?tab=${coupleOnly ? "couple" : "mine"}`}
          className="text-muted-foreground ml-auto text-xs font-normal underline-offset-2 hover:underline"
        >
          All todos
        </Link>
      </h2>

      <form onSubmit={quickAdd} className="mb-2 flex gap-2">
        {hasPartner && !coupleOnly && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setVisibility(shared ? "personal" : "couple")}
            aria-label={shared ? "For both of you (tap for just me)" : "Just me (tap for both)"}
            title={shared ? "For both of you" : "Just me"}
          >
            {shared ? <Users /> : <Lock />}
          </Button>
        )}
        <Input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder={shared ? "Add a todo for both of you…" : "Add a todo…"}
          aria-label="New todo"
          maxLength={120}
          disabled={pending}
        />
        <Button type="submit" disabled={pending || !quickTitle.trim()} aria-label="Add todo">
          <Plus />
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-label="Add with details"
          onClick={() => setEditing({ defaults })}
        >
          <SlidersHorizontal />
        </Button>
      </form>

      {tasks.length > 0 && (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              people={people}
              meId={me.id}
              today={today}
              onEdit={() => setEditing({ task, defaults })}
            />
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.task ? "Edit todo" : "Add todo"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <TaskForm
              key={editing.task?.id ?? "new"}
              task={editing.task}
              defaults={editing.defaults}
              people={people}
              me={me}
              today={today}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
