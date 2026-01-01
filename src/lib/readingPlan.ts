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
  color: string;
}

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
    color: "hsl(235 45% 30%)",
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
    color: "hsl(150 45% 40%)",
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
    color: "hsl(200 50% 45%)",
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
    color: "hsl(280 40% 50%)",
  },
  {
    id: 5,
    name: "Wisdom Literature",
    description: "Job, Ecclesiastes, Song of Solomon",
    books: [
      { name: "Job", chapters: 42 },
      { name: "Ecclesiastes", chapters: 12 },
      { name: "Song of Solomon", chapters: 8 },
    ],
    cycleDays: 62,
    color: "hsl(40 85% 50%)",
  },
  {
    id: 6,
    name: "Psalms",
    description: "All 150 Psalms",
    books: [{ name: "Psalms", chapters: 150 }],
    cycleDays: 150,
    color: "hsl(340 50% 50%)",
  },
  {
    id: 7,
    name: "Proverbs",
    description: "A proverb for each day",
    books: [{ name: "Proverbs", chapters: 31 }],
    cycleDays: 31,
    color: "hsl(20 70% 50%)",
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
    color: "hsl(100 40% 45%)",
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
    color: "hsl(260 45% 55%)",
  },
  {
    id: 10,
    name: "Acts",
    description: "The Acts of the Apostles",
    books: [{ name: "Acts", chapters: 28 }],
    cycleDays: 28,
    color: "hsl(180 45% 45%)",
  },
];

export interface TodayReading {
  listId: number;
  listName: string;
  book: string;
  chapter: number;
  color: string;
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
          color: list.color,
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
      color: list.color,
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

// Format date for display
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
