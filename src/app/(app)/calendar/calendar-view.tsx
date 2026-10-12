"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarHeart,
  CalendarOff,
  Check,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Lock,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/segmented";
import { formatTime } from "@/lib/chore-meta";
import type { CalItem, CalKind } from "@/lib/calendar-items";
import { formatDay, type DateStr } from "@/lib/dates";
import { monthLabel } from "@/lib/points";
import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";

const KINDS: { value: CalKind; label: string; icon: LucideIcon }[] = [
  { value: "chore", label: "Chores", icon: WashingMachine },
  { value: "todo", label: "Todos", icon: ListTodo },
  { value: "plan", label: "Plans", icon: CalendarHeart },
  { value: "reminder", label: "Reminders", icon: Bell },
  { value: "leave", label: "Leave", icon: CalendarOff },
];
const KIND_ICON = Object.fromEntries(KINDS.map((k) => [k.value, k.icon])) as Record<
  CalKind,
  LucideIcon
>;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STORAGE_KEY = "nila.calendar.filters";

type Who = "me" | "partner" | "both";
type Filters = { who: Who[]; kinds: CalKind[] };
const ALL: Filters = { who: ["me", "partner", "both"], kinds: KINDS.map((k) => k.value) };

// Filters live in localStorage (just this browser). Read through an external
// store so the server render (no storage) and the client agree.
const FILTERS_EVENT = "nila:calendar-filters";

// Fallback when storage is blocked (e.g. some private windows).
let inMemory: string | null = null;

function readSaved(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? inMemory;
  } catch {
    return inMemory;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(FILTERS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(FILTERS_EVENT, onChange);
  };
}

function parseFilters(raw: string | null): Filters {
  try {
    const saved = JSON.parse(raw ?? "null");
    if (saved && Array.isArray(saved.who) && Array.isArray(saved.kinds)) return saved;
  } catch {}
  return ALL;
}

function saveFilters(next: Filters) {
  inMemory = JSON.stringify(next);
  try {
    localStorage.setItem(STORAGE_KEY, inMemory);
  } catch {}
  window.dispatchEvent(new Event(FILTERS_EVENT));
}

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** A person's color, or both colors split for "both of you". */
function dotStyle(personId: string | null, people: Person[]): React.CSSProperties {
  if (personId) return { background: people.find((p) => p.id === personId)?.color ?? "#94a3b8" };
  const [a, b] = people;
  return b
    ? { background: `linear-gradient(90deg, ${a.color} 50%, ${b.color} 50%)` }
    : { background: a?.color ?? "#94a3b8" };
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
        pressed
          ? "border-primary bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function ItemLine({ item, people }: { item: CalItem; people: Person[] }) {
  const Icon = KIND_ICON[item.kind];
  const done = item.status === "done";
  const skipped = item.status === "skipped";
  const time = formatTime(item.time);
  const href =
    item.kind === "reminder"
      ? "/reminders"
      : item.kind === "leave"
        ? "/leave"
        : `/?date=${item.date}`;
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "hover:bg-muted flex items-center gap-3 rounded-lg px-2 py-2",
          (done || skipped) && "opacity-60",
        )}
      >
        <span className="size-2.5 shrink-0 rounded-full" style={dotStyle(item.personId, people)} />
        <Icon className="text-muted-foreground size-4 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm", (done || skipped) && "line-through")}>
            {item.title}
          </span>
          {(time || item.note || item.projected || skipped) && (
            <span className="text-muted-foreground block truncate text-xs">
              {[time, skipped ? "Paused" : item.note, item.projected && !skipped ? "planned" : null]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
        </span>
        {item.personal && <Lock className="text-muted-foreground size-3.5 shrink-0" />}
        {done && <Check className="size-4 shrink-0 text-emerald-600" />}
      </Link>
    </li>
  );
}

function DayList({
  date,
  today,
  items,
  people,
  showOpen = true,
}: {
  date: DateStr;
  today: DateStr;
  items: CalItem[];
  people: Person[];
  showOpen?: boolean;
}) {
  return (
    <section>
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">
          {date === today ? "Today · " : ""}
          {formatDay(date, "EEEE, d MMMM")}
        </h2>
        {showOpen && (
          <Link
            href={date === today ? "/" : `/?date=${date}`}
            className="text-muted-foreground text-xs underline-offset-2 hover:underline"
          >
            Open day
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground px-2 py-3 text-sm">Nothing on this day.</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => (
            <ItemLine key={item.key} item={item} people={people} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function CalendarView({
  month,
  days,
  today,
  items,
  people,
  meId,
}: {
  month: string;
  days: DateStr[];
  today: DateStr;
  items: Record<DateStr, CalItem[]>;
  people: Person[];
  meId: string;
}) {
  const inMonth = (d: DateStr) => d.startsWith(month);
  const [view, setView] = useState<"month" | "list">("month");
  const [selected, setSelected] = useState<DateStr>(inMonth(today) ? today : `${month}-01`);
  const raw = useSyncExternalStore(subscribe, readSaved, () => null);
  const filters = useMemo(() => parseFilters(raw), [raw]);
  const update = saveFilters;
  const partner = people.find((p) => p.id !== meId);

  const visible = useMemo(() => {
    const whoOf = (i: CalItem): Who =>
      i.personId === null ? "both" : i.personId === meId ? "me" : "partner";
    const result: Record<DateStr, CalItem[]> = {};
    for (const [date, list] of Object.entries(items)) {
      result[date] = list.filter(
        (i) => filters.kinds.includes(i.kind) && filters.who.includes(whoOf(i)),
      );
    }
    return result;
  }, [items, filters, meId]);

  const [y, m] = month.split("-").map(Number);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const monthHref = (mm: string) =>
    mm === today.slice(0, 7) ? "/calendar" : `/calendar?month=${mm}`;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={<Link href={monthHref(prev)} aria-label="Previous month" />}
        >
          <ChevronLeft />
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">{monthLabel(month)}</h2>
          {!inMonth(today) && (
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href="/calendar" />}
            >
              Today
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={<Link href={monthHref(next)} aria-label="Next month" />}
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Whose">
          <Chip
            pressed={filters.who.includes("me")}
            onClick={() => update({ ...filters, who: toggle(filters.who, "me") })}
          >
            <span className="size-2 rounded-full" style={dotStyle(meId, people)} /> Me
          </Chip>
          {partner && (
            <>
              <Chip
                pressed={filters.who.includes("partner")}
                onClick={() => update({ ...filters, who: toggle(filters.who, "partner") })}
              >
                <span className="size-2 rounded-full" style={dotStyle(partner.id, people)} />{" "}
                {partner.name}
              </Chip>
              <Chip
                pressed={filters.who.includes("both")}
                onClick={() => update({ ...filters, who: toggle(filters.who, "both") })}
              >
                <span className="size-2 rounded-full" style={dotStyle(null, people)} /> Both
              </Chip>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="What">
          {KINDS.map(({ value, label, icon: Icon }) => (
            <Chip
              key={value}
              pressed={filters.kinds.includes(value)}
              onClick={() => update({ ...filters, kinds: toggle(filters.kinds, value) })}
            >
              <Icon className="size-3.5" /> {label}
            </Chip>
          ))}
        </div>
      </div>

      <Segmented
        aria-label="View"
        value={view}
        onChange={setView}
        className="mb-4"
        options={[
          { value: "month", label: "Month" },
          { value: "list", label: "List" },
        ]}
      />

      {view === "month" ? (
        <>
          <div className="mb-4 overflow-hidden rounded-xl border">
            <div className="bg-muted/50 grid grid-cols-7 border-b text-center text-xs font-medium">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-muted-foreground py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((date, i) => {
                const list = visible[date] ?? [];
                const leaves = list.filter((x) => x.kind === "leave");
                const others = list.filter((x) => x.kind !== "leave");
                const leaveColor = leaves[0]
                  ? people.find((p) => p.id === leaves[0].personId)?.color
                  : undefined;
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelected(date)}
                    aria-pressed={selected === date}
                    aria-label={`${formatDay(date, "EEEE d MMMM")}: ${list.length} item${list.length === 1 ? "" : "s"}`}
                    className={cn(
                      "relative flex min-h-16 flex-col items-stretch gap-1 border-b p-1 text-left md:min-h-24",
                      i % 7 !== 6 && "border-r",
                      !inMonth(date) && "text-muted-foreground bg-muted/30",
                      selected === date && "ring-primary z-10 ring-2 ring-inset",
                    )}
                    style={leaveColor ? { backgroundColor: `${leaveColor}22` } : undefined}
                  >
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center self-center rounded-full text-xs md:self-start",
                        date === today && "bg-primary text-primary-foreground font-semibold",
                      )}
                    >
                      {Number(date.slice(8))}
                    </span>
                    {/* Phones: colored dots. Wider screens: short titles. */}
                    <span className="flex flex-wrap justify-center gap-0.5 md:hidden">
                      {others.slice(0, 6).map((x) => (
                        <span
                          key={x.key}
                          className={cn(
                            "size-1.5 rounded-full",
                            x.status !== "open" && "opacity-40",
                          )}
                          style={dotStyle(x.personId, people)}
                        />
                      ))}
                    </span>
                    <span className="hidden flex-col gap-0.5 md:flex">
                      {others.slice(0, 3).map((x) => (
                        <span
                          key={x.key}
                          className={cn(
                            "flex items-center gap-1 truncate text-[11px] leading-tight",
                            x.status !== "open" && "text-muted-foreground line-through",
                          )}
                        >
                          <span
                            className="size-1.5 shrink-0 rounded-full"
                            style={dotStyle(x.personId, people)}
                          />
                          <span className="truncate">{x.title}</span>
                        </span>
                      ))}
                      {others.length > 3 && (
                        <span className="text-muted-foreground text-[11px]">
                          +{others.length - 3} more
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <DayList date={selected} today={today} items={visible[selected] ?? []} people={people} />
        </>
      ) : (
        <div className="flex flex-col gap-5">
          {days
            .filter((d) => inMonth(d) && (visible[d]?.length ?? 0) > 0)
            .map((d) => (
              <DayList key={d} date={d} today={today} items={visible[d]} people={people} />
            ))}
          {days.every((d) => !inMonth(d) || (visible[d]?.length ?? 0) === 0) && (
            <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
              Nothing this month with these filters.
            </p>
          )}
        </div>
      )}

      <p className="text-muted-foreground mt-6 text-xs">
        &ldquo;planned&rdquo; chores are worked out from their schedule and may still change, for
        example if one of you takes leave. Your partner&apos;s private things never show here.
      </p>
    </>
  );
}
