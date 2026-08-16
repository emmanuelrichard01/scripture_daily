import { supabase } from "@/integrations/supabase/client";
import { readJSON, StorageKeys, writeJSON } from "@/lib/storage";

export type HighlightColor = "yellow" | "green" | "blue" | "pink";

export interface VerseHighlight {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  color: HighlightColor;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export const HIGHLIGHT_PALETTE: Record<
  HighlightColor,
  {
    name: string;
    bgClass: string;
    borderClass: string;
    pillClass: string;
    hex: string;
  }
> = {
  yellow: {
    name: "Amber",
    bgClass: "bg-amber-400/25 dark:bg-amber-400/20",
    borderClass: "border-b-2 border-amber-500",
    pillClass: "bg-amber-400 text-amber-950",
    hex: "#f59e0b",
  },
  green: {
    name: "Sage",
    bgClass: "bg-emerald-400/25 dark:bg-emerald-400/20",
    borderClass: "border-b-2 border-emerald-500",
    pillClass: "bg-emerald-400 text-emerald-950",
    hex: "#10b981",
  },
  blue: {
    name: "Sky",
    bgClass: "bg-sky-400/25 dark:bg-sky-400/20",
    borderClass: "border-b-2 border-sky-500",
    pillClass: "bg-sky-400 text-sky-950",
    hex: "#0ea5e9",
  },
  pink: {
    name: "Rose",
    bgClass: "bg-rose-400/25 dark:bg-rose-400/20",
    borderClass: "border-b-2 border-rose-500",
    pillClass: "bg-rose-400 text-rose-950",
    hex: "#f43f5e",
  },
};

/** Generates a deterministic key for indexing highlights in a map. */
export function verseKey(book: string, chapter: number, verse: number): string {
  return `${book.trim().toLowerCase()}:${chapter}:${verse}`;
}

export function parseHighlights(value: unknown): VerseHighlight[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter(
    (item): item is VerseHighlight =>
      typeof item === "object" &&
      item !== null &&
      typeof item.id === "string" &&
      typeof item.book === "string" &&
      typeof item.chapter === "number" &&
      typeof item.verse === "number" &&
      ["yellow", "green", "blue", "pink"].includes(item.color),
  );
}

export function loadLocalHighlights(): VerseHighlight[] {
  return readJSON(StorageKeys.highlights, parseHighlights) ?? [];
}

export function saveLocalHighlights(highlights: VerseHighlight[]): boolean {
  return writeJSON(StorageKeys.highlights, highlights);
}

/** Syncs highlights to Supabase if the user is authenticated. */
export async function syncHighlightToCloud(
  userId: string,
  highlight: VerseHighlight,
): Promise<void> {
  const { error } = await supabase.from("highlights").upsert(
    {
      id: highlight.id,
      user_id: userId,
      book: highlight.book,
      chapter: highlight.chapter,
      verse: highlight.verse,
      color: highlight.color,
      note: highlight.note,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,book,chapter,verse" },
  );

  if (error) {
    // Fail silently in background sync, local copy is durable
    console.warn("Highlights cloud sync warning:", error.message);
  }
}

/** Deletes a highlight from Supabase if authenticated. */
export async function deleteHighlightFromCloud(
  userId: string,
  book: string,
  chapter: number,
  verse: number,
): Promise<void> {
  const { error } = await supabase
    .from("highlights")
    .delete()
    .eq("user_id", userId)
    .eq("book", book)
    .eq("chapter", chapter)
    .eq("verse", verse);

  if (error) {
    console.warn("Highlights cloud delete warning:", error.message);
  }
}
