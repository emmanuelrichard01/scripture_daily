/**
 * Professor Grant Horner's Bible Reading System — plan data and cycle engine.
 *
 * The system splits Scripture into 10 lists. Each day you read one chapter from
 * each list. Because the lists have coprime-ish lengths (28 to 250 chapters),
 * the daily *combination* of ten chapters does not repeat for decades.
 *
 * ## Position model
 *
 * A list has no calendar. Its bookmark is a pure function of how many chapters
 * you have ever completed in it:
 *
 *     position within cycle = (chapters completed mod list length) + 1
 *
 * Read chapter 250 of the Prophets and the bookmark wraps to chapter 1 — that is
 * a completed cycle, and cycles are counted, never reset. This is what makes the
 * plan resilient: skip a week and you resume exactly where you stopped, because
 * nothing is indexed by date. Horner's own instruction is "never try to catch
 * up", and this model encodes it rather than merely suggesting it.
 */

export interface Book {
  readonly name: string;
  readonly chapters: number;
}

export interface ReadingList {
  readonly id: number;
  readonly name: string;
  readonly description: string;
  readonly books: readonly Book[];
  /** Chapters in one full pass. Precomputed; equals the sum of `books`. */
  readonly totalChapters: number;
  /** CSS custom property holding this list's accent hue. */
  readonly colorVar: string;
}

/** Raw plan data. `totalChapters` is derived below so it can never drift. */
const LIST_DEFINITIONS = [
  {
    id: 1,
    name: "Gospels",
    description: "Matthew, Mark, Luke, John",
    colorVar: "--track-blue",
    books: [
      { name: "Matthew", chapters: 28 },
      { name: "Mark", chapters: 16 },
      { name: "Luke", chapters: 24 },
      { name: "John", chapters: 21 },
    ],
  },
  {
    id: 2,
    name: "Pentateuch",
    description: "Genesis through Deuteronomy",
    colorVar: "--track-green",
    books: [
      { name: "Genesis", chapters: 50 },
      { name: "Exodus", chapters: 40 },
      { name: "Leviticus", chapters: 27 },
      { name: "Numbers", chapters: 36 },
      { name: "Deuteronomy", chapters: 34 },
    ],
  },
  {
    id: 3,
    name: "Paul's Letters I",
    description: "Romans through Colossians, and Hebrews",
    colorVar: "--track-red",
    books: [
      { name: "Romans", chapters: 16 },
      { name: "1 Corinthians", chapters: 16 },
      { name: "2 Corinthians", chapters: 13 },
      { name: "Galatians", chapters: 6 },
      { name: "Ephesians", chapters: 6 },
      { name: "Philippians", chapters: 4 },
      { name: "Colossians", chapters: 4 },
      { name: "Hebrews", chapters: 13 },
    ],
  },
  {
    id: 4,
    name: "Paul's Letters II",
    description: "Thessalonians through Revelation",
    colorVar: "--track-purple",
    books: [
      { name: "1 Thessalonians", chapters: 5 },
      { name: "2 Thessalonians", chapters: 3 },
      { name: "1 Timothy", chapters: 6 },
      { name: "2 Timothy", chapters: 4 },
      { name: "Titus", chapters: 3 },
      { name: "Philemon", chapters: 1 },
      { name: "James", chapters: 5 },
      { name: "1 Peter", chapters: 5 },
      { name: "2 Peter", chapters: 3 },
      { name: "1 John", chapters: 5 },
      { name: "2 John", chapters: 1 },
      { name: "3 John", chapters: 1 },
      { name: "Jude", chapters: 1 },
      { name: "Revelation", chapters: 22 },
    ],
  },
  {
    id: 5,
    name: "Wisdom",
    description: "Job, Ecclesiastes, Song of Solomon",
    colorVar: "--track-yellow",
    books: [
      { name: "Job", chapters: 42 },
      { name: "Ecclesiastes", chapters: 12 },
      { name: "Song of Solomon", chapters: 8 },
    ],
  },
  {
    id: 6,
    name: "Psalms",
    description: "All 150 Psalms",
    colorVar: "--track-pink",
    books: [{ name: "Psalms", chapters: 150 }],
  },
  {
    id: 7,
    name: "Proverbs",
    description: "A proverb for each day",
    colorVar: "--track-orange",
    books: [{ name: "Proverbs", chapters: 31 }],
  },
  {
    id: 8,
    name: "History",
    description: "Joshua through Esther",
    colorVar: "--track-teal",
    books: [
      { name: "Joshua", chapters: 24 },
      { name: "Judges", chapters: 21 },
      { name: "Ruth", chapters: 4 },
      { name: "1 Samuel", chapters: 31 },
      { name: "2 Samuel", chapters: 24 },
      { name: "1 Kings", chapters: 22 },
      { name: "2 Kings", chapters: 25 },
      { name: "1 Chronicles", chapters: 29 },
      { name: "2 Chronicles", chapters: 36 },
      { name: "Ezra", chapters: 10 },
      { name: "Nehemiah", chapters: 13 },
      { name: "Esther", chapters: 10 },
    ],
  },
  {
    id: 9,
    name: "Prophets",
    description: "Isaiah through Malachi",
    colorVar: "--track-indigo",
    books: [
      { name: "Isaiah", chapters: 66 },
      { name: "Jeremiah", chapters: 52 },
      { name: "Lamentations", chapters: 5 },
      { name: "Ezekiel", chapters: 48 },
      { name: "Daniel", chapters: 12 },
      { name: "Hosea", chapters: 14 },
      { name: "Joel", chapters: 3 },
      { name: "Amos", chapters: 9 },
      { name: "Obadiah", chapters: 1 },
      { name: "Jonah", chapters: 4 },
      { name: "Micah", chapters: 7 },
      { name: "Nahum", chapters: 3 },
      { name: "Habakkuk", chapters: 3 },
      { name: "Zephaniah", chapters: 3 },
      { name: "Haggai", chapters: 2 },
      { name: "Zechariah", chapters: 14 },
      { name: "Malachi", chapters: 4 },
    ],
  },
  {
    id: 10,
    name: "Acts",
    description: "The Acts of the Apostles",
    colorVar: "--track-cyan",
    books: [{ name: "Acts", chapters: 28 }],
  },
] as const satisfies readonly Omit<ReadingList, "totalChapters">[];

export const readingLists: readonly ReadingList[] = LIST_DEFINITIONS.map((list) => ({
  ...list,
  totalChapters: list.books.reduce((sum, book) => sum + book.chapters, 0),
}));

/** Total chapters across all ten lists — one full pass of the whole plan. */
export const TOTAL_PLAN_CHAPTERS = readingLists.reduce(
  (sum, list) => sum + list.totalChapters,
  0,
);

/** How many lists are read per day. The daily target. */
export const CHAPTERS_PER_DAY = readingLists.length;

const LISTS_BY_ID = new Map(readingLists.map((list) => [list.id, list]));

export function getList(listId: number): ReadingList | undefined {
  return LISTS_BY_ID.get(listId);
}

export const listIds: readonly number[] = readingLists.map((list) => list.id);

/**
 * Per-list cumulative chapter offsets, so resolving a position to a book is a
 * binary search rather than a linear walk.
 *
 * `offsets[i]` is the number of chapters preceding `books[i]`. The Prophets list
 * has 17 books and 250 chapters; the History page resolves a position for every
 * list on every render, so this matters more than it looks.
 */
const CUMULATIVE_OFFSETS = new Map<number, readonly number[]>(
  readingLists.map((list) => {
    const offsets: number[] = [];
    let running = 0;
    for (const book of list.books) {
      offsets.push(running);
      running += book.chapters;
    }
    return [list.id, offsets];
  }),
);

/** A specific chapter within a list, plus where it sits in the list's books. */
export interface ChapterRef {
  readonly book: string;
  readonly chapter: number;
  /** Index into `list.books`. Used to highlight the active book. */
  readonly bookIndex: number;
}

/**
 * Resolves a 1-based position within a list's cycle to a book and chapter.
 *
 * Positions outside `1..totalChapters` wrap, so callers may pass raw counts.
 */
export function chapterAtPosition(list: ReadingList, position: number): ChapterRef {
  const total = list.totalChapters;
  // `((n % t) + t) % t` keeps negatives in range; +1 restores 1-based indexing.
  const normalized = (((Math.trunc(position) - 1) % total) + total) % total;

  const offsets = CUMULATIVE_OFFSETS.get(list.id);
  if (!offsets) {
    throw new Error(`No cumulative offsets for list ${list.id}`);
  }

  // Rightmost book whose offset is <= normalized.
  let low = 0;
  let high = offsets.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (offsets[mid] <= normalized) low = mid;
    else high = mid - 1;
  }

  return {
    book: list.books[low].name,
    chapter: normalized - offsets[low] + 1,
    bookIndex: low,
  };
}

/**
 * The 1-based position of a book/chapter within a list's cycle.
 *
 * The inverse of {@link chapterAtPosition}. Lets the reader step forwards and
 * backwards through a list's sequence — crossing book boundaries correctly —
 * from nothing but the reference currently on screen.
 *
 * Returns `null` if the book is not in this list or the chapter is out of range.
 */
export function positionOfChapter(
  list: ReadingList,
  book: string,
  chapter: number,
): number | null {
  const offsets = CUMULATIVE_OFFSETS.get(list.id);
  if (!offsets) return null;

  const bookIndex = list.books.findIndex((entry) => entry.name === book);
  if (bookIndex === -1) return null;

  const bookChapters = list.books[bookIndex].chapters;
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > bookChapters) return null;

  return offsets[bookIndex] + chapter;
}

/** Where a list stands given a lifetime chapter count. */
export interface ListPosition {
  readonly listId: number;
  readonly listName: string;
  readonly colorVar: string;
  /** Lifetime chapters completed in this list. */
  readonly completedChapters: number;
  readonly totalChapters: number;
  /** Full passes finished. */
  readonly completedCycles: number;
  /** Chapters into the current, unfinished cycle. `0..totalChapters - 1`. */
  readonly chaptersIntoCycle: number;
  /** Current cycle completion, 0–100, rounded. */
  readonly progressPercent: number;
  /** The next unread chapter — what the user reads today. */
  readonly nextChapter: ChapterRef;
}

/**
 * Computes a list's standing from its lifetime completion count.
 *
 * This single function replaces the cycle math that was previously reimplemented
 * on the Today, Lists, Progress and Milestones pages — where the four copies had
 * drifted and disagreed about whether "current chapter" meant the one just
 * finished or the next one due.
 */
export function getListPosition(list: ReadingList, completedChapters: number): ListPosition {
  const completed = Math.max(0, Math.trunc(completedChapters));
  const total = list.totalChapters;
  const completedCycles = Math.floor(completed / total);
  const chaptersIntoCycle = completed % total;

  return {
    listId: list.id,
    listName: list.name,
    colorVar: list.colorVar,
    completedChapters: completed,
    totalChapters: total,
    completedCycles,
    chaptersIntoCycle,
    progressPercent: Math.round((chaptersIntoCycle / total) * 100),
    // The next chapter due is one past what has been read.
    nextChapter: chapterAtPosition(list, chaptersIntoCycle + 1),
  };
}

/** One row of today's ten chapters. */
export interface TodayReading extends ListPosition {
  /** The chapter shown for today. */
  readonly book: string;
  readonly chapter: number;
  readonly bookIndex: number;
  /** Whether this list has already been marked complete today. */
  readonly completed: boolean;
}

/**
 * Builds today's ten readings.
 *
 * A list already marked complete today keeps showing the chapter that was just
 * finished, not the next one — otherwise the card would advance out from under
 * the user the instant they tapped it, and unchecking a mistap would show a
 * different chapter than the one they checked.
 *
 * @param listProgress   Lifetime chapters completed, keyed by list id.
 * @param completedToday List ids already marked complete for the current day.
 */
export function getTodaysReadings(
  listProgress: Readonly<Record<number, number>>,
  completedToday: ReadonlySet<number>,
): TodayReading[] {
  return readingLists.map((list) => {
    const completed = completedToday.has(list.id);
    const lifetime = listProgress[list.id] ?? 0;
    const position = getListPosition(list, lifetime);

    // When done today, step back one to name the chapter that was just read.
    const shown = completed
      ? chapterAtPosition(list, lifetime)
      : position.nextChapter;

    return { ...position, ...shown, completed };
  });
}

// ─────────────────────────── Editorial content ───────────────────────────

export interface PlanFact {
  readonly title: string;
  readonly description: string;
}

/** Background on why the system is shaped the way it is. */
export const hornerFacts: readonly PlanFact[] = [
  {
    title: "10 Lists Every Single Day",
    description:
      "You read 1 chapter from each of 10 distinct lists daily. In a year you'll finish the Gospels about 4 times, Paul's letters 4–5 times, the Old Testament narrative once or twice, and Proverbs roughly 12 times.",
  },
  {
    title: "Never-Repeating Combinations",
    description:
      "Because the lists run from 28 to 250 chapters, the daily combination of ten chapters won't repeat for years — which keeps producing fresh connections across the canon.",
  },
  {
    title: "High-Speed Pattern Recognition",
    description:
      "Reading across multiple biblical genres every day trains you to synthesize narrative, poetry, and epistle without consciously working at it.",
  },
  {
    title: "25–30 Minutes Total",
    description:
      "Ten chapters sounds overwhelming, but read at a steady pace without stopping to study or cross-reference, the whole day's reading takes 25 to 30 minutes.",
  },
  {
    title: "The Three-Year Effect",
    description:
      "After three years you'll have read over 10,000 chapters, and you'll know where every book, narrative, and doctrine sits in the flow of Scripture.",
  },
];

/** Horner's own guidance on how to actually sustain the plan. */
export const readingTips: readonly PlanFact[] = [
  {
    title: "Read for Flow, Not In-Depth Study",
    description:
      "Don't stop for commentaries or study notes during your ten chapters. Read at a steady pace and let the text wash over you. Keep deep study for a separate sitting.",
  },
  {
    title: "Never Try to Catch Up",
    description:
      "Miss a day and you do not read twenty chapters the next. Simply resume where you stopped. The plan is a continuous loop built for decades, not a debt to repay.",
  },
  {
    title: "Stay in One Translation per Cycle",
    description:
      "Use one primary translation for a whole cycle so its phrasing and structure imprint in memory. Switching constantly undercuts recall.",
  },
  {
    title: "Finish All Ten Each Day",
    description:
      "Aim to complete all ten chapters in one or two sittings. Reading the full set in a single day is what triggers the cross-textual pattern recognition.",
  },
  {
    title: "Build a Fixed Ritual",
    description:
      "Read at the same time every day — first thing in the morning works for most people. Habitual timing is what makes ten chapters feel effortless.",
  },
  {
    title: "Trust the Cumulative Process",
    description:
      "Don't worry about remembering everything you read today. The power of the system is repetition compounding over months and years.",
  },
];
