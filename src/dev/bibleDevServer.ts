import type { Plugin } from "vite";

/**
 * Serves `/api/bible` during `vite dev`.
 *
 * The production handler in `api/bible.ts` runs on Vercel's edge runtime, which
 * the Vite dev server does not emulate — without this the reader would 404 on
 * every chapter locally, and the only way to exercise it would be `vercel dev`.
 *
 * Mirrors the production contract: same validation, same response envelope. It
 * deliberately does not set cache headers, so local changes are never masked by
 * a stale response.
 */
export function bibleDevServer(): Plugin {
  const UPSTREAM = "https://bolls.life/get-text";
  const ALLOWED_TRANSLATIONS = new Set([
    "ESV", "NIV", "NLT", "NASB", "LSB", "WEB", "KJV", "ASV", "YLT",
  ]);

  return {
    name: "bible-dev-server",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/bible", async (request, response) => {
        const send = (status: number, body: unknown) => {
          response.statusCode = status;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(JSON.stringify(body));
        };

        try {
          const url = new URL(request.url ?? "", "http://localhost");
          const translation = (url.searchParams.get("translation") ?? "").toUpperCase();
          const bookId = Number(url.searchParams.get("book"));
          const chapter = Number(url.searchParams.get("chapter"));

          if (!ALLOWED_TRANSLATIONS.has(translation)) {
            return send(400, { error: "Unsupported translation" });
          }
          if (!Number.isInteger(bookId) || bookId < 1 || bookId > 66) {
            return send(400, { error: "Invalid book" });
          }
          if (!Number.isInteger(chapter) || chapter < 1 || chapter > 150) {
            return send(400, { error: "Invalid chapter" });
          }

          const upstream = await fetch(`${UPSTREAM}/${translation}/${bookId}/${chapter}/`, {
            headers: { accept: "application/json" },
          });

          if (!upstream.ok) {
            return send(upstream.status === 404 ? 404 : 502, {
              error: upstream.status === 404 ? "Chapter not available" : "Upstream error",
            });
          }

          const body: unknown = await upstream.json();
          if (!Array.isArray(body)) {
            return send(502, { error: "Unexpected upstream response" });
          }

          const verses = body
            .map((entry: { verse?: unknown; text?: unknown }) => ({
              verse: Number(entry?.verse),
              text: typeof entry?.text === "string" ? entry.text : "",
            }))
            .filter((verse) => Number.isFinite(verse.verse) && verse.text.length > 0);

          if (verses.length === 0) {
            return send(404, { error: "Chapter not available" });
          }

          send(200, { translation, bookId, chapter, verses });
        } catch (error) {
          send(504, {
            error: error instanceof Error ? error.message : "Upstream unreachable",
          });
        }
      });
    },
  };
}
