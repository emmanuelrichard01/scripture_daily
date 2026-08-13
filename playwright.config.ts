import { defineConfig, devices } from "@playwright/test";

const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // The app is mobile-first and its layout is nav-bar driven; a phone
    // viewport is the primary target, not an afterthought.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],

  webServer: {
    // Tests run against the production bundle so the service worker, chunk
    // splitting and SPA fallback are all exercised as shipped.
    command: process.env.CI ? `npm run preview -- --port ${PORT}` : "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
