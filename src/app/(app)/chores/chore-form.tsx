"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/native-select";
import { Segmented } from "@/components/segmented";
import { PersonDot } from "@/components/person-dot";
import { personById, type Person } from "@/components/chores/people";
import { CHORE_CATEGORIES, PRIORITIES } from "@/lib/chore-meta";
import { choreInputSchema, type ChoreInput } from "@/lib/chore-schema";
import { addDays, formatDay, isoWeekday, type DateStr } from "@/lib/dates";
import { planOccurrences } from "@/lib/rotation";
import type { AssignmentType, Chore, RecurFreq, RotationUnit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { saveChore } from "./actions";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PREVIEW_DAYS = 28;

type FormState = {
  title: string;
  category: string;
  notes: string;
  priority: ChoreInput["priority"];
  assignment_type: AssignmentType;
  fixed_assignee: string;
  first_turn: string;
  rotation_unit: RotationUnit;
  start_date: DateStr;
  freq: RecurFreq;
  by_weekday: number[];
  by_monthday: string;
  due_time: string;
  duration_min: string;
  remind_before_min: string;
};

function initialState(
  chore: Chore | undefined,
  me: Person,
  today: DateStr,
  hasPartner: boolean,
): FormState {
  if (chore) {
    return {
      title: chore.title,
      category: chore.category,
      notes: chore.notes ?? "",
      priority: chore.priority,
      assignment_type: chore.assignment_type,
      fixed_assignee: chore.fixed_assignee ?? me.id,
      first_turn: chore.rotation_order?.[0] ?? me.id,
      rotation_unit: chore.rotation_unit,
      start_date: chore.start_date,
      freq: chore.freq,
      by_weekday: chore.by_weekday ?? [isoWeekday(today)],
      by_monthday: String(chore.by_monthday ?? Number(today.slice(8, 10))),
      due_time: chore.due_time?.slice(0, 5) ?? "",
      duration_min: chore.duration_min?.toString() ?? "",
      remind_before_min: chore.remind_before_min?.toString() ?? "",
    };
  }
  return {
    title: "",
    category: "laundry",
    notes: "",
    priority: "med",
    assignment_type: hasPartner ? "rotating" : "fixed",
    fixed_assignee: me.id,
    first_turn: me.id,
    rotation_unit: "per_week",
    start_date: today,
    freq: "weekly",
    by_weekday: [isoWeekday(today)],
    by_monthday: String(Number(today.slice(8, 10))),
    due_time: "",
    duration_min: "",
    remind_before_min: "",
  };
}

const toInt = (v: string) => (v.trim() === "" ? null : Number(v));

function toInput(s: FormState, people: Person[]): ChoreInput {
  const second = people.find((p) => p.id !== s.first_turn);
  return {
    title: s.title,
    category: s.category,
    notes: s.notes,
    priority: s.priority,
    assignment_type: s.assignment_type,
    fixed_assignee: s.fixed_assignee,
    rotation_order: second ? [s.first_turn, second.id] : [s.first_turn],
    rotation_unit: s.rotation_unit,
    start_date: s.start_date,
    freq: s.freq,
    by_weekday: s.by_weekday,
    by_monthday: toInt(s.by_monthday),
    due_time: s.due_time,
    duration_min: toInt(s.duration_min),
    remind_before_min: toInt(s.remind_before_min),
  };
}

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

export function ChoreForm({
  chore,
  people,
  me,
  today,
  onDone,
}: {
  chore?: Chore;
  people: Person[];
  me: Person;
  today: DateStr;
  onDone: () => void;
}) {
  const [state, setState] = useState(() => initialState(chore, me, today, people.length > 1));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const hasPartner = people.length > 1;
  const parsed = useMemo(() => choreInputSchema.safeParse(toInput(state, people)), [state, people]);

  const preview = useMemo(() => {
    if (!parsed.success) return [];
    const from = parsed.data.start_date > today ? parsed.data.start_date : today;
    return planOccurrences(parsed.data, from, addDays(from, PREVIEW_DAYS - 1)).slice(0, 8);
  }, [parsed, today]);

  function toggleWeekday(day: number) {
    set(
      "by_weekday",
      state.by_weekday.includes(day)
        ? state.by_weekday.filter((d) => d !== day)
        : [...state.by_weekday, day],
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveChore(toInput(state, people), chore?.id);
      if (result.ok) {
        toast.success(chore ? "Chore updated" : "Chore added");
        onDone();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Field label="Name" htmlFor="title">
        <Input
          id="title"
          value={state.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Laundry"
          maxLength={80}
          autoFocus
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category" htmlFor="category">
          <NativeSelect
            id="category"
            value={state.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {CHORE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Priority" htmlFor="priority">
          <NativeSelect
            id="priority"
            value={state.priority}
            onChange={(e) => set("priority", e.target.value as FormState["priority"])}
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <Field label="Who does it">
        <Segmented
          aria-label="Who does it"
          value={state.assignment_type}
          onChange={(v) => set("assignment_type", v)}
          options={[
            ...(hasPartner ? [{ value: "rotating" as const, label: "Take turns" }] : []),
            { value: "fixed", label: "One person" },
            { value: "together", label: "Together" },
          ]}
        />
        {state.assignment_type === "fixed" && (
          <Segmented
            aria-label="Person"
            value={state.fixed_assignee}
            onChange={(v) => set("fixed_assignee", v)}
            options={people.map((p) => ({
              value: p.id,
              label: (
                <>
                  <PersonDot profile={p} /> {p.name}
                </>
              ),
            }))}
          />
        )}
        {state.assignment_type === "rotating" && (
          <div className="flex flex-col gap-3 rounded-lg border p-3">
            <Field label="First turn">
              <Segmented
                aria-label="First turn"
                value={state.first_turn}
                onChange={(v) => set("first_turn", v)}
                options={people.map((p) => ({
                  value: p.id,
                  label: (
                    <>
                      <PersonDot profile={p} /> {p.name}
                    </>
                  ),
                }))}
              />
            </Field>
            <Field label="Switch turns">
              <Segmented
                aria-label="Switch turns"
                value={state.rotation_unit}
                onChange={(v) => set("rotation_unit", v)}
                options={[
                  { value: "per_week", label: "Every week" },
                  { value: "per_occurrence", label: "Every time" },
                ]}
              />
            </Field>
          </div>
        )}
      </Field>

      <Field label="How often">
        <Segmented
          aria-label="How often"
          value={state.freq}
          onChange={(v) => set("freq", v)}
          options={[
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
          ]}
        />
        {state.freq === "weekly" && (
          <div className="flex gap-1" role="group" aria-label="Days of the week">
            {WEEKDAYS.map((label, i) => {
              const day = i + 1;
              const on = state.by_weekday.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleWeekday(day)}
                  className={cn(
                    "flex-1 rounded-md border py-1.5 text-xs font-medium",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
        {state.freq === "monthly" && (
          <div className="flex items-center gap-2 text-sm">
            On day
            <Input
              type="number"
              min={1}
              max={31}
              value={state.by_monthday}
              onChange={(e) => set("by_monthday", e.target.value)}
              className="w-20"
              aria-label="Day of the month"
            />
            of each month
          </div>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts on" htmlFor="start_date">
          <Input
            id="start_date"
            type="date"
            value={state.start_date}
            onChange={(e) => set("start_date", e.target.value)}
            required
          />
        </Field>
        <Field label="Time (optional)" htmlFor="due_time">
          <Input
            id="due_time"
            type="time"
            value={state.due_time}
            onChange={(e) => set("due_time", e.target.value)}
          />
        </Field>
        <Field label="Takes (minutes)" htmlFor="duration_min">
          <Input
            id="duration_min"
            type="number"
            min={1}
            inputMode="numeric"
            value={state.duration_min}
            onChange={(e) => set("duration_min", e.target.value)}
            placeholder="e.g. 30"
          />
        </Field>
        <Field label="Remind before (min)" htmlFor="remind_before_min">
          <Input
            id="remind_before_min"
            type="number"
            min={0}
            inputMode="numeric"
            value={state.remind_before_min}
            onChange={(e) => set("remind_before_min", e.target.value)}
            placeholder="e.g. 15"
          />
        </Field>
      </div>

      <Field label="Notes (optional)" htmlFor="notes">
        <Textarea
          id="notes"
          value={state.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          maxLength={500}
        />
      </Field>

      <div className="bg-muted/50 rounded-lg p-3">
        <p className="mb-2 text-sm font-medium">Next 4 weeks</p>
        {preview.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {parsed.success
              ? "Nothing scheduled in the next 4 weeks."
              : parsed.error.issues[0]?.message}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
            {preview.map((o) => {
              const person = personById(people, o.assignee_id);
              return (
                <li key={o.date} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{formatDay(o.date)}</span>
                  <span className="flex items-center gap-1.5">
                    {person ? (
                      <>
                        <PersonDot profile={person} /> {person.name}
                      </>
                    ) : (
                      "Together"
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

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
          {pending ? "Saving…" : chore ? "Save changes" : "Add chore"}
        </Button>
      </div>
    </form>
  );
}
