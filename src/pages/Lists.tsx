import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { useProgress } from "@/hooks/useProgress";
import { useFeedback } from "@/hooks/useFeedback";
import { chapterAtPosition, getList, CHAPTERS_PER_DAY } from "@/lib/readingPlan";
import { todayISO } from "@/lib/date";
import { cn, pluralize } from "@/lib/utils";

/**
 * The chapter grid for one book.
 *
 * Extracted so grids only mount for the open list. Rendering every list at once
 * means 1,189 cells — the Prophets list alone is 250 — which made scrolling
 * janky on a phone even though only one list is readable at a time.
 */
function ChapterGrid({
  chapterCount,
  currentChapter,
  isCurrentBook,
  isDoneToday,
  bookName,
  accent,
  onMarkRead,
}: {
  chapterCount: number;
  currentChapter: number;
  isCurrentBook: boolean;
  isDoneToday: boolean;
  bookName: string;
  accent: string;
  onMarkRead: () => void;
}) {
  return (
    <div className="grid grid-cols-10 gap-1">
      {Array.from({ length: chapterCount }, (_, index) => index + 1).map((chapter) => {
        const isCurrent = isCurrentBook && chapter === currentChapter;
        const isRead = isCurrentBook && chapter < currentChapter;

        if (!isCurrent) {
          // Static cell, not a button. Hundreds of disabled buttons made
          // keyboard and screen-reader traversal of this page unusable.
          return (
            <span
              key={chapter}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md text-[10px] font-semibold tabular-nums",
                isRead ? "text-white" : "bg-secondary/60 text-muted-foreground/50",
              )}
              style={isRead ? { backgroundColor: accent, opacity: 0.55 } : undefined}
            >
              {chapter}
            </span>
          );
        }

        return (
          <button
            key={chapter}
            type="button"
            onClick={onMarkRead}
            aria-pressed={isDoneToday}
            aria-label={`${isDoneToday ? "Unmark" : "Mark"} ${bookName} chapter ${chapter} as read`}
            className={cn(
              "relative z-10 flex aspect-square scale-110 items-center justify-center rounded-md text-[10px] font-bold tabular-nums shadow-md transition-transform hover:scale-125 active:scale-105 focus-ring",
              isDoneToday
                ? "bg-success text-success-foreground"
                : "bg-foreground text-background",
            )}
          >
            {isDoneToday ? <Check className="h-3 w-3" aria-hidden="true" /> : chapter}
          </button>
        );
      })}
    </div>
  );
}

export default function Lists() {
  const { listPositions, completedTodayListIds, toggleReading } = useProgress();
  const feedback = useFeedback();
  const [openListId, setOpenListId] = useState<number | null>(null);

  const today = todayISO();

  const handleMarkRead = (listId: number) => {
    if (!completedTodayListIds.has(listId)) {
      if (completedTodayListIds.size === CHAPTERS_PER_DAY - 1) feedback.dayComplete();
      else feedback.chapterComplete();
    }
    toggleReading(today, listId);
  };

  return (
    <PageLayout
      title="Reading lists"
      showBack
      description="Every chapter in the plan. Your bookmark in each list moves only when you mark a reading complete."
    >
      <ul className="space-y-2.5">
        {listPositions.map((position, index) => {
          const list = getList(position.listId);
          if (!list) return null;

          const isOpen = openListId === list.id;
          const isDoneToday = completedTodayListIds.has(list.id);
          const accent = `hsl(var(${list.colorVar}))`;

          // When done today the bookmark has already advanced; step back so the
          // grid highlights the chapter that was actually read.
          const shown = isDoneToday
            ? chapterAtPosition(list, position.completedChapters)
            : position.nextChapter;

          return (
            <li
              key={list.id}
              className="animate-rise"
              style={{ animationDelay: `${index * 25}ms` }}
            >
              <div
                className={cn(
                  "overflow-hidden rounded-2xl border bg-card transition-shadow",
                  isOpen ? "border-border shadow-md" : "border-border/60 shadow-sm",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenListId(isOpen ? null : list.id)}
                  aria-expanded={isOpen}
                  aria-controls={`list-panel-${list.id}`}
                  className="flex w-full items-center gap-3.5 p-4 text-left focus-ring"
                >
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
                    style={{ backgroundColor: accent }}
                    aria-hidden="true"
                  >
                    {list.id}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-display text-base font-semibold">
                        {list.name}
                      </span>
                      {isDoneToday && (
                        <span
                          className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground"
                          aria-label="Read today"
                        >
                          <Check className="h-2.5 w-2.5" strokeWidth={3.5} aria-hidden="true" />
                        </span>
                      )}
                    </span>

                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      Next: {shown.book} {shown.chapter}
                      <span aria-hidden="true"> · </span>
                      {position.completedCycles}{" "}
                      {pluralize(position.completedCycles, "cycle")} done
                    </span>

                    <span
                      className="mt-2.5 block h-1 overflow-hidden rounded-full bg-secondary"
                      role="progressbar"
                      aria-valuenow={position.progressPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${list.name} cycle progress`}
                    >
                      <span
                        className="block h-full rounded-full transition-[width] duration-700 ease-out-expo"
                        style={{
                          width: `${position.progressPercent}%`,
                          backgroundColor: accent,
                        }}
                      />
                    </span>
                  </span>

                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>

                {isOpen && (
                  <div
                    id={`list-panel-${list.id}`}
                    className="animate-accordion-down border-t border-border/60 px-4 pb-4 pt-4"
                  >
                    <div className="mb-4 flex items-baseline justify-between gap-3 rounded-xl bg-secondary/50 px-3.5 py-3">
                      <span className="text-xs font-semibold">
                        Cycle {position.completedCycles + 1}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {position.totalChapters - position.chaptersIntoCycle}{" "}
                        {pluralize(
                          position.totalChapters - position.chaptersIntoCycle,
                          "chapter",
                        )}{" "}
                        left
                      </span>
                    </div>

                    {list.books.map((book, bookIndex) => (
                      <div key={book.name} className="mb-4 last:mb-0">
                        <div className="mb-2 flex items-baseline justify-between gap-2">
                          <span
                            className={cn(
                              "text-xs font-bold",
                              bookIndex === shown.bookIndex
                                ? "text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {book.name}
                          </span>
                          <span className="text-2xs tabular-nums text-muted-foreground">
                            {book.chapters}
                          </span>
                        </div>

                        <ChapterGrid
                          chapterCount={book.chapters}
                          currentChapter={shown.chapter}
                          isCurrentBook={bookIndex === shown.bookIndex}
                          isDoneToday={isDoneToday}
                          bookName={book.name}
                          accent={accent}
                          onMarkRead={() => handleMarkRead(list.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </PageLayout>
  );
}
