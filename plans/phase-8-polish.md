# Phase 8: Polish (optional)

Pick what you want. Each item is independent.

## 1. Web push notifications (free)
- Dependency: `web-push`. VAPID keys go in the env. The `push_subscriptions` table holds
  (user_id, endpoint, keys).
- Subscribe from settings. The service worker shows the notification.
- `notify()` channels: email, push, or both, set per user in settings.
- iOS needs the PWA installed to the home screen (iOS 16.4 or later).

## 2. Realtime sync
- Supabase Realtime on `chore_occurrences`, `tasks`, `shopping_items`, and
  `points_ledger` triggers `router.refresh()`, so the partner's changes show instantly.
  This is useful while shopping together.

## 3. Stats
- `/points` → Stats tab: completions per person per month, covers count, top chores, and
  a streak (days with all your chores done). Make the charts with simple SVG or Recharts.

## 4. UX
- Dark mode (next-themes), haptic feedback, swipe actions on cards, and empty-state
  illustrations.
- Templates: one-click starter chores (Laundry rotating weekly, Cooking, Waste out on
  Tue/Fri, Bed cleaning fixed).
- Search across tasks, reminders, and shopping.

## 5. Ops
- Nightly Supabase backup: a GitHub Action runs `pg_dump` with free Actions minutes and
  stores the dump as a private artifact or in a private repo.
- Basic error logging to the console only, with Vercel logs.

## Done when
Each chosen item works on both phones and nothing regresses (`npm test`, Playwright
smoke).
