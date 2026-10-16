"use client";

import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/segmented";
import { addDays, formatDay, todayIST } from "@/lib/dates";
import { URGENCIES, urgencyFor } from "@/lib/shopping-meta";
import type { Urgency } from "@/lib/types";
import { cn } from "@/lib/utils";

export type When = { urgency: Urgency; needBy: string | null };

/** Today / Week / Month / Someday, or a date that picks the section for you. */
export function WhenPicker({
  value,
  onChange,
  dots = false,
  className,
}: {
  value: When;
  onChange: (value: When) => void;
  /** Show each section's color dot. */
  dots?: boolean;
  className?: string;
}) {
  const today = todayIST();
  const atDate = (needBy: string) => onChange({ needBy, urgency: urgencyFor(needBy, today) });
  const section = value.needBy ? urgencyFor(value.needBy, today) : null;

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Segmented<Urgency | "date">
        aria-label="When do you need it?"
        value={value.needBy ? "date" : value.urgency}
        onChange={(v) =>
          v === "date"
            ? atDate(value.needBy ?? addDays(today, 1))
            : onChange({ urgency: v, needBy: null })
        }
        options={[
          ...URGENCIES.map((u) => ({
            value: u.value,
            label: (
              <>
                {dots && <span className={cn("size-1.5 shrink-0 rounded-full", u.dot)} />}
                {u.short}
              </>
            ),
          })),
          {
            value: "date" as const,
            label: (
              <>
                <CalendarDays className="size-3.5 shrink-0" />
                Date
              </>
            ),
          },
        ]}
      />
      {value.needBy && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="Needed by"
            value={value.needBy}
            min={today}
            onChange={(e) => e.target.value && atDate(e.target.value)}
            className="w-44"
          />
          <span className="text-muted-foreground text-xs">
            {formatDay(value.needBy, "EEE d MMM")} · goes under{" "}
            {URGENCIES.find((u) => u.value === section)?.label.toLowerCase()}
          </span>
        </div>
      )}
    </div>
  );
}
