# Nila

A private shared space for the two of us: chores (fixed and rotating), leave hand-over,
todos and plans, reminders, shopping, points, a calendar, and email reminders.
The plans for each phase are in [`plans/`](plans/00-overview.md).

Stack: Next.js 16 · Supabase (Postgres, Auth, RLS) · Vercel · Tailwind + shadcn/ui.
Everything runs on free tiers. Times are in Asia/Kolkata, and weeks start on Monday.

## First-time setup

### 1. Supabase
1. In the dashboard for project `zwauhiijhdyldwvoeiqr`, go to **Authentication → Sign In /
   Providers**. Keep **Email** enabled and turn **off** "Allow new users to sign up".
2. Go to **Authentication → Users → Add user → Create new user** and create both accounts
   (email + password, tick "Auto confirm user"). Do this after step 3, or the migration
   backfills their profiles anyway.
3. Apply the database migrations from this repo:
   ```bash
   npx supabase login
   npx supabase link --project-ref zwauhiijhdyldwvoeiqr
   npm run db:push
   ```
4. In **Authentication → URL Configuration**, set the Site URL to your Vercel URL once it
   exists.

### 2. Local env
```bash
cp .env.example .env.local   # then fill in the keys from Project Settings → API
npm install
npm run dev                  # http://localhost:3000
```

### 3. Vercel
Import the GitHub repo in Vercel and add the same three variables from `.env.local`
under **Settings → Environment Variables**, then deploy.

## Scripts
| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | Unit tests (Vitest) |
| `npm run db:push` | Apply `supabase/migrations` to the linked project |
| `npm run db:types` | Generate `src/lib/database.types.ts` from the database |
