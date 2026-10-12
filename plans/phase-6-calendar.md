# Phase 6: Calendar

## Goal
One calendar showing each day's plans: chores, tasks, plans, reminders, and leaves for
both partners, with filters.

## Dependencies
`@fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/list @fullcalendar/interaction`
(all MIT).

## Data
`src/lib/calendar.ts` → `getCalendarEvents(from, to)` (server). It merges these sources
into one `CalEvent { id, source, title, start, end?, allDay, personId|null, priority,
status, color, href }`:
- chore_occurrences in the range. For dates beyond the 14-day materialized window,
  compute virtual occurrences with `recurrence.ts` + `rotation.ts` + the leave rules,
  shown read-only and labeled "projected".
- tasks with due_at or start_at in the range (RLS already hides the partner's personal
  ones).
- reminders expanded with `reminderOccurrences`.
- leaves as background events in the person's color.

Fetch through a route handler `/api/calendar?from&to` used by FullCalendar's
`events` function.

## UI: `/calendar`
- Views: Month (default on desktop), Week, and List-day (default on mobile).
- Filters as chips: **Me** · **Partner** · **Couple/Together**, plus source toggles
  (Chores, Tasks, Plans, Reminders, Leaves). Save them in localStorage.
- Color by person (profile color). Together items get a striped or dual color, and
  priority shows as a left border.
- Clicking an event opens a side sheet with details and actions (Done, Can't do, Edit).
- Clicking an empty day opens quick-create (task, plan, leave, or shopping item for that
  day).
- Week starts Monday, timezone Asia/Kolkata (`firstDay: 1`, `timeZone: 'Asia/Kolkata'`).

## Tests
- The merge function gets correct sources and no duplicates where materialized and
  projected chores overlap.
- Projected rotation matches what the materializer later creates.

## Done when
- [ ] Month view shows a full month of rotating chores, with the correct person on each
      week.
- [ ] A leave shows as a shaded range, and chores in it show the partner.
- [ ] Filters work. Personal items of the partner never appear.
