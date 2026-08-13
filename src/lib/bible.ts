/**
 * Bible text retrieval and sanitisation (bolls.life API).
 */

import type { TranslationId } from "@/contexts/SettingsContext";

/** Canonical book order, 1–66, matching the API's book ids. */
const BOOK_IDS: Readonly<Record<string, number>> = {
  Genesis: 1, Exodus: 2, Leviticus: 3, Numbers: 4, Deuteronomy: 5,
  Joshua: 6, Judges: 7, Ruth: 8, "1 Samuel": 9, "2 Samuel": 10,
  "1 Kings": 11, "2 Kings": 12, "1 Chronicles": 13, "2 Chronicles": 14,
  Ezra: 15, Nehemiah: 16, Esther: 17, Job: 18, Psalms: 19, Proverbs: 20,
  Ecclesiastes: 21, "Song of Solomon": 22, Isaiah: 23, Jeremiah: 24,
  Lamentations: 25, Ezekiel: 26, Daniel: 27, Hosea: 28, Joel: 29, Amos: 30,
  Obadiah: 31, Jonah: 32, Micah: 33, Nahum: 34, Habakkuk: 35, Zephaniah: 36,
  Haggai: 37, Zechariah: 38, Malachi: 39, Matthew: 40, Mark: 41, Luke: 42,
  John: 43, Acts: 44, Romans: 45, "1 Corinthians": 46, "2 Corinthians": 47,
  Galatians: 48, Ephesians: 49, Philippians: 50, Colossians: 51,
  "1 Thessalonians": 52, "2 Thessalonians": 53, "1 Timothy": 54,
  "2 Timothy": 55, Titus: 56, Philemon: 57, Hebrews: 58, James: 59,
  "1 Peter": 60, "2 Peter": 61, "1 John": 62, "2 John": 63, "3 John": 64,
  Jude: 65, Revelation: 66,
};

/** Alternate names the plan or a URL might use. */
const BOOK_ALIASES: Readonly<Record<string, string>> = {
  "Song of Songs": "Song of Solomon",
  Canticles: "Song of Solomon",
  Psalm: "Psalms",
  Apocalypse: "Revelation",
};

export function getBookId(bookName: string): number | null {
  const canonical = BOOK_ALIASES[bookName] ?? bookName;
  return BOOK_IDS[canonical] ?? null;
}

export interface Verse {
  readonly verse: number;
  readonly text: string;
}

/**
 * Strips markup from an API verse, keeping only inline emphasis.
 *
 * The API returns HTML containing Strong's-number tags, footnote markers, and
 * translator-supplied italics. The old reader ran two regexes over it and
 * handed the result to `dangerouslySetInnerHTML` — a third-party response
 * injected directly into the DOM, so any `<img onerror>` or `<script>` in the
 * upstream data (or from a hijacked response) would execute.
 *
 * This parses the fragment and rebuilds it from an allowlist instead, so
 * elements, attributes, and event handlers that are not explicitly permitted
 * cannot survive. Returns plain text plus `<i>`, `<b>` and `<br>` only.
 */
export function sanitizeVerseHtml(html: string): string {
  const ALLOWED_TAGS = new Set(["I", "EM", "B", "STRONG"]);

  /**
   * Void elements kept as-is.
   *
   * `<br>` carries real meaning in this data: the API uses it to separate an
   * editorial section heading from the verse that follows, and to break poetic
   * lines throughout the Psalms. Dropping it fused words together
   * ("The Visit of the MagiAfter Jesus was born…") and flattened all poetry
   * into prose.
   */
  const VOID_TAGS = new Set(["BR"]);

  /**
   * Elements dropped together with their contents.
   *
   * `S` and `SUP` carry Strong's numbers and footnote markers — noise. The rest
   * hold executable or stylistic payloads whose *text* must not be unwrapped
   * into the output: keeping the children of a `<script>` would splice
   * `alert(1)` straight into the verse.
   */
  const DROPPED_WITH_CONTENT = new Set([
    "S", "SUP", "SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "IFRAME", "OBJECT", "EMBED",
  ]);

  const template = document.createElement("template");
  // `<template>` content is inert: scripts do not run and images do not load
  // while we walk it.
  template.innerHTML = html;

  const render = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent ?? "");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const element = node as Element;
    const tag = element.tagName;

    if (DROPPED_WITH_CONTENT.has(tag)) return "";
    if (VOID_TAGS.has(tag)) return "<br>";

    const children = Array.from(element.childNodes).map(render).join("");

    if (ALLOWED_TAGS.has(tag)) {
      const safeTag = tag === "EM" ? "i" : tag === "STRONG" ? "b" : tag.toLowerCase();
      return `<${safeTag}>${children}</${safeTag}>`;
    }

    // Unknown element: keep its text, discard the element itself.
    return children;
  };

  return Array.from(template.content.childNodes)
    .map(render)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export class BibleApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "BibleApiError";
  }
}

interface RawVerse {
  verse?: unknown;
  text?: unknown;
}

/**
 * Fetches one chapter through the app's own `/api/bible` proxy.
 *
 * Same-origin by design: the response is edge-cached, the upstream provider is
 * swappable without a client release, and the service worker can cache the URL
 * for offline reading.
 *
 * @throws {BibleApiError} on a network failure, a non-OK status, or a body that
 * is not the expected verse array.
 */
export async function fetchChapter(
  translation: TranslationId,
  book: string,
  chapter: number,
  signal?: AbortSignal,
): Promise<Verse[]> {
  const bookId = getBookId(book);
  if (bookId === null) {
    throw new BibleApiError(`Unknown book: ${book}`);
  }

  const url = `/api/bible?translation=${encodeURIComponent(translation)}&book=${bookId}&chapter=${chapter}`;

  let response: Response;
  try {
    response = await fetch(url, { signal, headers: { accept: "application/json" } });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new BibleApiError(
      "You appear to be offline. Chapters you've already opened are still available.",
    );
  }

  if (!response.ok) {
    throw new BibleApiError(
      response.status === 404
        ? `${translation} doesn't include ${book} ${chapter}. Try another translation.`
        : "Couldn't load this chapter. Please try again.",
      response.status,
    );
  }

  const body = (await response.json()) as { verses?: RawVerse[] };
  if (!Array.isArray(body?.verses)) {
    throw new BibleApiError("Received an unexpected response from the scripture service.");
  }

  // Sanitised here rather than in the proxy so the guarantee holds at the point
  // the markup is actually injected into the DOM.
  const verses = body.verses
    .map((entry) => ({
      verse: Number(entry?.verse),
      text: typeof entry?.text === "string" ? sanitizeVerseHtml(entry.text) : "",
    }))
    .filter((verse) => Number.isFinite(verse.verse) && verse.text.length > 0);

  if (verses.length === 0) {
    throw new BibleApiError(`No text available for ${book} ${chapter} in ${translation}.`);
  }

  return verses;
}

/** Stable react-query key for a chapter. */
export function chapterQueryKey(translation: string, book: string, chapter: number) {
  return ["bible", translation, book, chapter] as const;
}
