"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/segmented";
import { PersonDot } from "@/components/person-dot";
import type { Person } from "@/components/chores/people";
import { leaveInputSchema, type LeaveInput } from "@/lib/leave-schema";
import type { DateStr } from "@/lib/dates";
import type { Leave, LeaveType } from "@/lib/types";
import { previewLeave, saveLeave, type LeavePreview } from "./actions";

export const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "away", label: "Away from home" },
  { value: "sick", label: "Sick" },
  { value: "other", label: "Other" },
];

export function LeaveForm({
  leave,
  people,
  me,
  today,
  onDone,
}: {
  leave?: Leave;
  people: Person[];
  me: Person;
  today: DateStr;
  onDone: () => void;
}) {
  const [state, setState] = useState<LeaveInput>(() => ({
    user_id: leave?.user_id ?? me.id,
    start_date: leave?.start_date ?? today,
    end_date: leave?.end_date ?? today,
    type: leave?.type ?? "away",
    note: leave?.note ?? "",
  }));
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<LeavePreview | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof LeaveInput>(key: K, value: LeaveInput[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const parsed = useMemo(() => leaveInputSchema.safeParse(state), [state]);
  const person = people.find((p) => p.id === state.user_id) ?? me;
  const other = people.find((p) => p.id !== state.user_id);

  // Preview which chores would move, whenever the dates or person change.
  const { user_id, start_date, end_date, type } = state;
  useEffect(() => {
    if (!parsed.success) return;
    let cancelled = false;
    previewLeave({ user_id, start_date, end_date, type }, leave?.id).then((result) => {
      if (!cancelled) setPreview(result);
    });
    return () => {
      cancelled = true;
    };
  }, [parsed.success, user_id, start_date, end_date, type, leave?.id]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveLeave(state, leave?.id);
      if (result.ok) {
        toast.success(leave ? "Leave updated" : "Leave added");
        onDone();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {people.length > 1 && (
        <div className="flex flex-col gap-2">
          <Label>Who</Label>
          <Segmented
            aria-label="Who is on leave"
            value={state.user_id}
            onChange={(v) => set("user_id", v)}
            options={people.map((p) => ({
              value: p.id,
              label: (
                <>
                  <PersonDot profile={p} /> {p.id === me.id ? "Me" : p.name}
                </>
              ),
            }))}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label>Reason</Label>
        <Segmented
          aria-label="Reason"
          value={state.type}
          onChange={(v) => set("type", v)}
          options={LEAVE_TYPES}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="start_date">From</Label>
          <Input
            id="start_date"
            type="date"
            value={state.start_date}
            onChange={(e) => {
              const start = e.target.value;
              setState((s) => ({
                ...s,
                start_date: start,
                // Keep the range valid when moving the start past the end.
                end_date: s.end_date < start ? start : s.end_date,
              }));
            }}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="end_date">To (including)</Label>
          <Input
            id="end_date"
            type="date"
            min={state.start_date}
            value={state.end_date}
            onChange={(e) => set("end_date", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea
          id="note"
          value={state.note ?? ""}
          onChange={(e) => set("note", e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="e.g. visiting family"
        />
      </div>

      {preview && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          {preview.movedToPartner === 0 && preview.paused === 0 ? (
            <p className="text-muted-foreground">No chores are affected on these days.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {preview.movedToPartner > 0 && (
                <li>
                  {preview.movedToPartner} shared chore{preview.movedToPartner === 1 ? "" : "s"}{" "}
                  will go to {other?.name ?? "the other person"}.
                </li>
              )}
              {preview.paused > 0 && (
                <li className="text-muted-foreground">
                  {preview.paused} of {person.id === me.id ? "your" : `${person.name}'s`} own chore
                  {preview.paused === 1 ? "" : "s"} will be paused.
                </li>
              )}
            </ul>
          )}
        </div>
      )}

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
          {pending ? "Saving…" : leave ? "Save changes" : "Add leave"}
        </Button>
      </div>
    </form>
  );
}
