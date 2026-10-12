"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/native-select";
import { Segmented } from "@/components/segmented";
import { TaskRow } from "@/components/tasks/task-row";
import type { Person } from "@/components/chores/people";
import { addDays, startOfWeek, type DateStr } from "@/lib/dates";
import type { Priority, Task } from "@/lib/types";
import { saveTask } from "./actions";
import { TaskForm, type TaskDefaults } from "./task-form";

type Tab = "mine" | "couple" | "plans";
type When = "all" | "today" | "week" | "overdue" | "someday";

const PRIORITY_RANK: Record<Priority, number> = { high: 0, med: 1, low: 2 };

function matchesWhen(task: Task, when: When, today: DateStr) {
  const weekEnd = addDays(startOfWeek(today), 6);
  const last = task.end_date ?? task.date;
  switch (when) {
    case "all":
      return true;
    case "today":
      return task.date !== null && task.date <= today && (last ?? "") >= today;
    case "week":
      return task.date !== null && task.date <= weekEnd && (last ?? "") >= today;
    case "overdue":
      return (
        task.kind === "todo" && task.status === "open" && task.date !== null && task.date < today
      );
    case "someday":
      return task.date === null;
  }
}

function sortTasks(tasks: Task[], today: DateStr) {
  const overdue = (t: Task) => t.kind === "todo" && t.date !== null && t.date < today;
  return [...tasks].sort(
    (a, b) =>
      Number(a.status === "done") - Number(b.status === "done") ||
      Number(overdue(b)) - Number(overdue(a)) ||
      (a.date ?? "9999").localeCompare(b.date ?? "9999") ||
      (a.time ?? "99").localeCompare(b.time ?? "99") ||
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  );
}

export function TasksView({
  tasks,
  people,
  me,
  today,
}: {
  tasks: Task[];
  people: Person[];
  me: Person;
  today: DateStr;
}) {
  const hasPartner = people.length > 1;
  const [tab, setTab] = useState<Tab>("mine");
  const [when, setWhen] = useState<When>("all");
  const [priority, setPriority] = useState<Priority | "all">("all");
  const [showDone, setShowDone] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [editing, setEditing] = useState<{ task?: Task; defaults: TaskDefaults } | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    const inTab = tasks.filter((t) =>
      tab === "plans"
        ? t.kind === "plan"
        : t.kind === "todo" && t.visibility === (tab === "mine" ? "personal" : "couple"),
    );
    return sortTasks(
      inTab.filter(
        (t) =>
          (showDone || t.status === "open") &&
          (priority === "all" || t.priority === priority) &&
          matchesWhen(t, when, today),
      ),
      today,
    );
  }, [tasks, tab, when, priority, showDone, today]);

  const doneCount = tasks.filter(
    (t) =>
      t.status === "done" &&
      (tab === "plans"
        ? t.kind === "plan"
        : t.kind === "todo" && t.visibility === (tab === "mine" ? "personal" : "couple")),
  ).length;

  const tabDefaults: TaskDefaults =
    tab === "plans"
      ? { kind: "plan", visibility: hasPartner ? "couple" : "personal" }
      : { kind: "todo", visibility: tab === "couple" ? "couple" : "personal" };

  function quickAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    startTransition(async () => {
      const result = await saveTask({
        kind: "todo",
        title,
        priority: "med",
        visibility: tabDefaults.visibility,
      });
      if (result.ok) setQuickTitle("");
      else toast.error(result.error);
    });
  }

  return (
    <>
      <Segmented
        aria-label="List"
        value={tab}
        onChange={(v) => setTab(v)}
        className="mb-4"
        options={[
          { value: "mine", label: "My todos" },
          ...(hasPartner ? [{ value: "couple" as const, label: "Couple todos" }] : []),
          { value: "plans", label: "Plans" },
        ]}
      />

      {tab === "plans" ? (
        <Button
          className="mb-4 w-full sm:w-auto"
          onClick={() => setEditing({ defaults: tabDefaults })}
        >
          <Plus /> Add plan
        </Button>
      ) : (
        <form onSubmit={quickAdd} className="mb-4 flex gap-2">
          <Input
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder={tab === "mine" ? "Add a private todo…" : "Add a todo for both of you…"}
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
            onClick={() => setEditing({ defaults: tabDefaults })}
          >
            <SlidersHorizontal />
          </Button>
        </form>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <NativeSelect
          aria-label="When"
          value={when}
          onChange={(e) => setWhen(e.target.value as When)}
          className="w-36"
        >
          <option value="all">Any time</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          {tab !== "plans" && <option value="overdue">Overdue</option>}
          {tab !== "plans" && <option value="someday">No date</option>}
        </NativeSelect>
        <NativeSelect
          aria-label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority | "all")}
          className="w-36"
        >
          <option value="all">Any priority</option>
          <option value="high">High</option>
          <option value="med">Medium</option>
          <option value="low">Low</option>
        </NativeSelect>
        <div className="flex items-center gap-2">
          <Switch id="show-done" checked={showDone} onCheckedChange={setShowDone} />
          <Label htmlFor="show-done" className="text-muted-foreground font-normal">
            Show done ({doneCount})
          </Label>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
          {tab === "mine" && "No private todos here. Only you can see what you add in this tab."}
          {tab === "couple" && "No couple todos here. You both see and can edit these."}
          {tab === "plans" && "No plans here yet. Add outings, trips, visits and events."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              people={people}
              meId={me.id}
              today={today}
              onEdit={() => setEditing({ task, defaults: tabDefaults })}
            />
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing?.task
                ? `Edit ${editing.task.kind}`
                : editing?.defaults.kind === "plan"
                  ? "Add plan"
                  : "Add todo"}
            </DialogTitle>
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
    </>
  );
}
