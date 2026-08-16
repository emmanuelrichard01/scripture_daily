<div align="center">
  <img src="public/apple-touch-icon.png" alt="Scripture Daily Logo" width="96" />

  # Scripture Daily

  **A production-grade, offline-first Progressive Web Application (PWA) built for Professor Grant Horner’s 10-list Bible reading system.**

  [![CI Status](https://github.com/emmanuelrichard01/scripture_daily/actions/workflows/ci.yml/badge.svg)](https://github.com/emmanuelrichard01/scripture_daily/actions/workflows/ci.yml)
  ![React 18](https://img.shields.io/badge/React-18.3-149ECA?logo=react&logoColor=white)
  ![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)
  ![Vite 8](https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite&logoColor=white)
  ![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)
  ![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)
  ![Vitest](https://img.shields.io/badge/Vitest-126%20Tests%20Passed-6E9F18?logo=vitest&logoColor=white)
</div>

---

## 📖 What It Is

Professor Grant Horner’s Bible Reading System divides the Holy Scriptures into ten distinct lists (Gospels, Pentateuch, Epistles, Psalms, Proverbs, History, Prophets, Acts, etc.). Every day, you read exactly one chapter from each of the ten lists.

Because the lists vary in length from **28 chapters** (Acts) to **250 chapters** (Prophets), the particular combination of ten chapters you read on any given day will **never repeat for several years**. The cross-canonical interplay creates extraordinary synthesis between historical, poetic, prophetic, and apostolic texts.

**Scripture Daily** provides a focused, offline-first, beautifully crafted companion for this reading journey.

---

## 📐 The Core Architectural Principle: Position, Not Date

Most Bible reading plans index readings by the calendar date (e.g. *"January 15th"*). If you miss four days, you fall behind, face a demoralizing backlog, and eventually give up.

Horner’s reading philosophy is clear: **Never try to catch up; simply pick up where you stopped.**

In Scripture Daily, a list’s current bookmark is a **pure function of how many chapters you have completed in that list**, completely independent of the calendar:

$$\text{Position in Cycle} = (\text{Chapters Completed} \bmod \text{Total List Chapters}) + 1$$

- **No Backlogs**: If you travel or miss a week, your bookmark in each list stays exactly where you left off.
- **Independent Cycles**: Short lists (like Acts) complete cycles quickly; long lists complete gradually. Cycle completions accumulate over a lifetime.
- **Log Structure**: State is modeled as a normalized dictionary of active reading dates and completed list IDs:

```ts
export type ReadingLog = Readonly<Record<ISODate, readonly number[]>>;
// Example: { "2026-08-15": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }
```

---

## 🌟 Feature Overview

### 1. In-App Scripture Reader
- **7 Built-in Translations**: ESV, NIV, NLT, NASB, LSB, WEB, and KJV. Instant switching from the reader header without leaving the verse.
- **Verse Highlighting**: 4 color palettes (Amber, Sage, Sky, and Rose) with smooth background tints and underline accents.
- **Personal Reflection Notes**: Attach private study notes to any verse, indicated by inline message badges.
- **Smart Reading Timer**: Measures active reading duration, pausing automatically when the screen is locked or the tab is hidden.
- **Typography Controls**: Serif vs. Sans font, font sizes 14px–26px, adjustable line heights, and margin widths.
- **Gestures & Accessibility**: Horizontal swipe between chapters, arrow-key navigation, roving tabindexes, and high-contrast focus rings.

### 2. Today View & Celebrations
- **Daily Scripture Inspiration Card**: Curated, rotating inspirational verses with Fraunces typography, 1-tap clipboard copy, and native Web Share.
- **Particle Confetti Celebration**: Physics-based canvas confetti burst styled in Horner track colors upon completing the 10th daily chapter (respects `reduce-motion`).
- **30-Day Activity Strip**: Visual rolling 30-day activity matrix with hover tooltips and earned **Streak Freeze Shields** (1 shield earned per 7-day streak, capped at 3).
- **Single Tap Mark-As-Read**: Instant toggle on cards with audio-haptic feedback.

### 3. Visualizations & Deep Bible Analytics
- **66-Book Bible Coverage Map (`/bible-map`)**: Interactive heat map across all 1,189 chapters of the Old and New Testaments.
- **Highlights & Notes Manager (`/highlights`)**: Centralized repository to search, filter by book or color, and copy/export personal scripture reflections.
- **Reading Volume Charts (`/history`)**: Weekly/monthly volume charts, completion rates, best streak tracker, and exportable shareable progress card image.
- **Milestones & Achievements (`/milestones`)**: Track upcoming chapter milestones and completed list cycles.

### 4. Community & Friendships (`/community`)
- **Friend Connections**: Search users by username, send friend requests, or invite via unique shareable profile links.
- **Real-Time Standings**: View friends' streaks, total chapters read, and today's reading status with Supabase Realtime subscriptions.
- **Encouragement Nudges**: Send a push encouragement to friends who haven't read in 2+ days (server-side 12-hour cooldown).

### 5. Custom Theming
- **Ivory Light**: Warm, glare-reducing cream background.
- **OLED Dark**: Cool, deep near-black designed to avoid halation.
- **Sepia Parchment**: Gentle linen and warm amber tones for extended reading.
- **Midnight AMOLED**: True `#000000` pitch black with high-contrast elements.
- **System**: Automatically matches OS appearance.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| --- | --- |
| **Frontend Framework** | React 18.3, TypeScript 5.8 (Strict Mode), Vite 8.2 |
| **Styling & Design System** | Tailwind CSS 3.4, Vanilla CSS Custom Properties, Radix UI Primitives, Lucide Icons |
| **State & Data Fetching** | React Context (offline reducer), TanStack Query v5 |
| **PWA & Offline** | Workbox (Vite PWA Plugin), CacheFirst Edge-Caching, Service Worker Precaching |
| **Backend & Cloud** | Supabase (PostgreSQL 15, Row Level Security, Auth, Realtime) |
| **Serverless API** | Vercel Edge & Node Serverless Functions (`/api/bible`, `/api/cron`, `/api/nudge`) |
| **Testing** | Vitest, Testing Library, Playwright (E2E) |

---

## 📂 Project Architecture

```text
scripture-daily/
├── api/                             # Serverless backend functions
│   ├── bible.ts                     # Scripture proxy (Edge runtime, edge-cached)
│   ├── cron.ts                      # Timezone-aware hourly reminder dispatcher (Node)
│   └── nudge.ts                     # Rate-limited encouragement push notifier (Node)
├── src/
│   ├── components/                  # Reusable UI components
│   │   ├── reader/                  # Scripture reader, settings, translation/chapter sheets
│   │   ├── skeletons/               # Zero-layout-shift loading placeholders
│   │   ├── ui/                      # Radix UI primitives (shadcn-compatible)
│   │   ├── Confetti.tsx             # Canvas-based particle celebration engine
│   │   ├── DailyVerse.tsx           # Daily devotional verse inspiration card
│   │   ├── StreakVisualization.tsx  # 30-day activity matrix & freeze shields
│   │   └── BottomNav.tsx            # Navigation bar with prefetching
│   ├── contexts/                    # Application state providers
│   │   ├── AuthProvider.tsx         # Supabase authentication session
│   │   ├── ProgressProvider.tsx     # Local-first reading progress reducer & cloud sync
│   │   └── SettingsProvider.tsx     # Themes, reminders, sound/haptic preferences
│   ├── hooks/                       # Custom hooks (useReadingTimer, usePush, useFeedback)
│   ├── lib/                         # Pure domain logic (100% testable, zero React dependencies)
│   │   ├── bible.ts                 # Translation mappings and HTML sanitization
│   │   ├── community.ts             # Supabase community data layer
│   │   ├── dailyVerses.ts           # Curated inspirational scripture library
│   │   ├── date.ts                  # Pure local-calendar date arithmetic
│   │   ├── friends.ts               # Community display helpers & naming logic
│   │   ├── highlights.ts            # Highlights & notes storage and cloud sync
│   │   ├── progress.ts              # Reading log mutations, streaks, derivations, union merge
│   │   ├── readingPlan.ts           # 10 Horner lists data & cycle calculation engine
│   │   ├── storage.ts               # Safe localStorage wrapper with memory fallback
│   │   └── syncEngine.ts            # Exponential backoff write queue & offline outbox
│   ├── pages/                       # Top-level view routes
│   │   ├── Today.tsx                # Daily dashboard & 10 reading cards
│   │   ├── Lists.tsx                # All lists & chapter grid overview
│   │   ├── Progress.tsx             # Aggregate progress & Bible Map launcher
│   │   ├── BibleMap.tsx             # 66-Book Bible coverage matrix
│   │   ├── Highlights.tsx           # Highlights & notes annotation manager
│   │   ├── History.tsx              # Volume charts, streaks, and share cards
│   │   ├── Milestones.tsx           # Life milestones & cycle achievements
│   │   ├── Community.tsx            # Friends, requests, and leaderboard
│   │   └── Settings.tsx             # Themes, notifications, and data backup/restore
│   └── test/                        # Vitest environment setup and mocks
└── supabase/
    ├── full_schema.sql              # Complete, idempotent database schema & RLS policies
    └── migrations/                  # Incremental SQL migration scripts
```

---

## ⚡ Getting Started

### Prerequisites
- Node.js >= 20
- npm >= 10
- Free [Supabase](https://supabase.com) project

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/emmanuelrichard01/scripture_daily.git
cd scripture_daily
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Fill in your project credentials:
```env
# Client (Exposed to browser)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key

# Server (Vercel deployment only)
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@example.com
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=your-random-cron-secret
```

> **Generating Web Push VAPID Keys**:
> ```bash
> npx web-push generate-vapid-keys
> ```

### 3. Initialize Database Schema
Run `supabase/full_schema.sql` directly in your **Supabase SQL Editor**, or use the Supabase CLI:
```bash
supabase db push
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 🧪 Testing & Verification

```bash
# Run complete verification pipeline (Typecheck + Lint + Unit Tests)
npm run verify

# Run Vitest test suite
npm test

# Run TypeScript type check
npm run typecheck

# Run ESLint fix
npm run lint:fix

# Run Production Build
npm run build
```

---

## 🚀 Production Deployment

### Deploy to Vercel
1. Import the repository into your **Vercel Dashboard**.
2. Configure the environment variables from `.env.example` in **Project Settings → Environment Variables**.
3. Deploy!

### Automated Hourly Push Reminders
The reminder cron runs via `.github/workflows/reminders.yml` every hour at minute 0 (`0 * * * *`) to deliver notifications at each user's exact local time.

Configure GitHub Repository Secrets (**Settings → Secrets and variables → Actions**):
- `PRODUCTION_URL`: `https://your-production-domain.com`
- `CRON_SECRET`: Matches the `CRON_SECRET` variable set in Vercel.

---

## 🔒 Security & Data Privacy

- **Row Level Security (RLS)**: Enforced on all tables (`profiles`, `highlights`, `reading_progress`, `user_settings`, `friendships`, `nudges`, `push_subscriptions`). Users can only mutate their own records.
- **Sanitized Scripture Text**: In-app Bible texts from external APIs are parsed and sanitized through an allowlisted HTML transformer before rendering.
- **Client Offline Resilience**: Local storage operations are wrapped in memory fallbacks and error boundaries, preventing white-screens during storage quota or private browsing exceptions.

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for details.
