"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/segmented";
import { PersonDot } from "@/components/person-dot";
import type { Person } from "@/components/chores/people";
import { PRIORITIES } from "@/lib/chore-meta";
import { taskInputSchema, type TaskInput } from "@/lib/task-schema";
import type { DateStr } from "@/lib/dates";
import type { Task } from "@/lib/types";
import { saveTask } from "./actions";

export type TaskDefaults = Pick<TaskInput, "kind" | "visibility"> & { date?: string };

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function TaskForm({
  task,
  defaults,
  people,
  me,
  today,
  onDone,
}: {
  task?: Task;
  defaults: TaskDefaults;
  people: Person[];
  me: Person;
  today: DateStr;
  onDone: () => void;
}) {
  const [state, setState] = useState(() => ({
    kind: task?.kind ?? defaults.kind,
    title: task?.title ?? "",
    notes: task?.notes ?? "",
    priority: task?.priority ?? ("med" as const),
    visibility: task?.visibility ?? defaults.visibility,
    assignee: task?.assignee_id ?? "both",
    date: task?.date ?? defaults.date ?? (defaults.kind === "plan" ? today : ""),
    time: task?.time?.slice(0, 5) ?? "",
    end_date: task?.end_date ?? "",
    remind_before_min: task?.remind_before_min?.toString() ?? "",
  }));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof typeof state>(key: K, value: (typeof state)[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  // Only the creator can make a couple task private again.
  const canChangeVisibility = !task || task.owner_id === me.id;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input: TaskInput = {
      kind: state.kind,
      title: state.title,
      notes: state.notes,
      priority: state.priority,
      visibility: state.visibility,
      assignee_id: state.assignee === "both" ? null : state.assignee,
      date: state.date,
      time: state.time,
      end_date: state.end_date,
      remind_before_min: state.remind_before_min === "" ? null : Number(state.remind_before_min),
    };
    const parsed = taskInputSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveTask(input, task?.id);
      if (result.ok) {
        toast.success(task ? "Saved" : state.kind === "plan" ? "Plan added" : "Todo added");
        onDone();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Segmented
        aria-label="Kind"
        value={state.kind}
        onChange={(v) => set("kind", v)}
        options={[
          { value: "todo", label: "Todo" },
          { value: "plan", label: "Plan" },
        ]}
      />

      <Field label="Title" htmlFor="title">
        <Input
          id="title"
          value={state.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder={
            state.kind === "plan" ? "e.g. Dinner with friends" : "e.g. Pay electricity bill"
          }
          maxLength={120}
          autoFocus
          required
        />
      </Field>

      <Field label="Who can see it">
        <Segmented
          aria-label="Who can see it"
          value={state.visibility}
          onChange={(v) => canChangeVisibility && set("visibility", v)}
          options={[
            { value: "personal", label: "Just me (private)" },
            ...(people.length > 1 ? [{ value: "couple" as const, label: "Couple" }] : []),
          ]}
        />
        {state.visibility === "couple" && people.length > 1 && (
          <Segmented
            aria-label="Who does it"
            value={state.assignee}
            onChange={(v) => set("assignee", v)}
            options={[
              { value: "both", label: "Both" },
              ...people.map((p) => ({
                value: p.id,
                label: (
                  <>
                    <PersonDot profile={p} /> {p.id === me.id ? "Me" : p.name}
                  </>
                ),
              })),
            ]}
          />
        )}
      </Field>

      <Field label="Priority">
        <Segmented
          aria-label="Priority"
          value={state.priority}
          onChange={(v) => set("priority", v)}
          options={PRIORITIES.map((p) => ({
            value: p.value,
            label: (
              <>
                <span className={`size-2 rounded-full ${p.dot}`} /> {p.label}
              </>
            ),
          }))}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={state.kind === "plan" ? "Date" : "Due date (optional)"} htmlFor="date">
          <Input
            id="date"
            type="date"
            value={state.date}
            onChange={(e) => set("date", e.target.value)}
            required={state.kind === "plan"}
          />
        </Field>
        <Field label="Time (optional)" htmlFor="time">
          <Input
            id="time"
            type="time"
            value={state.time}
            onChange={(e) => set("time", e.target.value)}
            disabled={!state.date}
          />
        </Field>
        {state.kind === "plan" && (
          <Field label="Until (optional)" htmlFor="end_date">
            <Input
              id="end_date"
              type="date"
              min={state.date}
              value={state.end_date}
              onChange={(e) => set("end_date", e.target.value)}
            />
          </Field>
        )}
        {state.date && (
          <Field label="Remind before (min)" htmlFor="remind">
            <Input
              id="remind"
              type="number"
              min={0}
              inputMode="numeric"
              value={state.remind_before_min}
              onChange={(e) => set("remind_before_min", e.target.value)}
              placeholder="e.g. 30"
            />
          </Field>
        )}
      </div>

      <Field label="Notes (optional)" htmlFor="notes">
        <Textarea
          id="notes"
          value={state.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          maxLength={2000}
        />
      </Field>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : task ? "Save" : "Add"}
        </Button>
      </div>
    </form>
  );
}
