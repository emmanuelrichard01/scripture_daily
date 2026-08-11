<div align="center">
  <img src="public/apple-touch-icon.png" alt="Scripture Daily Logo" width="120" />
  
  # Scripture Daily
  
  **A premium, offline-first Progressive Web App (PWA) designed to track Professor Grant Horner’s 10-Chapters-a-Day Bible Reading System.**
  
  [![React](https://img.shields.io/badge/React-18-blue.svg?style=flat-square&logo=react)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/Vite-8.0-purple.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC.svg?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
  [![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E.svg?style=flat-square&logo=supabase)](https://supabase.com/)
</div>

---

## 📖 Overview

**Scripture Daily** is a meticulously crafted application built for serious Bible readers. It digitizes the renowned Grant Horner Bible Reading System—where readers consume 10 chapters a day across 10 distinct biblical lists. 

This project goes far beyond a simple checklist. It features a **"True Horner" V2 architecture** that accurately decouples lists from strict chronological dates, allowing for a completely personalized pace. Whether you read all 10 chapters in a day, or just 1 chapter from List 1, your progress is tracked flawlessly.

## ✨ Premium Features

- **Offline-First Resilience**: Powered by `workbox` and standard PWA service workers. Instantly log progress locally with zero network latency. The UI never blocks on a network request.
- **Intelligent Cloud Sync**: When online, the app debounces and batches your local `localStorage` progress and seamlessly pushes it to Supabase in the background.
- **Versatile Native Bible Reader**: Complete with an elegant sliding drawer and on-the-fly translation switching (supports ESV, NIV, NLT, NASB, LSB, WEB, and KJV directly via the Bolls.life API) so you never have to leave the app to read.
- **Union Merge Conflict Resolution**: Never lose progress. If you use the app as an unauthenticated "Guest" and later sign in, your local progress is intelligently union-merged with your cloud data.
- **Micro-Interactions & Haptics**: Uses Framer Motion for buttery-smooth animations, `embla-carousel-react` for native-feeling swipe gestures, and the Web Audio API for iOS-compatible haptic vibration feedback.
- **Global Settings Context**: A Single Source of Truth architecture ensures that your Theme (Light/Dark/System/Auto), Haptic preferences, and Notification Reminders sync instantly across all your devices.
- **Accessibility (A11y)**: Fully semantic HTML structure, proper ARIA labeling on complex data visualizations (like the History heatmap), and keyboard navigability.
- **Shareable Milestones**: Uses `html2canvas` to dynamically render your reading streaks and milestones into beautiful, shareable image cards.

## 🏗️ The "True Horner" Architecture (V2 Schema)

Traditional apps force the user into a rigid "Day 1, Day 2" calendar structure. This fails when a user misses a day or only finishes half their reading.

**Scripture Daily uses a dynamic `ReadingLog` schema:**
```typescript
export type ReadingLog = Record<string, number[]>;
// Example: { "2026-08-10": [1, 2, 5] }
```
- The keys are the ISO date strings.
- The values are an array of the `listId`s completed on that exact calendar day.
- **List Independence**: By aggregating the total occurrences of `listId = 1` across your entire history, the app mathematically derives exactly what chapter you are currently on for the Gospels list, regardless of when you read them.

When syncing to Supabase, this map is intelligently serialized into a lightweight array of strings (e.g., `["2026-08-10-1", "2026-08-10-2"]`) to maintain high database performance without requiring complex JSONB querying.

## 💻 Tech Stack

- **Frontend Framework**: React 18, TypeScript, Vite v8
- **Styling**: Tailwind CSS, PostCSS, `shadcn/ui` components
- **State Management**: React Context (`ProgressContext`, `SettingsContext`, `AuthContext`)
- **Animation**: Framer Motion
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security)
- **Deployment**: Vercel (Auto-deployments configured)

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/emmanuelrichard01/scripture_daily.git
   cd scripture_daily
   ```

2. Install dependencies (Legacy peer deps required due to Vite 8 / SWC plugin compatibility):
   ```bash
   npm install --legacy-peer-deps
   ```

3. Configure Environment Variables:
   Create a `.env` file in the root and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the Development Server:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:8080`.

## 📂 Project Structure

```text
src/
├── components/       # Reusable UI components (shadcn, Onboarding, Cards)
├── contexts/         # Global state providers (Auth, Progress, Settings)
├── hooks/            # Custom React hooks (useHaptics, useAudio, useMobile)
├── integrations/     # Third-party integrations (Supabase types & client)
├── lib/              # Utility functions, constants, reading plan data
├── pages/            # Top-level routing components (Index, History, Profile)
├── index.css         # Global Tailwind directives and CSS variables
├── App.tsx           # Router and Provider orchestration
└── main.tsx          # Application entry point
```

## 🔒 Authentication & Database Rules

This application uses **Supabase Auth** (Email/Password + OAuth).
- The `reading_progress` and `user_settings` tables are strictly protected by **Row Level Security (RLS)**.
- Users can only `SELECT`, `INSERT`, `UPDATE`, and `DELETE` rows where `user_id = auth.uid()`.

## 🤝 Contributing

We welcome contributions! Please follow these steps:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Ensure your code passes the linting rules (`npm run lint`).
4. Commit your changes with conventional commits (`git commit -m 'feat: Add amazing feature'`).
5. Push to the branch (`git push origin feature/amazing-feature`).
6. Open a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
