import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatTime } from "@/lib/chore-meta";
import { addDays, formatDay, toISTDate, type DateStr } from "@/lib/dates";
import { appUrl, sendEmail, type SendEmail } from "@/lib/email";
import {
  dailyDigest,
  handover,
  itemReminder,
  leaveAdded,
  monthlySummary,
  newTask,
  type Email,
  type Line,
} from "@/lib/email-templates";
import {
  candidateDates,
  digestDue,
  inWindow,
  istInstant,
  monthlySummaryDue,
  reminderAt,
} from "@/lib/notify-schedule";
import { MATERIALIZE_DAYS, materialize } from "@/lib/occurrences";
import { leaderOf, monthLabel } from "@/lib/points";
import { reminderOccursOn, reminderOnDay, yearsSince } from "@/lib/reminder-schedule";
import { formatQty } from "@/lib/shopping-parse";
import type { Reminder, ShoppingItem, Task } from "@/lib/types";

/** Reminders can be set up to a week early. */
const MAX_BEFORE_MIN = 7 * 24 * 60;

type Profile = {
  id: string;
  name: string;
  email: string;
  email_notifications: boolean;
  digest_time: string;
};

export type TickResult = { sent: number; errors: string[] };

const LEAVE_STATE = { away: "away", sick: "sick", other: "on leave" } as const;

/** "Today at 10:00 AM", "Tomorrow", "Wed 14 Oct at 6:00 PM" */
function whenLabel(date: DateStr, time: string | null, today: DateStr) {
  const day =
    date === today
      ? "Today"
      : date === addDays(today, 1)
        ? "Tomorrow"
        : formatDay(date, "EEE d MMM");
  const t = formatTime(time);
  return t ? `${day} at ${t}` : day;
}

/** The rows of a query, typed as `T`, or throws with what failed to load. */
function check<T>(result: { data: unknown; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Could not load ${what}: ${result.error.message}`);
  return result.data as T;
}

/**
 * One run of the scheduler: create upcoming chore rows, then send due item
 * reminders, daily digests, the monthly summary and queued events. Safe to
 * run any number of times: each email is logged before it's sent.
 */
export async function runTick(
  db: SupabaseClient,
  { now = Date.now(), send = sendEmail }: { now?: number; send?: SendEmail } = {},
): Promise<TickResult> {
  const url = appUrl();
  const today = toISTDate(now);
  const result: TickResult = { sent: 0, errors: [] };

  await materialize(db, today, addDays(today, MATERIALIZE_DAYS - 1));

  const profiles = check<Profile[]>(
    await db.from("profiles").select("id, name, email, email_notifications, digest_time"),
    "profiles",
  );
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const everyone = profiles.map((p) => p.id);
  const nameOf = (id: string | null, to: string) =>
    id === to ? "You" : (byId.get(id ?? "")?.name ?? "Your partner");

  /** Logs the email first (so it's sent once), then sends it; un-logs on failure to retry. */
  async function deliver(userId: string, kind: string, key: string, build: (p: Profile) => Email) {
    const profile = byId.get(userId);
    if (!profile?.email_notifications || !profile.email) return;
    const { data, error } = await db
      .from("notification_log")
      .upsert(
        { kind, key, user_id: userId },
        { onConflict: "kind,key,user_id", ignoreDuplicates: true },
      )
      .select("id");
    if (error) return void result.errors.push(`${kind} ${key}: ${error.message}`);
    if (!data?.length) return; // already sent
    try {
      await send(profile.email, build(profile));
      result.sent++;
    } catch (e) {
      await db.from("notification_log").delete().eq("id", data[0].id);
      result.errors.push(`${kind} ${key}: ${(e as Error).message}`);
    }
  }

  // 1. Item reminders: "Laundry at 10:00 AM", sent remind_before_min early.
  const dates = candidateDates(now, MAX_BEFORE_MIN);
  const [occurrences, tasks, reminders, acks] = await Promise.all([
    db
      .from("chore_occurrences")
      .select(
        "id, date, due_time, assignee_id, chore:chores!inner(title, remind_before_min, notes)",
      )
      .in("date", dates)
      .eq("status", "pending")
      .not("due_time", "is", null)
      .not("chore.remind_before_min", "is", null),
    db
      .from("tasks")
      .select("*")
      .in("date", dates)
      .eq("status", "open")
      .not("time", "is", null)
      .not("remind_before_min", "is", null),
    db.from("reminders").select("*").eq("active", true),
    db.from("reminder_acks").select("reminder_id, date").gte("date", addDays(today, -1)),
  ]);
  type OccRow = {
    id: string;
    date: DateStr;
    due_time: string;
    assignee_id: string | null;
    chore: { title: string; remind_before_min: number; notes: string | null };
  };
  const acked = new Set(
    check<{ reminder_id: string; date: string }[]>(acks, "reminder ticks").map(
      (a) => `${a.reminder_id}|${a.date}`,
    ),
  );
  const allReminders = check<Reminder[]>(reminders, "reminders");

  for (const o of check<OccRow[]>(occurrences, "chores")) {
    if (!inWindow(reminderAt(o.date, o.due_time, o.chore.remind_before_min), now)) continue;
    for (const userId of o.assignee_id ? [o.assignee_id] : everyone) {
      await deliver(userId, "item_reminder", `chore:${o.id}`, (p) =>
        itemReminder({
          appUrl: url,
          name: p.name,
          title: o.chore.title,
          kind: o.assignee_id ? "Chore" : "Chore (together)",
          when: whenLabel(o.date, o.due_time, today),
          note: o.chore.notes,
        }),
      );
    }
  }

  for (const t of check<Task[]>(tasks, "tasks")) {
    if (!inWindow(reminderAt(t.date!, t.time!, t.remind_before_min!), now)) continue;
    const to =
      t.visibility === "personal" ? [t.owner_id] : t.assignee_id ? [t.assignee_id] : everyone;
    for (const userId of to) {
      await deliver(userId, "item_reminder", `task:${t.id}`, (p) =>
        itemReminder({
          appUrl: url,
          name: p.name,
          title: t.title,
          kind: t.kind === "plan" ? "Plan" : "Todo",
          when: whenLabel(t.date!, t.time, today),
          note: t.notes,
        }),
      );
    }
  }

  for (const r of allReminders) {
    if (!r.time) continue;
    for (const date of dates) {
      if (!reminderOccursOn(r, date) || acked.has(`${r.id}|${date}`)) continue;
      if (!inWindow(istInstant(date, r.time), now)) continue;
      for (const userId of r.visibility === "personal" ? [r.owner_id] : everyone) {
        await deliver(userId, "item_reminder", `reminder:${r.id}:${date}`, (p) =>
          itemReminder({
            appUrl: url,
            name: p.name,
            title: r.title,
            kind: "Reminder",
            when: whenLabel(date, r.time, today),
            note: r.notes,
          }),
        );
      }
    }
  }

  // 2. Daily digests, at each person's digest time.
  for (const profile of profiles) {
    const day = digestDue(profile.digest_time, now);
    if (!day) continue;
    const sections = await digestFor(db, profile.id, day, allReminders, acked);
    const empty = Object.values(sections).every((s) => s.length === 0);
    if (empty) continue;
    await deliver(profile.id, "digest", day, (p) =>
      dailyDigest({ appUrl: url, name: p.name, day: formatDay(day, "EEEE, d MMMM"), sections }),
    );
  }

  // 3. Monthly points summary, on the 1st from 08:00.
  const month = monthlySummaryDue(now);
  if (month) {
    const [scores, reward] = await Promise.all([
      db.from("monthly_scores").select("user_id, total").eq("month", month),
      db.from("monthly_rewards").select("title").eq("month", month).maybeSingle(),
    ]);
    const totals = check<{ user_id: string; total: number }[]>(scores, "scores");
    const leader = leaderOf(totals);
    for (const profile of profiles) {
      await deliver(profile.id, "monthly", month, (p) =>
        monthlySummary({
          appUrl: url,
          name: p.name,
          month: monthLabel(month),
          scores: profiles.map((q) => ({
            name: q.id === p.id ? "You" : q.name,
            total: totals.find((s) => s.user_id === q.id)?.total ?? 0,
          })),
          winner: leader ? nameOf(leader, p.id) : null,
          reward: reward.data?.title ?? null,
        }),
      );
    }
  }

  // 4. Events from the outbox: hand-overs, leaves, new todos for your partner.
  const pending = check<
    {
      id: number;
      kind: string;
      user_id: string;
      payload: Record<string, string | boolean | null>;
    }[]
  >(
    await db
      .from("notification_outbox")
      .select("id, kind, user_id, payload")
      .is("sent_at", null)
      .order("created_at")
      .limit(50),
    "queued notifications",
  );
  for (const event of pending) {
    // Claim it first so two overlapping ticks can't both send it.
    const claimed = await db
      .from("notification_outbox")
      .update({ sent_at: new Date(now).toISOString() })
      .eq("id", event.id)
      .is("sent_at", null)
      .select("id");
    if (!claimed.data?.length) continue;
    const profile = byId.get(event.user_id);
    if (!profile?.email_notifications || !profile.email) continue;
    const e = event.payload;
    const day = (d: unknown) => formatDay(String(d), "EEE d MMM");
    let email: Email | null = null;
    if (event.kind === "handover") {
      email = handover({
        appUrl: url,
        name: profile.name,
        from: nameOf(e.from as string, profile.id),
        title: String(e.title),
        day: day(e.date),
        reason: (e.note as string) ?? null,
      });
    } else if (event.kind === "leave") {
      const range =
        e.start_date === e.end_date
          ? `on ${day(e.start_date)}`
          : `from ${day(e.start_date)} to ${day(e.end_date)}`;
      email = leaveAdded({
        appUrl: url,
        name: profile.name,
        who: nameOf(e.user_id as string, profile.id),
        state: LEAVE_STATE[e.type as keyof typeof LEAVE_STATE] ?? "on leave",
        range,
        note: (e.note as string) ?? null,
      });
    } else if (event.kind === "new_task") {
      email = newTask({
        appUrl: url,
        name: profile.name,
        from: nameOf(e.from as string, profile.id),
        title: String(e.title),
        forBoth: Boolean(e.for_both),
        when: e.date ? whenLabel(String(e.date), (e.time as string) ?? null, today) : null,
      });
    }
    if (!email) continue;
    try {
      await send(profile.email, email);
      result.sent++;
    } catch (err) {
      const message = (err as Error).message;
      await db.from("notification_outbox").update({ error: message }).eq("id", event.id);
      result.errors.push(`${event.kind} ${event.id}: ${message}`);
    }
  }

  return result;
}

/** What one person has on `day`, for the morning email. */
async function digestFor(
  db: SupabaseClient,
  userId: string,
  day: DateStr,
  reminders: Reminder[],
  acked: Set<string>,
) {
  const [occurrences, tasks, shopping] = await Promise.all([
    db
      .from("chore_occurrences")
      .select("due_time, assignee_id, chore:chores!inner(title, flex_target)")
      .eq("date", day)
      .eq("status", "pending")
      .or(`assignee_id.eq.${userId},assignee_id.is.null`)
      .is("chore.flex_target", null)
      .order("due_time", { nullsFirst: false }),
    db
      .from("tasks")
      .select("*")
      .eq("status", "open")
      .or(`date.lte.${day},end_date.gte.${day}`)
      .order("time", { nullsFirst: false }),
    db.from("shopping_items").select("*").eq("status", "needed").eq("urgency", "today"),
  ]);

  type Occ = { due_time: string | null; assignee_id: string | null; chore: { title: string } };
  const chores: Line[] = check<Occ[]>(occurrences, "chores").map((o) => ({
    title: o.chore.title,
    detail:
      [formatTime(o.due_time), o.assignee_id ? null : "together"].filter(Boolean).join(" · ") ||
      null,
  }));

  const mine = (t: Task) =>
    t.visibility === "personal"
      ? t.owner_id === userId
      : t.assignee_id === null || t.assignee_id === userId;
  const allTasks = check<Task[]>(tasks, "tasks").filter(mine);
  const todos: Line[] = allTasks
    .filter((t) => t.kind === "todo" && t.date !== null && t.date <= day)
    .map((t) => ({
      title: t.title,
      detail: t.date! < day ? "overdue" : formatTime(t.time),
    }));
  const plans: Line[] = allTasks
    .filter((t) => t.kind === "plan" && t.date! <= day && (t.end_date ?? t.date)! >= day)
    .map((t) => ({ title: t.title, detail: t.date === day ? formatTime(t.time) : null }));

  const reminderLines: Line[] = reminders
    .filter((r) => r.visibility === "couple" || r.owner_id === userId)
    .flatMap((r) => {
      const hit = reminderOnDay(r, day);
      if (!hit || acked.has(`${r.id}|${hit.date}`)) return [];
      const years =
        r.type === "birthday" || r.type === "anniversary"
          ? yearsSince(r.start_date, hit.date)
          : null;
      const age =
        years && years > 0 ? (r.type === "birthday" ? `turns ${years}` : `${years} years`) : null;
      const when =
        hit.inDays === 0
          ? formatTime(r.time)
          : `in ${hit.inDays} day${hit.inDays === 1 ? "" : "s"}, ${formatDay(hit.date, "EEE d MMM")}`;
      return [{ title: r.title, detail: [when, age].filter(Boolean).join(" · ") || null }];
    });

  const toBuy: Line[] = check<ShoppingItem[]>(shopping, "shopping").map((i) => ({
    title: i.name,
    detail: formatQty(i.qty, i.unit),
  }));

  return { chores, todos, plans, reminders: reminderLines, shopping: toBuy };
}
