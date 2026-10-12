# Nila — Overview

A private web app for a couple to organize shared and personal life: chores (fixed or
rotating), leave and sick hand-over, personal and couple todos/plans, recurring
reminders, a shopping list, points, a calendar, and email reminders. **It costs ₹0 to run.**

## Stack (free tiers)
| Layer | Choice |
|---|---|
| App | Next.js 15 (App Router, TypeScript), server actions + route handlers |
| UI | Tailwind CSS, shadcn/ui, lucide-react, FullCalendar (MIT core) |
| DB / Auth | Supabase Free: Postgres, Auth, Row Level Security, pg_cron, pg_net |
| Hosting | Vercel Hobby |
| Email | Nodemailer + Gmail SMTP (app password, port 465) |
| Dates | date-fns + date-fns-tz. **Timezone Asia/Kolkata, week starts Monday** |
| Quality | Zod, Vitest, Playwright |
| Install | PWA (manifest + service worker) |

## Global conventions
- Every user-content row has `owner_id`. Items that can be private also have
  `visibility in ('personal','couple')`.
- RLS: `personal` rows are visible only to the owner, and `couple` rows to both household
  members. Chores, shopping, leaves, and points are always visible to both.
- All date math goes through `src/lib/dates.ts` and uses IST. The DB stores `date` for
  day-level items and `timestamptz` for exact instants.
- Enums are Postgres enums, mirrored in `src/lib/types.ts`.
- Mutations are server actions in `src/app/(app)/<page>/actions.ts`, validated with Zod.
- Each phase adds SQL migrations in `supabase/migrations/NNNN_<name>.sql`.
- Priority: `low | med | high`, shown as colors grey / amber / red.

## Phases
| # | File | Outcome |
|---|---|---|
| 0 | [phase-0-foundation.md](phase-0-foundation.md) | Login, app shell, deployed |
| 1 | [phase-1-chores-rotation.md](phase-1-chores-rotation.md) | Fixed, rotating, and together chores, Today dashboard |
| 2 | [phase-2-leave-split.md](phase-2-leave-split.md) | Leave/sick and "can't do" hand-over |
| 3 | [phase-3-tasks-reminders.md](phase-3-tasks-reminders.md) | Todos, plans, recurring reminders |
| 4 | [phase-4-shopping.md](phase-4-shopping.md) | Shopping and stock list with urgency |
| 5 | [phase-5-points.md](phase-5-points.md) | Point system and monthly scoreboard |
| 6 | [phase-6-calendar.md](phase-6-calendar.md) | Unified calendar |
| 7 | [phase-7-email-timers-pwa.md](phase-7-email-timers-pwa.md) | Email reminders, digest, timers, installable app |
| 8 | [phase-8-polish.md](phase-8-polish.md) | Push, realtime, stats, dark mode |

Each phase ends with a working, deployed app. Run the phases in order.

## One-time accounts (free)
1. Supabase project (save the URL, anon key, and service-role key)
2. Vercel account linked to GitHub
3. GitHub repo
4. Gmail App Password (needs 2-step verification)
