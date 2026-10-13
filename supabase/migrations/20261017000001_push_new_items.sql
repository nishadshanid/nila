-- New shared items (todos, plans, chores, reminders, shopping) now go to the partner's
-- phone straight away from the app (src/lib/notify-partner.ts), phone only. The old
-- trigger queued an email for new todos 15 minutes later, so it goes.
drop trigger if exists tasks_outbox on public.tasks;
drop function if exists public.outbox_new_task();
