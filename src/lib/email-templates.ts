// Plain, inline-styled emails: they read well in Gmail on a phone and degrade to text.

export type Email = { subject: string; text: string; html: string };

export type Line = { title: string; detail?: string | null };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(appUrl: string | null, heading: string, body: string) {
  const button = appUrl
    ? `<p style="margin:24px 0 0"><a href="${esc(appUrl)}" style="background:#18181b;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Open Nila</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
<div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e4e4e7">
<h1 style="margin:0 0 16px;font-size:20px">${esc(heading)}</h1>
${body}${button}
</div>
<p style="color:#71717a;font-size:12px;margin:12px 4px 0">From Nila. Turn off emails in Settings.</p>
</div></body></html>`;
}

const p = (text: string) => `<p style="margin:0 0 12px;line-height:1.5">${esc(text)}</p>`;

function list(lines: Line[]) {
  return `<ul style="margin:0 0 16px;padding-left:20px;line-height:1.6">${lines
    .map(
      (l) =>
        `<li>${esc(l.title)}${l.detail ? ` <span style="color:#71717a">· ${esc(l.detail)}</span>` : ""}</li>`,
    )
    .join("")}</ul>`;
}

const textList = (lines: Line[]) =>
  lines.map((l) => `- ${l.title}${l.detail ? ` · ${l.detail}` : ""}`).join("\n");

const footer = (appUrl: string | null) => (appUrl ? `\n\nOpen Nila: ${appUrl}` : "");

/** "Laundry at 10:00 AM" (a chore, todo, plan or reminder coming up). */
export function itemReminder(o: {
  appUrl: string | null;
  name: string;
  title: string;
  /** "Chore", "Todo", "Plan" or "Reminder". */
  kind: string;
  /** "Today at 10:00 AM" */
  when: string;
  note?: string | null;
}): Email {
  const subject = `⏰ ${o.title} · ${o.when}`;
  const lines = [`Hi ${o.name},`, `${o.kind}: ${o.title}`, o.when, o.note ?? ""].filter(Boolean);
  return {
    subject,
    text: lines.join("\n") + footer(o.appUrl),
    html: layout(o.appUrl, o.title, p(`${o.kind} · ${o.when}`) + (o.note ? p(o.note) : "")),
  };
}

export type DigestSections = {
  chores: Line[];
  todos: Line[];
  plans: Line[];
  reminders: Line[];
  shopping: Line[];
};

/** The morning summary of the day. */
export function dailyDigest(o: {
  appUrl: string | null;
  name: string;
  /** "Wednesday, 14 October" */
  day: string;
  sections: DigestSections;
}): Email {
  const parts: [string, Line[]][] = [
    ["Reminders", o.sections.reminders],
    ["Plans", o.sections.plans],
    ["Your chores", o.sections.chores],
    ["Todos", o.sections.todos],
    ["Buy today", o.sections.shopping],
  ];
  const filled = parts.filter(([, lines]) => lines.length > 0);
  const count = filled.reduce((n, [, lines]) => n + lines.length, 0);
  return {
    subject: `☀️ Your day: ${count} thing${count === 1 ? "" : "s"} · ${o.day}`,
    text:
      `Good morning ${o.name}! Here's ${o.day}.\n\n` +
      filled.map(([h, lines]) => `${h}\n${textList(lines)}`).join("\n\n") +
      footer(o.appUrl),
    html: layout(
      o.appUrl,
      `Good morning, ${o.name}`,
      p(`Here's ${o.day}.`) +
        filled
          .map(
            ([h, lines]) =>
              `<h2 style="font-size:14px;margin:16px 0 6px;color:#3f3f46">${esc(h)}</h2>${list(lines)}`,
          )
          .join(""),
    ),
  };
}

/** Your partner handed you a chore for a day. */
export function handover(o: {
  appUrl: string | null;
  name: string;
  from: string;
  title: string;
  day: string;
  reason: string | null;
}): Email {
  const why = o.reason ? ` (${o.reason})` : "";
  const line = `${o.from} can't do "${o.title}" on ${o.day}${why}, so it's with you now.`;
  return {
    subject: `🤝 ${o.from} handed you ${o.title}`,
    text: `Hi ${o.name},\n\n${line}${footer(o.appUrl)}`,
    html: layout(o.appUrl, `${o.from} handed you a chore`, p(line)),
  };
}

/** Your partner will be away; you'll cover the shared chores. */
export function leaveAdded(o: {
  appUrl: string | null;
  name: string;
  who: string;
  /** "away", "sick" or "on leave" */
  state: string;
  range: string;
  note: string | null;
}): Email {
  const line = `${o.who} is ${o.state} ${o.range}. Shared chores move to you for those days; their own chores are paused.`;
  return {
    subject: `📅 ${o.who} is ${o.state} ${o.range}`,
    text: `Hi ${o.name},\n\n${line}${o.note ? `\n\nNote: ${o.note}` : ""}${footer(o.appUrl)}`,
    html: layout(
      o.appUrl,
      `${o.who} is ${o.state}`,
      p(line) + (o.note ? p(`Note: ${o.note}`) : ""),
    ),
  };
}

/** Your partner added a couple todo for you (or both of you). */
export function newTask(o: {
  appUrl: string | null;
  name: string;
  from: string;
  title: string;
  forBoth: boolean;
  when: string | null;
}): Email {
  const line = `${o.from} added "${o.title}" ${o.forBoth ? "for both of you" : "for you"}${o.when ? `, due ${o.when}` : ""}.`;
  return {
    subject: `📝 New todo from ${o.from}: ${o.title}`,
    text: `Hi ${o.name},\n\n${line}${footer(o.appUrl)}`,
    html: layout(o.appUrl, "A new todo", p(line)),
  };
}

/** Last month's points. */
export function monthlySummary(o: {
  appUrl: string | null;
  name: string;
  /** "October 2026" */
  month: string;
  scores: { name: string; total: number }[];
  /** "You", a name, or null for a tie. */
  winner: string | null;
  reward: string | null;
}): Email {
  const result =
    o.winner === null ? "It was a tie!" : o.winner === "You" ? "You won! 🎉" : `${o.winner} won!`;
  const lines = o.scores.map((s) => ({ title: s.name, detail: `${s.total} points` }));
  const reward = o.reward ? `Reward: ${o.reward}` : null;
  return {
    subject: `🏆 ${o.month}: ${result}`,
    text:
      `Hi ${o.name},\n\n${o.month} is done. ${result}\n\n${textList(lines)}` +
      (reward ? `\n\n${reward}` : "") +
      `\n\nScores start fresh this month.${footer(o.appUrl)}`,
    html: layout(
      o.appUrl,
      `${o.month}: ${result}`,
      list(lines) + (reward ? p(reward) : "") + p("Scores start fresh this month."),
    ),
  };
}
