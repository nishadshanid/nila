# Phase 0: Foundation

## Goal
Both partners can log in on phone and laptop and see an empty, styled dashboard shell,
deployed on Vercel.

## Tasks
1. **Scaffold**
   - `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*"`
   - `npx shadcn@latest init`, then add: button, card, input, label, select, dialog,
     sheet, badge, tabs, checkbox, dropdown-menu, form, sonner (toasts), calendar,
     popover, switch, textarea.
   - Dependencies: `@supabase/supabase-js @supabase/ssr zod date-fns date-fns-tz lucide-react`
   - Dev dependencies: `vitest @vitejs/plugin-react prettier prettier-plugin-tailwindcss supabase`
   - Scripts: `dev`, `build`, `lint`, `test`, `db:types`
     (`supabase gen types typescript --project-id $ID > src/lib/database.types.ts`).
2. **Supabase**
   - Create the project (region: Mumbai `ap-south-1`).
   - Auth: enable email/password, **disable sign-ups**, set the Site URL to the Vercel URL.
   - Create the 2 users in the dashboard.
   - Migration `0001_profiles.sql`:
     ```sql
     create table profiles (
       id uuid primary key references auth.users on delete cascade,
       name text not null,
       email text not null,
       color text not null default '#6366f1',
       email_notifications boolean not null default true,
       digest_time time not null default '07:00',
       created_at timestamptz not null default now()
     );
     alter table profiles enable row level security;
     -- only 2 users exist, so any authenticated user is a household member
     create policy "members read" on profiles for select to authenticated using (true);
     create policy "self update" on profiles for update to authenticated using (id = auth.uid());
     -- trigger: insert a profile row on auth.users insert
     ```
   - Helper function `is_member()` returning `auth.role() = 'authenticated'`, used by
     later policies. It's one place to tighten later if needed.
3. **Supabase clients**: `src/lib/supabase/server.ts` (cookies, server components and
   actions), `client.ts` (browser), `admin.ts` (service role, server only, for cron).
4. **Auth**: `src/middleware.ts` refreshes the session and redirects unauthenticated users
   to `/login`. Add `src/app/(auth)/login/page.tsx` (email + password form) and a
   sign-out action.
5. **App shell**: `src/app/(app)/layout.tsx` with a mobile bottom nav (Today, Calendar,
   Tasks, Shopping, More) and a desktop sidebar. Add empty pages: `/`, `/calendar`,
   `/chores`, `/tasks`, `/reminders`, `/shopping`, `/leave`, `/points`, `/settings`.
6. **Helpers**:
   - `src/lib/dates.ts`: `TZ = 'Asia/Kolkata'`, `todayIST()`, `startOfWeekIST(d)`
     (Monday), `toISTDate(ts)`, `monthKey(d)` (YYYY-MM).
   - `src/lib/household.ts`: `getMe()` and `getPartner()` (the other profile).
7. **Settings page**: edit name and color.
8. **Deploy**: push to GitHub, import into Vercel, set the env vars
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY`.
9. `.env.example`, `README.md` (setup steps), `.gitignore`.

## Files
`src/middleware.ts`, `src/lib/supabase/*`, `src/lib/dates.ts`, `src/lib/household.ts`,
`src/app/(auth)/login/*`, `src/app/(app)/layout.tsx`, `src/components/nav/*`,
`supabase/migrations/0001_profiles.sql`

## Done when
- [ ] Both users can log in and out, and unauthenticated users are redirected to /login.
- [ ] The partner's name and color show in the shell.
- [ ] `npm run build`, `npm run lint`, and `npm test` (dates.ts tests) pass.
- [ ] Live on the Vercel URL and usable on a phone.
