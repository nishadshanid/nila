"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/segmented";
import { REMINDER_TYPES } from "@/lib/reminder-meta";
import { reminderInputSchema, type ReminderInput } from "@/lib/reminder-schema";
import { nextOccurrence } from "@/lib/reminder-schedule";
import { isoWeekday, relativeDay, type DateStr } from "@/lib/dates";
import type { Reminder, ReminderFreq, ReminderType, Visibility } from "@/lib/types";
import { cn } from "@/lib/utils";
import { saveReminder } from "./actions";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LEAD_OPTIONS = [0, 1, 3, 7];

type State = {
  type: ReminderType;
  title: string;
  freq: ReminderFreq;
  start_date: DateStr;
  interval_days: string;
  by_weekday: number[];
  month_mode: "day" | "last";
  by_monthday: string;
  time: string;
  lead_days: number;
  notes: string;
  visibility: Visibility;
};

/** Sensible defaults when you pick a type. */
function presetFor(type: ReminderType, today: DateStr): Partial<State> {
  switch (type) {
    case "birthday":
      return { freq: "yearly", lead_days: 1, time: "" };
    case "anniversary":
      return { freq: "yearly", lead_days: 3, time: "" };
    case "call":
      return { freq: "weekly", by_weekday: [7], time: "19:00", lead_days: 0 };
    case "custom":
      return { freq: "once", lead_days: 0, start_date: today };
  }
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

export function ReminderForm({
  reminder,
  hasPartner,
  canChangeVisibility,
  today,
  onDone,
}: {
  reminder?: Reminder;
  hasPartner: boolean;
  canChangeVisibility: boolean;
  today: DateStr;
  onDone: () => void;
}) {
  const [state, setState] = useState<State>(() => ({
    type: reminder?.type ?? "birthday",
    title: reminder?.title ?? "",
    freq: reminder?.freq ?? "yearly",
    start_date: reminder?.start_date ?? today,
    interval_days: String(reminder?.interval_days ?? 1),
    by_weekday: reminder?.by_weekday ?? [isoWeekday(today)],
    month_mode: reminder?.by_monthday === -1 ? "last" : "day",
    by_monthday: String(
      reminder?.by_monthday && reminder.by_monthday > 0
        ? reminder.by_monthday
        : Number(today.slice(8, 10)),
    ),
    time: reminder?.time?.slice(0, 5) ?? "",
    lead_days: reminder?.lead_days ?? 1,
    notes: reminder?.notes ?? "",
    visibility: reminder?.visibility ?? (hasPartner ? "couple" : "personal"),
  }));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof State>(key: K, value: State[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const yearly = state.type === "birthday" || state.type === "anniversary";

  const input: ReminderInput = {
    title: state.title,
    type: state.type,
    freq: state.freq,
    start_date: state.start_date,
    interval_days: Number(state.interval_days) || 0,
    by_weekday: state.by_weekday,
    by_monthday: state.month_mode === "last" ? -1 : Number(state.by_monthday) || null,
    time: state.time,
    lead_days: state.lead_days,
    notes: state.notes,
    visibility: state.visibility,
  };
  const parsed = reminderInputSchema.safeParse(input);
  // Cheap (at most a year of days), so no need to memoize.
  const next = parsed.success ? nextOccurrence(parsed.data, today) : null;

  function pickType(type: ReminderType) {
    setState((s) => ({ ...s, type, ...presetFor(type, today) }));
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
      const result = await saveReminder(input, reminder?.id);
      if (result.ok) {
        toast.success(reminder ? "Reminder saved" : "Reminder added");
        onDone();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Segmented
        aria-label="Type"
        value={state.type}
        onChange={pickType}
        options={REMINDER_TYPES.map((t) => ({
          value: t.value,
          label: (
            <>
              <t.icon className="size-3.5" /> <span className="hidden sm:inline">{t.label}</span>
            </>
          ),
        }))}
      />

      <Field label="Title" htmlFor="title">
        <Input
          id="title"
          value={state.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder={
            {
              birthday: "e.g. Amma's birthday",
              anniversary: "e.g. Our wedding anniversary",
              call: "e.g. Call parents",
              custom: "e.g. Renew car insurance",
            }[state.type]
          }
          maxLength={120}
          autoFocus
          required
        />
      </Field>

      {!yearly && (
        <Field label="Repeats">
          <Segmented
            aria-label="Repeats"
            value={state.freq}
            onChange={(v) => set("freq", v)}
            options={[
              { value: "once", label: "Once" },
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
              { value: "yearly", label: "Yearly" },
            ]}
          />
          {state.freq === "daily" && (
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
                aria-label="Every how many days"
              />
              day(s)
            </div>
          )}
          {state.freq === "weekly" && (
            <div className="flex gap-1" role="group" aria-label="Days of the week">
              {WEEKDAYS.map((label, i) => {
                const on = state.by_weekday.includes(i + 1);
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleWeekday(i + 1)}
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
                value={state.month_mode}
                onChange={(v) => set("month_mode", v)}
                options={[
                  { value: "day", label: "On a date" },
                  { value: "last", label: "Last day" },
                ]}
              />
              {state.month_mode === "day" && (
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
                </div>
              )}
            </div>
          )}
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field
          label={
            state.type === "birthday"
              ? "Birthday"
              : state.type === "anniversary"
                ? "Date"
                : state.freq === "once" || state.freq === "yearly"
                  ? "Date"
                  : "Starts on"
          }
          htmlFor="start_date"
        >
          <Input
            id="start_date"
            type="date"
            value={state.start_date}
            onChange={(e) => set("start_date", e.target.value)}
            required
          />
        </Field>
        <Field label="Time (optional)" htmlFor="time">
          <Input
            id="time"
            type="time"
            value={state.time}
            onChange={(e) => set("time", e.target.value)}
          />
        </Field>
      </div>
      {yearly && (
        <p className="text-muted-foreground -mt-3 text-xs">
          Any year works; if you enter the real year, Nila shows the age or years.
        </p>
      )}

      <Field label="Heads-up">
        <Segmented
          aria-label="Heads-up"
          value={String(state.lead_days)}
          onChange={(v) => set("lead_days", Number(v))}
          options={LEAD_OPTIONS.map((d) => ({
            value: String(d),
            label: d === 0 ? "On the day" : `${d} day${d === 1 ? "" : "s"} before`,
          }))}
        />
      </Field>

      {hasPartner && (
        <Field label="Who sees it">
          <Segmented
            aria-label="Who sees it"
            value={state.visibility}
            onChange={(v) => canChangeVisibility && set("visibility", v)}
            options={[
              { value: "couple", label: "Both of us" },
              { value: "personal", label: "Just me (private)" },
            ]}
          />
        </Field>
      )}

      <Field label="Notes (optional)" htmlFor="notes">
        <Textarea
          id="notes"
          value={state.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder={state.type === "birthday" ? "e.g. gift ideas" : undefined}
        />
      </Field>

      <p className="text-muted-foreground text-sm">
        {parsed.success
          ? next
            ? `Next: ${relativeDay(next, today)}`
            : "This won't happen again."
          : parsed.error.issues[0]?.message}
      </p>

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
          {pending ? "Saving…" : reminder ? "Save" : "Add reminder"}
        </Button>
      </div>
    </form>
  );
}
