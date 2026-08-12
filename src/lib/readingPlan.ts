// Horner Bible Reading Plan - Complete Book and Chapter Data

export interface Book {
  name: string;
  chapters: number;
}

export interface ReadingList {
  id: number;
  name: string;
  description: string;
  books: Book[];
  cycleDays: number;
  colorVar: string;
}

// Track colors mapped to CSS variables
export const trackColors: Record<number, string> = {
  1: "var(--track-blue)",
  2: "var(--track-green)",
  3: "var(--track-red)",
  4: "var(--track-purple)",
  5: "var(--track-yellow)",
  6: "var(--track-pink)",
  7: "var(--track-orange)",
  8: "var(--track-teal)",
  9: "var(--track-indigo)",
  10: "var(--track-cyan)",
};

// All 10 reading lists from the Horner system
export const readingLists: ReadingList[] = [
  {
    id: 1,
    name: "Gospels",
    description: "Matthew, Mark, Luke, John",
    books: [
      { name: "Matthew", chapters: 28 },
      { name: "Mark", chapters: 16 },
      { name: "Luke", chapters: 24 },
      { name: "John", chapters: 21 },
    ],
    cycleDays: 89,
    colorVar: "--track-blue",
  },
  {
    id: 2,
    name: "Pentateuch",
    description: "Genesis through Deuteronomy",
    books: [
      { name: "Genesis", chapters: 50 },
      { name: "Exodus", chapters: 40 },
      { name: "Leviticus", chapters: 27 },
      { name: "Numbers", chapters: 36 },
      { name: "Deuteronomy", chapters: 34 },
    ],
    cycleDays: 187,
    colorVar: "--track-green",
  },
  {
    id: 3,
    name: "Paul's Letters I",
    description: "Romans through Hebrews",
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
    cycleDays: 78,
    colorVar: "--track-red",
  },
  {
    id: 4,
    name: "Paul's Letters II",
    description: "Thessalonians through Revelation",
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
    cycleDays: 65,
    colorVar: "--track-purple",
  },
  {
    id: 5,
    name: "Wisdom",
    description: "Job, Ecclesiastes, Song of Solomon",
    books: [
      { name: "Job", chapters: 42 },
      { name: "Ecclesiastes", chapters: 12 },
      { name: "Song of Solomon", chapters: 8 },
    ],
    cycleDays: 62,
    colorVar: "--track-yellow",
  },
  {
    id: 6,
    name: "Psalms",
    description: "All 150 Psalms",
    books: [{ name: "Psalms", chapters: 150 }],
    cycleDays: 150,
    colorVar: "--track-pink",
  },
  {
    id: 7,
    name: "Proverbs",
    description: "A proverb for each day",
    books: [{ name: "Proverbs", chapters: 31 }],
    cycleDays: 31,
    colorVar: "--track-orange",
  },
  {
    id: 8,
    name: "History",
    description: "Joshua through Esther",
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
    cycleDays: 249,
    colorVar: "--track-teal",
  },
  {
    id: 9,
    name: "Prophets",
    description: "Isaiah through Malachi",
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
    cycleDays: 250,
    colorVar: "--track-indigo",
  },
  {
    id: 10,
    name: "Acts",
    description: "The Acts of the Apostles",
    books: [{ name: "Acts", chapters: 28 }],
    cycleDays: 28,
    colorVar: "--track-cyan",
  },
];

export interface TodayReading {
  listId: number;
  listName: string;
  book: string;
  chapter: number;
  colorVar: string;
  completed: boolean;
}

// Get today's reading based on how many chapters have been completed in each list so far
export function getTodaysReadings(
  listProgress: Record<number, number>, // map of listId to total chapters read historically
  completedTodayListIds: Set<number> // set of listIds completed *today*
): TodayReading[] {
  return readingLists.map((list) => {
    const totalChapters = list.books.reduce((sum, b) => sum + b.chapters, 0);
    
    // The total number of chapters read in this track ever.
    const historicalCompletions = listProgress[list.id] || 0;
    
    // If the list is marked complete today, the 'current chapter' is the one we just finished.
    // If it's NOT complete today, the 'current chapter' is the NEXT one to read.
    const isCompletedToday = completedTodayListIds.has(list.id);
    const targetChapterIndex = isCompletedToday ? historicalCompletions : historicalCompletions + 1;
    
    // Cycle math: 1-indexed position within the current cycle
    let dayInCycle = targetChapterIndex % totalChapters;
    if (dayInCycle === 0) dayInCycle = totalChapters; // 1-indexed

    let chapterCount = 0;
    for (const book of list.books) {
      if (chapterCount + book.chapters >= dayInCycle) {
        const chapter = dayInCycle - chapterCount;
        return {
          listId: list.id,
          listName: list.name,
          book: book.name,
          chapter,
          colorVar: list.colorVar,
          completed: isCompletedToday,
        };
      }
      chapterCount += book.chapters;
    }

    // Fallback
    return {
      listId: list.id,
      listName: list.name,
      book: list.books[0].name,
      chapter: 1,
      colorVar: list.colorVar,
      completed: false,
    };
  });
}

// Get day of year from a date
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Compute the "reading day" relative to the user's chosen start date.
 * Day 1 is the start date itself.  This is what determines which chapters
 * appear for today — it replaces the old `getDayOfYear` usage in the
 * reading logic so that changing the start date actually rotates the lists.
 */
export function getReadingDay(today: Date, startDateISO: string): number {
  const start = new Date(startDateISO);
  // Zero out times to avoid DST issues
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const b = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const diffMs = a.getTime() - b.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.floor(diffMs / oneDay) + 1);
}

// Format date for display - Apple style
export function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "short",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
}

// Format short date
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// Horner's System Facts
export const hornerFacts = [
  {
    title: "10 Lists Every Single Day",
    description: "You read 1 chapter from each of 10 distinct lists daily. In 1 year, you'll complete the Gospels 4 times, Paul's letters 4-5 times, Old Testament 1-2 times, and Proverbs 12 times.",
  },
  {
    title: "Never-Repeating Combinations",
    description: "Because list lengths range from 28 to 250 days, the daily combination of 10 chapters will never repeat for years, creating continuous cross-textual connections.",
  },
  {
    title: "High-Speed Pattern Recognition",
    description: "Professor Horner observed that reading across multiple biblical genres daily trains your subconscious mind to synthesize scripture, theology, and biblical themes automatically.",
  },
  {
    title: "25-30 Minutes Total Time",
    description: "Ten chapters sound overwhelming, but when read at a steady flow without studying or cross-referencing, the entire daily reading takes just 25 to 30 minutes.",
  },
  {
    title: "The 3-Year Mastery Effect",
    description: "After 3 years, you will have read over 10,000 chapters of scripture. You will know the location and flow of every book, narrative, and doctrine in the Bible.",
  },
];

// Authentic Grant Horner Reading Tips
export const readingTips = [
  {
    title: "Read for Flow, Not In-Depth Study",
    description: "Do not stop to consult commentaries or study Bibles during your 10 chapters. Read at a moderate, steady pace and let the narrative wash over you. Save deep study for a separate session."
  },
  {
    title: "Strictly No Catching Up",
    description: "If you miss a day, DO NOT attempt to read 20 chapters the next day. Simply resume where you left off. The system is a continuous loop designed for long-term consistency, not guilt."
  },
  {
    title: "Stick to One Main Translation per Cycle",
    description: "Use one primary translation (e.g., ESV, NASB, or KJV) for your entire reading cycle so linguistic phrasing and structural patterns imprint naturally in your memory."
  },
  {
    title: "Complete All 10 Chapters Daily",
    description: "Try to complete all 10 chapters in one or two sit-downs each day. Reading all 10 in a single day is what activates the rapid multi-track pattern recognition effect."
  },
  {
    title: "Build a Set Ritual",
    description: "Read at the same time each day (e.g. first thing in the morning with coffee). Habitual timing makes reading 10 chapters effortless and automatic."
  },
  {
    title: "Trust the Cumulative Process",
    description: "Don't worry if you don't remember everything you read today. The power of the Horner system is cumulative repetition over months and years."
  }
];