import { describe, expect, it } from "vitest";
import {
  parseHighlights,
  verseKey,
  type VerseHighlight,
} from "@/lib/highlights";

describe("verseKey", () => {
  it("formats key in lowercase with chapter and verse", () => {
    expect(verseKey("Genesis", 1, 1)).toBe("genesis:1:1");
    expect(verseKey("1 John", 3, 16)).toBe("1 john:3:16");
  });
});

describe("parseHighlights", () => {
  it("parses valid highlights list", () => {
    const raw: VerseHighlight[] = [
      {
        id: "h1",
        book: "Romans",
        chapter: 8,
        verse: 28,
        color: "yellow",
        note: "Great promise",
        createdAt: "2026-08-15T00:00:00Z",
        updatedAt: "2026-08-15T00:00:00Z",
      },
    ];
    const parsed = parseHighlights(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed?.[0].book).toBe("Romans");
    expect(parsed?.[0].color).toBe("yellow");
  });

  it("filters out invalid items or rejects invalid payloads", () => {
    expect(parseHighlights(null)).toBeNull();
    expect(parseHighlights("not an array")).toBeNull();
    const mixed = [
      { id: "h1", book: "Genesis", chapter: 1, verse: 1, color: "green" },
      { id: "bad", color: "invalid_color" },
    ];
    const parsed = parseHighlights(mixed);
    expect(parsed).toHaveLength(1);
  });
});
