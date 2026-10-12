# Phase 7: Email Reminders, Timers, and PWA

## Goal
Reminders arrive by Gmail at the right time, with a daily digest and a monthly points
summary. Each item has a timer, and the app installs to the home screen.

## Email
- Dependency: `nodemailer`. `src/lib/email.ts` uses `createTransport({ host:
  'smtp.gmail.com', port: 465, secure: true, auth: { user: GMAIL_USER, pass:
  GMAIL_APP_PASSWORD } })`.
- Templates in `src/emails/*.ts` are simple inline-styled HTML + text functions:
  `itemReminder`, `dailyDigest`, `reassigned`, `newCoupleTask`, `monthlySummary`.
- Respect `profiles.email_notifications`.

## Dedupe: `0007_notifications.sql`
```sql
create table notification_log (
  id bigint generated always as identity primary key,
  kind text not null,          -- item_reminder/digest/reassigned/new_task/monthly
  entity_type text, entity_id uuid,
  occurrence_key text not null, -- e.g. date or 'YYYY-MM'
  user_id uuid not null references profiles,
  sent_at timestamptz default now(),
  unique (kind, entity_id, occurrence_key, user_id)
);
```
Insert the log row **first** (`on conflict do nothing returning id`). Send only when a
row was inserted, so repeated ticks never send duplicates.

## Cron: `src/app/api/cron/tick/route.ts`
Requires the `Authorization: Bearer ${CRON_SECRET}` header and uses the admin client.
1. `materialize({days: 14})`.
2. Item reminders: chores, tasks, and reminders whose
   `due_time − remind_before_min ∈ (now−15min, now]` (IST) send `itemReminder` to the
   assignee, or to both for together items.
3. Digest: for each user whose `digest_time ∈ (now−15min, now]`, send today's chores,
   todos, reminders, and urgent shopping.
4. Monthly: if today is the 1st and the time is ≥ 08:00, send `monthlySummary` for the
   previous month (key = 'YYYY-MM').
5. Process the event queue: replace the Phase 2, 3, and 5 `notify()` stubs with inserts
   into a small `outbox` table (kind, payload, sent_at), drained here.

Schedule it from Supabase (`0008_cron.sql`, with the secrets stored in Supabase Vault):
```sql
create extension if not exists pg_cron; create extension if not exists pg_net;
select cron.schedule('nila-tick', '*/15 * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='app_url') || '/api/cron/tick',
    headers := jsonb_build_object('Authorization','Bearer ' ||
      (select decrypted_secret from vault.decrypted_secrets where name='cron_secret')))
$$);
```
This also keeps the free Supabase project from pausing.

## Timers
- Each chore and task already has `due_time`/`due_at`, `duration_min`, and
  `remind_before_min`. Make sure all forms expose them, with presets (0, 10, 15, 30, 60
  min, 1 day).
- On cards: a "Starts in 25 min" countdown, and a **Start** button that runs an in-app
  timer for `duration_min`, kept in localStorage so it survives a reload, with a
  vibration and sound at the end. When the timer ends it offers "Mark done?".

## PWA
- `public/manifest.webmanifest` (name Nila, icons 192/512/maskable, `display: standalone`,
  theme color), `src/app/manifest.ts` or a link tag, and Apple touch icons.
- `public/sw.js`: cache the app shell and offline fallback page (network-first for data).
- An "Install app" prompt in settings (`beforeinstallprompt` on Android, plus
  instructions for iOS).

## Env (Vercel)
`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `CRON_SECRET`, `APP_URL`

## Tests
- Window logic: an item due at 10:00 with a 15-minute reminder fires on the 09:45 tick
  only.
- Dedupe: running the tick twice sends one email (mock the transport).
- Monthly is sent once on the 1st.

## Done when
- [ ] `curl -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/tick` sends due
      emails, and a second run sends none.
- [ ] A chore due in 20 min with a 15-min reminder gives exactly one email.
- [ ] The digest arrives at 07:00 IST, and the monthly summary arrives on the 1st.
- [ ] Reassignment from leave or split emails the partner.
- [ ] The app installs on Android and iOS and opens standalone.
