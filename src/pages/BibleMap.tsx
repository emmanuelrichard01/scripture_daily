import { useMemo, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { useProgress } from "@/hooks/useProgress";
import { readingLists, TOTAL_PLAN_CHAPTERS } from "@/lib/readingPlan";
import { cn, pluralize } from "@/lib/utils";

interface BookMapInfo {
  name: string;
  chapters: number;
  listId: number;
  listName: string;
  colorVar: string;
  testament: "OT" | "NT";
}

// Compile all 66 books from the 10 Horner lists
const ALL_BOOKS: BookMapInfo[] = readingLists.flatMap((list) =>
  list.books.map((book) => ({
    name: book.name,
    chapters: book.chapters,
    listId: list.id,
    listName: list.name,
    colorVar: list.colorVar,
    testament: [1, 2, 3, 4, 5, 6, 7].includes(list.id) ? ("OT" as const) : ("NT" as const),
  })),
);

export default function BibleMap() {
  const { listPositions, totalChaptersRead } = useProgress();
  const [filterTestament, setFilterTestament] = useState<"ALL" | "OT" | "NT">("ALL");
  const [selectedListId, setSelectedListId] = useState<number | "ALL">("ALL");
  const [expandedBook, setExpandedBook] = useState<string | null>(null);

  // Position per list allows us to determine what's been read in current/past cycles
  const positionMap = useMemo(
    () => new Map(listPositions.map((pos) => [pos.listId, pos])),
    [listPositions],
  );

  const filteredBooks = useMemo(() => {
    return ALL_BOOKS.filter((book) => {
      if (filterTestament !== "ALL" && book.testament !== filterTestament) return false;
      if (selectedListId !== "ALL" && book.listId !== selectedListId) return false;
      return true;
    });
  }, [filterTestament, selectedListId]);

  // Calculate distinct chapters read
  const stats = useMemo(() => {
    let distinctRead = 0;
    for (const pos of listPositions) {
      if (pos.completedCycles > 0) {
        distinctRead += pos.totalChapters;
      } else {
        distinctRead += pos.chaptersIntoCycle;
      }
    }
    const percent = Math.min(100, Math.round((distinctRead / TOTAL_PLAN_CHAPTERS) * 100));
    return { distinctRead, percent };
  }, [listPositions]);

  return (
    <PageLayout
      title="Bible Coverage Map"
      showBack
      description="Visual heat map of all 1,189 chapters across the 66 books of the Bible."
    >
      {/* ── Headline Coverage Card ── */}
      <section
        aria-label="Bible Coverage Summary"
        className="surface-raised relative mb-6 overflow-hidden p-6"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/15 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-2xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Total Bible Coverage
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {stats.percent}%
            </span>
          </div>

          <p className="stat-display text-4xl leading-none">
            {stats.distinctRead.toLocaleString()}{" "}
            <span className="text-base font-medium text-muted-foreground">
              / {TOTAL_PLAN_CHAPTERS.toLocaleString()} chapters
            </span>
          </p>

          <div
            className="mt-4 h-2.5 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuenow={stats.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Bible coverage percentage"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out-expo"
              style={{ width: `${stats.percent}%` }}
            />
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {totalChaptersRead.toLocaleString()} total reading sessions recorded across all cycles.
          </p>
        </div>
      </section>

      {/* ── Filters ── */}
      <div className="mb-5 space-y-2.5">
        {/* Testament toggle */}
        <div className="flex rounded-xl bg-secondary p-1">
          {(["ALL", "OT", "NT"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setFilterTestament(opt)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-xs font-bold transition-all focus-ring",
                filterTestament === opt
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt === "ALL" ? "All Books" : opt === "OT" ? "Old Testament (39)" : "New Testament (27)"}
            </button>
          ))}
        </div>

        {/* List pill filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedListId("ALL")}
            className={cn(
              "shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors focus-ring",
              selectedListId === "ALL"
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            All Lists
          </button>
          {readingLists.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setSelectedListId(l.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors focus-ring",
                selectedListId === l.id
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: `hsl(var(${l.colorVar}))` }}
                aria-hidden="true"
              />
              {l.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Books Grid ── */}
      <div className="space-y-2.5">
        {filteredBooks.map((book) => {
          const listPos = positionMap.get(book.listId);
          const isExpanded = expandedBook === book.name;
          const accent = `hsl(var(${book.colorVar}))`;

          // Check how many chapters into this book the reader has read
          const chaptersCompleted =
            (listPos?.completedCycles ?? 0) > 0
              ? book.chapters
              : Math.min(book.chapters, listPos?.chaptersIntoCycle ?? 0);

          const bookPercent = Math.round((chaptersCompleted / book.chapters) * 100);

          return (
            <div
              key={book.name}
              className="surface overflow-hidden rounded-2xl transition-all"
            >
              <button
                type="button"
                onClick={() => setExpandedBook(isExpanded ? null : book.name)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left focus-ring"
                aria-expanded={isExpanded}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-xs"
                    style={{ backgroundColor: accent }}
                  >
                    {book.listId}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-sm font-bold text-foreground">
                      {book.name}
                    </h3>
                    <p className="text-2xs font-semibold text-muted-foreground">
                      {book.chapters} {pluralize(book.chapters, "chapter")} · {book.listName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs font-bold tabular-nums text-muted-foreground">
                    {bookPercent}%
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform duration-200",
                      isExpanded && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </div>
              </button>

              {/* Progress bar across bottom of card header */}
              <div
                className="h-1 w-full bg-secondary"
                role="progressbar"
                aria-valuenow={bookPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full transition-[width] duration-500 ease-out-expo"
                  style={{ width: `${bookPercent}%`, backgroundColor: accent }}
                />
              </div>

              {isExpanded && (
                <div className="animate-accordion-down border-t border-border/50 p-4">
                  <p className="mb-2 text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                    Chapter Grid ({chaptersCompleted}/{book.chapters} read)
                  </p>
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
                    {Array.from({ length: book.chapters }, (_, i) => i + 1).map((chNum) => {
                      const isDone = chNum <= chaptersCompleted;
                      return (
                        <div
                          key={chNum}
                          className={cn(
                            "flex aspect-square min-h-[28px] items-center justify-center rounded-lg text-[10px] font-bold tabular-nums transition-colors",
                            isDone
                              ? "text-white shadow-xs"
                              : "bg-secondary/60 text-muted-foreground/50",
                          )}
                          style={isDone ? { backgroundColor: accent } : undefined}
                          title={`${book.name} Chapter ${chNum} - ${isDone ? "Read" : "Unread"}`}
                        >
                          {chNum}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageLayout>
  );
}
