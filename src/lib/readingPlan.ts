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

// Get today's reading based on day number in year
export function getTodaysReadings(
  dayOfYear: number,
  completedReadings: Set<string>
): TodayReading[] {
  return readingLists.map((list) => {
    const totalChapters = list.books.reduce((sum, b) => sum + b.chapters, 0);
    const dayInCycle = ((dayOfYear - 1) % totalChapters) + 1;

    let chapterCount = 0;
    for (const book of list.books) {
      if (chapterCount + book.chapters >= dayInCycle) {
        const chapter = dayInCycle - chapterCount;
        const readingKey = `${dayOfYear}-${list.id}`;
        return {
          listId: list.id,
          listName: list.name,
          book: book.name,
          chapter,
          colorVar: list.colorVar,
          completed: completedReadings.has(readingKey),
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
    title: "Never the Same Combination",
    description: "Due to the varying cycle lengths (28-250 days), the daily combination of 10 chapters won't repeat for many years, ensuring fresh insights each day.",
  },
  {
    title: "Read the Entire Bible",
    description: "With this system, you'll read the Gospels and Acts 4 times a year, the Epistles twice, and complete the entire Old Testament annually.",
  },
  {
    title: "Pattern Recognition",
    description: "By reading from multiple sections daily, you'll begin to see connections between books, themes, and passages you never noticed before.",
  },
  {
    title: "20-30 Minutes Daily",
    description: "Ten chapters sounds like a lot, but most chapters are brief. The average reading takes just 20-30 minutes of focused time.",
  },
  {
    title: "Compound Effect",
    description: "Professor Horner observed that after 3-4 years, readers develop an intuitive understanding of Scripture that transforms their spiritual life.",
  },
];

// Reading Tips
export const readingTips = [
  "Read at the same time each day to build a lasting habit.",
  "Don't worry about perfect comprehension—let Scripture wash over you.",
  "If you miss a day, simply continue where you left off.",
  "Consider reading aloud to engage more of your senses.",
  "Keep a simple journal to note recurring themes you observe.",
  "The goal is consistency, not speed. Take your time.",
];