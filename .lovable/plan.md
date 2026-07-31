## Goal

A moderate (level 3) improvement pass across the whole Scripture reading app — visual polish, richer features, more reliable sync, and accessibility/performance fixes — without changing the app's calm, reverent character.

## Confirmed issues found while exploring

- `src/pages/Progress.tsx` exists but has no route in `src/App.tsx`, so it is unreachable dead code.
- `src/hooks/usePushNotifications.ts` registers `/sw.js`, but `public/` contains no service worker (only placeholder/icon/robots files), so registration fails silently. It also has an empty `VAPID_PUBLIC_KEY` and only ever fires `setTimeout` notifications, which die when the tab closes.
- Notification permission state is tracked in two places (`useSettings.notificationPermission` and `usePushNotifications.permission`) and can disagree.
- `useCloudProgress` merges cloud and local progress as a union with `Math.max` on counters, so a stale local device can inflate streak/total values.

## 1. Visual polish & design system

- Audit `src/index.css` tokens and extend them: refine light/dark surface layers, add a soft elevation shadow scale and one subtle gradient token for hero/progress surfaces, tighten radii and spacing rhythm.
- Sweep components for hardcoded color utilities and replace with semantic tokens.
- Upgrade key surfaces: `TodayProgress` hero (larger ring, clearer numerals), `ReadingCard` (calmer completed state, better track-color accents), `StatsCard`, `CalendarView` (clearer heat/intensity legend), `BottomNav` (active indicator).
- Unify motion: consistent fade/slide durations and easing, and respect `prefers-reduced-motion`.

## 2. Feature depth

- Route the existing `Progress` page (`/progress`) and link it from the bottom nav, or fold its content into `History` — whichever reads better once wired up.
- Per-list detail: tapping a track in `Lists` shows its cycle position, chapters remaining in the current cycle, and completion history.
- History filters: filter by track and by time range, plus a compact summary strip (best streak, completion rate, chapters this month).
- Milestones: show upcoming milestones with progress bars, not just achieved ones.
- Empty and loading states for every page (skeletons instead of blank screens).

## 3. Reliability & sync

- Rework `useCloudProgress` merge: reconcile on the readings set only, then recompute streak/total from that set instead of `Math.max` on stored counters, so numbers stay truthful across devices.
- Add explicit sync states (idle / syncing / offline / error) to `SyncIndicator`, with a retry action and a "last synced" timestamp.
- Queue writes while offline and flush on reconnect; guard all Supabase calls with user-visible error toasts rather than console-only logging.
- Consolidate notification permission into a single source of truth and make `usePushNotifications` degrade gracefully when no service worker is present, instead of silently failing. No new push backend in this pass.

## 4. Accessibility & performance

- Add `aria-label` to icon-only buttons, ensure a single `<main>` per page, fix heading order, add visible focus rings.
- Ensure tap targets are at least 44×44 on nav and toggle controls; swap `h-screen` for `h-dvh`.
- Add `aria-live` announcements when a chapter is marked complete and when sync state changes.
- Memoize heavy derived data (calendar grid, cycle stats) and lazy-load route components in `App.tsx` with a lightweight suspense fallback.
- Set a real app-specific `<title>` and meta description in `index.html` if they are still template defaults.

## Out of scope

No schema changes, no new backend services, no push-notification infrastructure, no new third-party dependencies beyond what is already installed.
