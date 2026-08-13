import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { VitePWA } from "vite-plugin-pwa";
import { bibleDevServer } from "./src/dev/bibleDevServer";

export default defineConfig(({ mode }) => ({
  server: { host: "::", port: 8080 },

  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },

  build: {
    // Meaningful stack traces from production errors, without shipping source.
    sourcemap: mode !== "production" ? true : "hidden",
    rollupOptions: {
      output: {
        // Split the heavy, rarely-changing dependencies out of the app chunk so
        // a code change does not force users to re-download React and Supabase.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router)/.test(id)) {
            return "vendor-react";
          }
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
        },
      },
    },
    // recharts alone lands near this; flag anything unexpectedly larger.
    chunkSizeWarningLimit: 700,
  },

  plugins: [
    react(),
    // Stands in for the Vercel function so the reader works under `npm run dev`.
    bibleDevServer(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],

      manifest: {
        name: "Scripture Daily",
        short_name: "Scripture Daily",
        description:
          "Track daily Bible reading with Professor Grant Horner's 10-list system.",
        // Matches the light palette in index.css; the app rewrites this meta
        // tag at runtime to follow the resolved theme.
        theme_color: "#faf8f5",
        background_color: "#faf8f5",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        categories: ["books", "education", "lifestyle"],
        icons: [
          // PNG, not SVG: iOS ignores SVG manifest icons entirely, which is why
          // the previous SVG-only manifest produced a blank home-screen tile.
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          { name: "Today's reading", url: "/", description: "Your ten chapters" },
          { name: "History", url: "/history", description: "Your reading history" },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        importScripts: ["/push-sw.js"],
        // Any unmatched navigation resolves to the app shell, so deep links
        // work offline.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,

        runtimeCaching: [
          {
            // The whole point of the /api/bible proxy: chapters read once stay
            // readable with no connection. Cache-first because scripture text
            // is immutable.
            urlPattern: /\/api\/bible\?/,
            handler: "CacheFirst",
            options: {
              cacheName: "scripture-text",
              expiration: {
                maxEntries: 500, // Roughly six weeks of daily reading.
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-files",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Avatars change rarely; serve instantly and refresh in background.
            urlPattern: /\/storage\/v1\/object\/public\/avatars\//,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "avatars",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
}));
