import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  test: {
    globals: true,
    environment: "jsdom",
    // The default `forks` pool fails to hand off worker paths containing
    // spaces (this repo lives under "Q3 Projects" in OneDrive).
    pool: "threads",
    fileParallelism: false,
    maxWorkers: 1,
    setupFiles: ["./src/test/setup.ts"],
    // Playwright owns ./tests; Vitest owns colocated *.test.ts files.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**", "src/hooks/**", "src/contexts/**"],
    },
  },
});
