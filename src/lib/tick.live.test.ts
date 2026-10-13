// Runs the real tick against the real database with a fake mailer.
// Skipped unless LIVE_DB=1; uses dates in 2030 and removes everything it adds:
//   LIVE_DB=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run src/lib/tick.live.test.ts
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Email } from "./email-templates";
import { runTick } from "./tick";

const live = process.env.LIVE_DB === "1";
const at = (iso: string) => Date.parse(iso);

describe.skipIf(!live)("tick (live database)", () => {
  // Created lazily: the file is still collected (and skipped) without the env.
  const db = live
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    : (null as never);
  const started = new Date().toISOString();
  let people: { id: string; name: string }[] = [];
  let choreId = "";
  let taskId = "";
  let maxLogId = 0;
  const sent: { to: string; email: Email }[] = [];
  const send = async (to: string, email: Email) => void sent.push({ to, email });
  const take = () => sent.splice(0);
  const channels = { send, push: async () => 0, emailReady: true, pushReady: false };

  beforeAll(async () => {
    const { data: profiles } = await db.from("profiles").select("id, name").order("created_at");
    people = profiles!;
    const { data: last } = await db
      .from("notification_log")
      .select("id")
      .order("id", { ascending: false })
      .limit(1);
    maxLogId = last?.[0]?.id ?? 0;
    const chore = await db
      .from("chores")
      .insert({
        title: "__tick_check chore",
        assignment_type: "together",
        freq: "daily",
        start_date: "2030-01-07",
        due_time: "10:00",
        remind_before_min: 15,
        created_by: people[0].id,
      })
      .select("id")
      .single();
    choreId = chore.data!.id;
  });

  afterAll(async () => {
    if (taskId) await db.from("tasks").delete().eq("id", taskId);
    if (choreId) await db.from("chores").delete().eq("id", choreId);
    // Rows the tick created for real chores in 2030, and our log/outbox rows.
    await db
      .from("chore_occurrences")
      .delete()
      .gte("date", "2030-01-01")
      .gte("created_at", started);
    await db.from("notification_log").delete().gt("id", maxLogId);
    await db.from("notification_outbox").delete().gte("created_at", started);
  });

  it("sends a chore reminder to both of you once, and the new-todo event", async () => {
    const task = await db
      .from("tasks")
      .insert({
        title: "__tick_check todo",
        visibility: "couple",
        owner_id: people[0].id,
        assignee_id: people[1]?.id ?? null,
      })
      .select("id")
      .single();
    taskId = task.data!.id;

    const first = await runTick(db, { ...channels, now: at("2030-01-07T09:45:00+05:30"), send });
    expect(first.errors).toEqual([]);
    const emails = take();
    const reminders = emails.filter((e) => e.email.subject.includes("__tick_check chore"));
    expect(reminders).toHaveLength(people.length);
    expect(reminders[0].email.subject).toContain("Today at 10:00 AM");
    if (people[1]) {
      const todo = emails.filter((e) => e.email.subject.includes("__tick_check todo"));
      expect(todo).toHaveLength(1);
    }
  });

  it("sends nothing on a repeated tick", async () => {
    await runTick(db, { ...channels, now: at("2030-01-07T09:45:00+05:30"), send });
    await runTick(db, { ...channels, now: at("2030-01-07T10:00:00+05:30"), send });
    expect(take().filter((e) => e.email.subject.includes("__tick_check"))).toEqual([]);
  });

  it("doesn't remind outside the window", async () => {
    await runTick(db, { ...channels, now: at("2030-01-08T09:15:00+05:30"), send });
    expect(take().filter((e) => e.email.subject.includes("__tick_check"))).toEqual([]);
  });

  it("sends each person a morning digest with the chore, once", async () => {
    await runTick(db, { ...channels, now: at("2030-01-09T07:00:00+05:30"), send });
    const digests = take().filter((e) => e.email.subject.startsWith("☀️"));
    expect(digests).toHaveLength(people.length);
    expect(digests[0].email.text).toContain("__tick_check chore");
    await runTick(db, { ...channels, now: at("2030-01-09T07:15:00+05:30"), send });
    expect(take().filter((e) => e.email.subject.startsWith("☀️"))).toEqual([]);
  });

  it("sends the monthly summary once on the 1st", async () => {
    await runTick(db, { ...channels, now: at("2030-02-01T08:00:00+05:30"), send });
    const monthly = take().filter((e) => e.email.subject.startsWith("🏆 January 2030"));
    expect(monthly).toHaveLength(people.length);
    await runTick(db, { ...channels, now: at("2030-02-01T12:00:00+05:30"), send });
    expect(take().filter((e) => e.email.subject.startsWith("🏆"))).toEqual([]);
  });

  it("sends by push alone when email isn't set up, once", async () => {
    const pushed: { userId: string; title: string }[] = [];
    const pushOnly = {
      send: async () => {
        throw new Error("email should not be used");
      },
      push: async (_db: unknown, userId: string, m: { title: string }) => {
        pushed.push({ userId, title: m.title });
        return 1;
      },
      emailReady: false,
      pushReady: true,
    };
    await runTick(db, { ...pushOnly, now: at("2030-01-10T09:45:00+05:30") });
    await runTick(db, { ...pushOnly, now: at("2030-01-10T10:00:00+05:30") });
    const reminders = pushed.filter((p) => p.title.includes("__tick_check chore"));
    expect(reminders).toHaveLength(people.length);
  });
});
