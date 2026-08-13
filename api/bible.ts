/**
 * Scripture text proxy.
 *
 * The client used to call bolls.life directly from the browser. That coupled
 * the reader to one unofficial upstream, exposed its URL shape to every user,
 * made a CORS or availability change a hard outage, and left no place to put an
 * API key if a licensed provider is added later.
 *
 * Routing through this function gives us:
 *   - **Edge caching.** A chapter of scripture never changes, so responses are
 *     immutable and served from Vercel's CDN instead of hitting upstream.
 *   - **A same-origin URL** the service worker can cache, which is what makes
 *     offline reading actually work.
 *   - **A provider seam.** Swapping or adding an upstream is a change here, not
 *     a client release.
 */

export const config = { runtime: "edge" };

const UPSTREAM = "https://bolls.life/get-text";

const ALLOWED_TRANSLATIONS = new Set([
  "ESV", "NIV", "NLT", "NASB", "LSB", "WEB", "KJV", "ASV", "YLT",
]);

const MAX_BOOK_ID = 66;
const MAX_CHAPTER = 150; // Psalms, the longest book.

function json(body: unknown, status: number, cacheSeconds = 0): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheSeconds
        ? `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}, immutable`
        : "no-store",
    },
  });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const url = new URL(request.url);
  const translation = (url.searchParams.get("translation") ?? "").toUpperCase();
  const bookId = Number(url.searchParams.get("book"));
  const chapter = Number(url.searchParams.get("chapter"));

  // Validate before touching upstream: these values are interpolated into a
  // URL, so anything unvalidated is a request-forgery vector.
  if (!ALLOWED_TRANSLATIONS.has(translation)) {
    return json({ error: "Unsupported translation" }, 400);
  }
  if (!Number.isInteger(bookId) || bookId < 1 || bookId > MAX_BOOK_ID) {
    return json({ error: "Invalid book" }, 400);
  }
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > MAX_CHAPTER) {
    return json({ error: "Invalid chapter" }, 400);
  }

  try {
    const upstream = await fetch(`${UPSTREAM}/${translation}/${bookId}/${chapter}/`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });

    if (!upstream.ok) {
      return json(
        { error: upstream.status === 404 ? "Chapter not available" : "Upstream error" },
        upstream.status === 404 ? 404 : 502,
      );
    }

    const body: unknown = await upstream.json();
    if (!Array.isArray(body)) {
      return json({ error: "Unexpected upstream response" }, 502);
    }

    // Normalise to our own shape so the client is not bound to the upstream's.
    const verses = body
      .map((entry: { verse?: unknown; text?: unknown }) => ({
        verse: Number(entry?.verse),
        text: typeof entry?.text === "string" ? entry.text : "",
      }))
      .filter((verse) => Number.isFinite(verse.verse) && verse.text.length > 0);

    if (verses.length === 0) {
      return json({ error: "Chapter not available" }, 404);
    }

    // Cached for a year: the text of a chapter is fixed.
    return json({ translation, bookId, chapter, verses }, 200, 31_536_000);
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return json({ error: timedOut ? "Upstream timed out" : "Upstream unreachable" }, 504);
  }
}
