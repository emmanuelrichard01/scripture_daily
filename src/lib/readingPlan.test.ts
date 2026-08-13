import { describe, expect, it } from "vitest";
import {
  CHAPTERS_PER_DAY,
  TOTAL_PLAN_CHAPTERS,
  chapterAtPosition,
  getList,
  getListPosition,
  getTodaysReadings,
  readingLists,
} from "@/lib/readingPlan";

const gospels = getList(1)!;
const psalms = getList(6)!;
const prophets = getList(9)!;

describe("plan data integrity", () => {
  it("has exactly ten lists with ids 1..10", () => {
    expect(readingLists).toHaveLength(10);
    expect(readingLists.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(CHAPTERS_PER_DAY).toBe(10);
  });

  it("derives totalChapters from its books", () => {
    for (const list of readingLists) {
      const summed = list.books.reduce((sum, book) => sum + book.chapters, 0);
      expect(list.totalChapters).toBe(summed);
    }
  });

  it("matches the canonical Horner list lengths", () => {
    const lengths = Object.fromEntries(readingLists.map((l) => [l.name, l.totalChapters]));
    expect(lengths).toEqual({
      Gospels: 89,
      Pentateuch: 187,
      "Paul's Letters I": 78,
      "Paul's Letters II": 65,
      Wisdom: 62,
      Psalms: 150,
      Proverbs: 31,
      History: 249,
      Prophets: 250,
      Acts: 28,
    });
  });

  it("covers all 1,189 chapters of the Bible exactly once", () => {
    expect(TOTAL_PLAN_CHAPTERS).toBe(1189);
  });

  it("names each of the 66 books exactly once across all lists", () => {
    const names = readingLists.flatMap((list) => list.books.map((b) => b.name));
    expect(names).toHaveLength(66);
    expect(new Set(names).size).toBe(66);
  });

  it("gives every list a distinct accent colour", () => {
    const colors = readingLists.map((l) => l.colorVar);
    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe("chapterAtPosition", () => {
  it("resolves the first and last chapter of a list", () => {
    expect(chapterAtPosition(gospels, 1)).toMatchObject({ book: "Matthew", chapter: 1 });
    expect(chapterAtPosition(gospels, 89)).toMatchObject({ book: "John", chapter: 21 });
  });

  it("resolves across book boundaries", () => {
    // Matthew is 28 chapters, so position 28 ends Matthew and 29 starts Mark.
    expect(chapterAtPosition(gospels, 28)).toMatchObject({ book: "Matthew", chapter: 28 });
    expect(chapterAtPosition(gospels, 29)).toMatchObject({ book: "Mark", chapter: 1 });
    // Matthew + Mark = 44, so 45 starts Luke.
    expect(chapterAtPosition(gospels, 45)).toMatchObject({ book: "Luke", chapter: 1 });
  });

  it("reports the index of the containing book", () => {
    expect(chapterAtPosition(gospels, 29).bookIndex).toBe(1);
    expect(chapterAtPosition(gospels, 1).bookIndex).toBe(0);
  });

  it("wraps positions past the end of the cycle", () => {
    expect(chapterAtPosition(gospels, 90)).toMatchObject({ book: "Matthew", chapter: 1 });
    expect(chapterAtPosition(gospels, 178)).toMatchObject({ book: "John", chapter: 21 });
  });

  it("wraps non-positive positions instead of throwing", () => {
    expect(chapterAtPosition(gospels, 0)).toMatchObject({ book: "John", chapter: 21 });
    expect(chapterAtPosition(gospels, -1)).toMatchObject({ book: "John", chapter: 20 });
  });

  it("handles single-book lists", () => {
    expect(chapterAtPosition(psalms, 1)).toMatchObject({ book: "Psalms", chapter: 1 });
    expect(chapterAtPosition(psalms, 150)).toMatchObject({ book: "Psalms", chapter: 150 });
    expect(chapterAtPosition(psalms, 151)).toMatchObject({ book: "Psalms", chapter: 1 });
  });

  it("enumerates a whole list without gaps or repeats", () => {
    const seen = new Set<string>();
    for (let position = 1; position <= prophets.totalChapters; position++) {
      const ref = chapterAtPosition(prophets, position);
      seen.add(`${ref.book} ${ref.chapter}`);
    }
    expect(seen.size).toBe(prophets.totalChapters);
  });
});

describe("getListPosition", () => {
  it("starts a fresh list at chapter 1 of cycle 1", () => {
    const position = getListPosition(gospels, 0);
    expect(position.completedCycles).toBe(0);
    expect(position.chaptersIntoCycle).toBe(0);
    expect(position.progressPercent).toBe(0);
    expect(position.nextChapter).toMatchObject({ book: "Matthew", chapter: 1 });
  });

  it("points at the next unread chapter", () => {
    expect(getListPosition(gospels, 1).nextChapter).toMatchObject({
      book: "Matthew",
      chapter: 2,
    });
  });

  it("counts a completed cycle and wraps to the start", () => {
    const position = getListPosition(gospels, 89);
    expect(position.completedCycles).toBe(1);
    expect(position.chaptersIntoCycle).toBe(0);
    expect(position.nextChapter).toMatchObject({ book: "Matthew", chapter: 1 });
  });

  it("counts multiple cycles", () => {
    const position = getListPosition(gospels, 89 * 3 + 10);
    expect(position.completedCycles).toBe(3);
    expect(position.chaptersIntoCycle).toBe(10);
    expect(position.nextChapter).toMatchObject({ book: "Matthew", chapter: 11 });
  });

  it("reports cycle progress as a percentage", () => {
    expect(getListPosition(psalms, 75).progressPercent).toBe(50);
    expect(getListPosition(psalms, 150).progressPercent).toBe(0);
  });

  it("treats negative counts as zero rather than going backwards", () => {
    expect(getListPosition(gospels, -5).chaptersIntoCycle).toBe(0);
  });
});

describe("getTodaysReadings", () => {
  it("returns one reading per list", () => {
    const readings = getTodaysReadings({}, new Set());
    expect(readings).toHaveLength(10);
    expect(readings.map((r) => r.listId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("shows the next unread chapter for an incomplete list", () => {
    const [gospelReading] = getTodaysReadings({ 1: 5 }, new Set());
    expect(gospelReading).toMatchObject({
      book: "Matthew",
      chapter: 6,
      completed: false,
    });
  });

  it("keeps showing the finished chapter once marked complete today", () => {
    // The count already includes today's chapter, so the card must step back to
    // name what was read — otherwise it advances out from under the user the
    // instant they tap it.
    const [gospelReading] = getTodaysReadings({ 1: 6 }, new Set([1]));
    expect(gospelReading).toMatchObject({
      book: "Matthew",
      chapter: 6,
      completed: true,
    });
  });

  it("keeps the displayed chapter stable across marking it complete", () => {
    const before = getTodaysReadings({ 1: 5 }, new Set())[0];
    const after = getTodaysReadings({ 1: 6 }, new Set([1]))[0];
    expect(after.book).toBe(before.book);
    expect(after.chapter).toBe(before.chapter);
  });

  it("shows the last chapter of a cycle when it completes the cycle today", () => {
    const [gospelReading] = getTodaysReadings({ 1: 89 }, new Set([1]));
    expect(gospelReading).toMatchObject({ book: "John", chapter: 21, completed: true });
    expect(gospelReading.completedCycles).toBe(1);
  });

  it("marks only the lists listed as complete", () => {
    const readings = getTodaysReadings({}, new Set([1, 3, 7]));
    const completed = readings.filter((r) => r.completed).map((r) => r.listId);
    expect(completed).toEqual([1, 3, 7]);
  });

  it("treats a missing list count as zero", () => {
    const readings = getTodaysReadings({ 1: 4 }, new Set());
    expect(readings[1]).toMatchObject({ book: "Genesis", chapter: 1 });
  });
});
