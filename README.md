<div align="center">
  <img src="public/apple-touch-icon.png" alt="" width="96" />

  # Scripture Daily

  **An offline-first PWA for Professor Grant Horner's 10-list Bible reading system.**

  [![CI](https://github.com/emmanuelrichard01/scripture_daily/actions/workflows/ci.yml/badge.svg)](https://github.com/emmanuelrichard01/scripture_daily/actions/workflows/ci.yml)
  ![React 18](https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white)
  ![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
  ![Vite 8](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
</div>

---

## What it is

Horner's system splits Scripture into ten lists and has you read one chapter from
each, every day. Because the lists run from 28 to 250 chapters, the daily
combination of ten chapters doesn't repeat for years.

This app tracks that. It works fully offline, syncs across devices when you sign
in, and reads chapters in-app without sending you elsewhere.

## The core idea: position, not date

The one design decision everything else follows from — **a list's bookmark is a
pure function of how many chapters you've completed in it**, never of the
calendar:

```
position in cycle = (chapters completed mod list length) + 1
```

Miss a week and you resume exactly where you stopped, because nothing is indexed
by date. Horner's own instruction is *"never try to catch up"*; this encodes it
rather than merely suggesting it. Finishing a list wraps the bookmark to chapter 1
and increments a cycle counter — cycles accumulate, they never reset.

Progress is stored as a log of which lists were completed on which local day:

```ts
type ReadingLog = Record<ISODate, number[]>;
// { "2026-08-12": [1, 2, 5] }  ← lists 1, 2 and 5 read on Aug 12
```

Everything else — streaks, per-list positions, the heatmap, cycle counts — is
derived from that one structure. See `src/lib/progress.ts` and
`src/lib/readingPlan.ts`; both are pure and unit-tested.

## Features

- **Offline-first.** Progress writes to `localStorage` synchronously; the UI never
  waits on the network. Chapters you've read are cached by the service worker and
  stay readable with no connection.
- **Durable sync.** A write scheduler coalesces rapid edits into one request,
  retries with exponential backoff, holds writes while offline, and flushes when
  the page is hidden — so closing the tab mid-session doesn't strand a write.
- **Union merge.** Sign in on a second device and histories are unioned, never
  overwritten. A recorded reading is a fact the user asserted; losing one is worse
  than keeping one they later unchecked.
- **In-app reader.** Seven translations, adjustable type, cached per chapter.
- **Community.** Add friends, see their streak and chapter count. Guarded by RLS.
- **Reminders.** Web Push, dispatched at the right *local* hour per device.

## Stack

React 18 · TypeScript (strict) · Vite 8 · Tailwind · Radix / shadcn ·
TanStack Query · Supabase (Postgres + RLS + Auth) · Vercel

## Getting started

```bash
git clone https://github.com/emmanuelrichard01/scripture_daily.git
cd scripture_daily
npm install
cp .env.example .env      # then fill in your Supabase values
npm run dev               # http://localhost:8080
```

Apply the database schema with the Supabase CLI:

```bash
supabase db push
```

### Environment

Client values (`VITE_*`) are embedded in the bundle and must be publishable.
Everything else is server-only and belongs in your hosting platform's environment
settings — never in the repo. See `.env.example`.

| Variable | Scope | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | client | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client | Anon key (safe to expose; RLS enforces access) |
| `VITE_VAPID_PUBLIC_KEY` | client | Web Push public key |
| `VAPID_PRIVATE_KEY` | server | Web Push private key |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Bypasses RLS — reminder cron only |
| `CRON_SECRET` | server | Shared secret authorising the cron endpoint |

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server on :8080 |
| `npm run build` | Typecheck, then production build |
| `npm run typecheck` | `tsc -b` across app, config and API |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright |
| `npm run verify` | Typecheck + lint + unit tests |

## Layout

```text
api/                    Vercel serverless functions
  bible.ts                Scripture proxy — edge-cached, provider-agnostic
  cron.ts                 Hourly reminder dispatch, timezone-aware
src/
  lib/                    Pure domain logic. No React, no I/O — all unit-tested.
    date.ts                 Local-day arithmetic (the timezone boundary)
    readingPlan.ts          Plan data + cycle engine
    progress.ts             Reading log: mutations, derivations, merge
    syncEngine.ts           Debounced, retrying, offline-tolerant writes
    bible.ts                Fetch + HTML sanitisation
    storage.ts              Guarded localStorage
  contexts/               Providers; state only, logic delegated to lib/
  hooks/                  Context accessors and small behaviours
  components/             UI, with ui/ holding the Radix primitives
  pages/                  Route components
supabase/migrations/    Schema, RLS policies, storage buckets
```

### Where the boundaries are

- **`src/lib` never imports React.** Domain rules stay testable without a DOM.
- **Dates are local, always.** `new Date("2026-08-12")` parses as *UTC* and
  `toISOString()` emits *UTC* — either one silently shifts a day for most of the
  world. All date handling goes through `src/lib/date.ts`; nothing else should
  construct a date from a string.
- **Third-party HTML is sanitised at the injection point.** `sanitizeVerseHtml`
  rebuilds verse markup from an allowlist before it reaches
  `dangerouslySetInnerHTML`.

## Deployment

Vercel, configured by `vercel.json`: SPA fallback, hourly cron, security headers
(CSP, HSTS, frame-deny), and immutable caching for hashed assets. Set the
environment variables above in the project settings before the first deploy.

## Contributing

1. Branch from `main`.
2. Keep `npm run verify` green.
3. Conventional commits (`feat:`, `fix:`, `chore:`).

## License

MIT.
