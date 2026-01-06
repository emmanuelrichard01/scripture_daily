# Scripture Daily

A calm, reverent PWA for tracking Professor Grant Horner’s Bible reading system: 10 daily chapters across 10 parallel reading lists.

## What this app does

- **Today**: shows your 10 chapters for the day and lets you mark each one complete.
- **Progress**: tracks streaks, total chapters read, and quiet milestones over time.
- **History / Calendar**: review past completion.
- **Shareable progress card**: generate an image for sharing.
- **Profile**: manage display name and avatar.
- **Settings**: reminders, theme, and preferences.

## How Horner’s system works (quick overview)

- Scripture is divided into **10 lists** (Gospels, Epistles, Psalms, Proverbs, etc.).
- Each day you read **one chapter from each list**.
- Since lists have different lengths, the combinations stay fresh for a long time.

## Authentication

This app supports:
- Email + password
- Google sign-in

### Google sign-in setup (backend)

If Google sign-in returns an error like “Unable to exchange external code”, it almost always means the Google OAuth credentials or redirect URLs are not configured correctly.

Open the backend and verify:
- **Google provider is enabled** and has the correct **Client ID** + **Client Secret**
- The **Authorized redirect URL** shown in the backend is added to your Google Cloud OAuth client
- Your deployed domain (and preview domain, if used) is present in allowed **Site / Redirect URLs**

## Local development

```sh
npm i
npm run dev
```

## Tech stack

- React + TypeScript
- Vite
- Tailwind + shadcn-ui
- Backend (auth + database) provided via Lovable Cloud

## Deploy

Publish via Lovable → **Share → Publish**.

