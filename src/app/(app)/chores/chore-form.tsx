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
import { CHORE_CATEGORIES, PRIORITIES, formatTime } from "@/lib/chore-meta";
import { choreInputSchema, type ChoreInput } from "@/lib/chore-schema";
import { addDays, formatDay, isoWeekday, type DateStr } from "@/lib/dates";
import { planOccurrences } from "@/lib/rotation";
import { describeRule } from "@/lib/recurrence";
import type { AssignmentType, Chore, RecurFreq, RotationUnit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { saveChore } from "./actions";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PREVIEW_DAYS = 28;
const PREVIEW_ITEMS = 8;

type FormState = {
  title: string;
  category: string;
  notes: string;
  priority: ChoreInput["priority"];
  assignment_type: AssignmentType;
  first_turn: string;
  rotation_unit: RotationUnit;
  start_date: DateStr;
  freq: RecurFreq;
  by_weekday: number[];
  month_mode: "day" | "last";
  /** Weekly/monthly on any days: N times per period instead of set days. */
  flexible: boolean;
  flex_target: string;
  by_monthday: string;
  /** "1" = every day, "2" = alternate days; a string so the field can be cleared while typing. */
  interval_days: string;
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
  const todayOfMonth = String(Number(today.slice(8, 10)));
  if (chore) {
    return {
      title: chore.title,
      category: chore.category,
      notes: chore.notes ?? "",
      priority: chore.priority,
      assignment_type: chore.assignment_type,
      first_turn: chore.rotation_order?.[0] ?? me.id,
      rotation_unit: chore.rotation_unit,
      start_date: chore.start_date,
      freq: chore.freq,
      by_weekday: chore.by_weekday ?? [isoWeekday(today)],
      month_mode: chore.by_monthday === -1 ? "last" : "day",
      flexible: chore.flex_target != null,
      flex_target: String(chore.flex_target ?? 3),
      by_monthday:
        chore.by_monthday && chore.by_monthday > 0 ? String(chore.by_monthday) : todayOfMonth,
      interval_days: String(chore.interval_days),
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
    first_turn: me.id,
    rotation_unit: "per_week",
    start_date: today,
    freq: "weekly",
    by_weekday: [isoWeekday(today)],
    month_mode: "day",
    flexible: false,
    flex_target: "3",
    by_monthday: todayOfMonth,
    interval_days: "1",
    due_time: "",
    duration_min: "",
    remind_before_min: "",
  };
}

const toInt = (v: string) => (v.trim() === "" ? null : Number(v));

function toInput(s: FormState, people: Person[], me: Person): ChoreInput {
  const second = people.find((p) => p.id !== s.first_turn);
  return {
    title: s.title,
    category: s.category,
    notes: s.notes,
    priority: s.priority,
    assignment_type: s.assignment_type,
    // "Just me": the server also enforces this.
    fixed_assignee: me.id,
    rotation_order: second ? [s.first_turn, second.id] : [s.first_turn],
    rotation_unit: s.rotation_unit,
    start_date: s.start_date,
    freq: s.freq,
    by_weekday: s.by_weekday,
    by_monthday: s.month_mode === "last" ? -1 : toInt(s.by_monthday),
    interval_days: toInt(s.interval_days) ?? 0,
    flex_target: s.flexible && s.freq !== "daily" ? (toInt(s.flex_target) ?? 0) : null,
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

function PersonLabel({ person }: { person: Person }) {
  return (
    <>
      <PersonDot profile={person} /> {person.name}
    </>
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
  const input = useMemo(() => toInput(state, people, me), [state, people, me]);
  const parsed = useMemo(() => choreInputSchema.safeParse(input), [input]);

  const preview = useMemo(() => {
    if (!parsed.success) return [];
    const from = parsed.data.start_date > today ? parsed.data.start_date : today;
    return planOccurrences(parsed.data, from, addDays(from, PREVIEW_DAYS - 1)).slice(
      0,
      PREVIEW_ITEMS,
    );
  }, [parsed, today]);

  function setFlexible(flexible: boolean) {
    setState((s) => ({
      ...s,
      flexible,
      // Taking turns needs set days; any-day chores are yours or together.
      assignment_type: flexible && s.assignment_type === "rotating" ? "fixed" : s.assignment_type,
    }));
  }

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
      const result = await saveChore(input, chore?.id);
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
        {state.freq === "daily" && (
          <div className="flex flex-col gap-2">
            <Segmented
              aria-label="Repeat"
              value={
                state.interval_days === "1" ? "1" : state.interval_days === "2" ? "2" : "custom"
              }
              onChange={(v) => set("interval_days", v === "custom" ? "3" : v)}
              options={[
                { value: "1", label: "Every day" },
                { value: "2", label: "Alternate days" },
                { value: "custom", label: "Every N days" },
              ]}
            />
            {state.interval_days !== "1" && state.interval_days !== "2" && (
              <div className="flex items-center gap-2 text-sm">
                Every
                <Input
                  type="number"
                  min={1}
                  max={365}
                  inputMode="numeric"
                  value={state.interval_days}
                  onChange={(e) => set("interval_days", e.target.value)}
                  className="w-20"
                  aria-label="Number of days"
                />
                days
              </div>
            )}
            {state.interval_days !== "1" && (
              <p className="text-muted-foreground text-xs">Counted from the start date below.</p>
            )}
          </div>
        )}
        {state.freq === "weekly" && (
          <Segmented
            aria-label="Which days"
            value={state.flexible ? "any" : "set"}
            onChange={(v) => setFlexible(v === "any")}
            options={[
              { value: "set", label: "On set days" },
              { value: "any", label: "Any days" },
            ]}
          />
        )}
        {state.freq !== "daily" && state.flexible && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm">
              <Input
                type="number"
                min={1}
                max={state.freq === "weekly" ? 7 : 31}
                inputMode="numeric"
                value={state.flex_target}
                onChange={(e) => set("flex_target", e.target.value)}
                className="w-20"
                aria-label="Times per period"
              />
              times a {state.freq === "weekly" ? "week (Mon–Sun)" : "month"}, on any days
            </div>
            <p className="text-muted-foreground text-xs">
              Tick it on the Today page on the days you do it.
            </p>
          </div>
        )}
        {state.freq === "weekly" && !state.flexible && (
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
          <div className="flex flex-col gap-2">
            <Segmented
              aria-label="Day of the month"
              value={state.flexible ? "any" : state.month_mode}
              onChange={(v) => {
                setFlexible(v === "any");
                if (v !== "any") set("month_mode", v);
              }}
              options={[
                { value: "day", label: "On a date" },
                { value: "last", label: "Last day" },
                { value: "any", label: "Any days" },
              ]}
            />
            {state.flexible ? null : state.month_mode === "day" ? (
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
            ) : (
              <p className="text-muted-foreground text-xs">
                Falls on the 28th, 29th, 30th or 31st, whichever is the last day.
              </p>
            )}
          </div>
        )}
      </Field>

      <Field label="Who does it">
        <Segmented
          aria-label="Who does it"
          value={state.assignment_type}
          onChange={(v) => set("assignment_type", v)}
          options={[
            ...(hasPartner && !(state.flexible && state.freq !== "daily")
              ? [{ value: "rotating" as const, label: "Take turns" }]
              : []),
            { value: "fixed", label: "Just me" },
            ...(hasPartner ? [{ value: "together" as const, label: "Together" }] : []),
          ]}
        />
        {state.assignment_type === "rotating" && (
          <div className="flex flex-col gap-3 rounded-lg border p-3">
            <Field label="First turn">
              <Segmented
                aria-label="First turn"
                value={state.first_turn}
                onChange={(v) => set("first_turn", v)}
                options={people.map((p) => ({ value: p.id, label: <PersonLabel person={p} /> }))}
              />
            </Field>
            <Field label="Switch turns">
              <Segmented
                aria-label="Switch turns"
                value={state.rotation_unit}
                onChange={(v) => set("rotation_unit", v)}
                options={[
                  { value: "per_occurrence", label: "Every time" },
                  { value: "per_week", label: "Every week" },
                ]}
              />
              <p className="text-muted-foreground text-xs">
                {state.rotation_unit === "per_occurrence" &&
                  "Each time it happens, it's the other person's turn."}
                {state.rotation_unit === "per_week" &&
                  "One person does it the whole week (Mon–Sun), then you swap."}
              </p>
            </Field>
          </div>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Time (optional)" htmlFor="due_time">
          <Input
            id="due_time"
            type="time"
            value={state.due_time}
            onChange={(e) => set("due_time", e.target.value)}
          />
        </Field>
        <Field label="Starts on" htmlFor="start_date">
          <Input
            id="start_date"
            type="date"
            value={state.start_date}
            onChange={(e) => set("start_date", e.target.value)}
            required
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
        <p className="mb-2 text-sm font-medium">Coming up</p>
        {parsed.success && parsed.data.flex_target != null ? (
          <p className="text-muted-foreground text-sm">
            {describeRule(parsed.data)}, on whichever days suit you. Progress shows on Today.
          </p>
        ) : preview.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {parsed.success
              ? "Nothing scheduled in the next 4 weeks."
              : parsed.error.issues[0]?.message}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
            {preview.map((o) => {
              const person = personById(people, o.assignee_id);
              const when = formatTime(o.due_time);
              return (
                <li key={o.date} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">
                    {formatDay(o.date)}
                    {when && ` · ${when}`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {person ? <PersonLabel person={person} /> : "Together"}
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
