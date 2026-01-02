import { useState, useMemo } from "react";
import { BottomNav } from "@/components/BottomNav";
import { useCloudProgress } from "@/hooks/useCloudProgress";
import { readingLists, getDayOfYear } from "@/lib/readingPlan";
import { ChevronDown, ChevronRight, Check, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const Lists = () => {
  const { completedSet, toggleComplete } = useCloudProgress();
  const dayOfYear = getDayOfYear(new Date());
  const [expandedLists, setExpandedLists] = useState<Set<number>>(new Set());

  const toggleList = (listId: number) => {
    setExpandedLists((prev) => {
      const next = new Set(prev);
      if (next.has(listId)) {
        next.delete(listId);
      } else {
        next.add(listId);
      }
      return next;
    });
  };

  // Calculate which chapters are completed for each list
  const listData = useMemo(() => {
    return readingLists.map((list) => {
      const totalChapters = list.books.reduce((sum, b) => sum + b.chapters, 0);
      const dayInCycle = ((dayOfYear - 1) % totalChapters) + 1;

      // Get current book and chapter
      let chapterCount = 0;
      let currentBookIndex = 0;
      let currentChapterInBook = 1;

      for (let i = 0; i < list.books.length; i++) {
        if (chapterCount + list.books[i].chapters >= dayInCycle) {
          currentBookIndex = i;
          currentChapterInBook = dayInCycle - chapterCount;
          break;
        }
        chapterCount += list.books[i].chapters;
      }

      // Calculate completed chapters across all days for this list
      const completedDays = Array.from(completedSet)
        .filter((key) => key.endsWith(`-${list.id}`))
        .map((key) => parseInt(key.split("-")[0]));

      const isTodayComplete = completedSet.has(`${dayOfYear}-${list.id}`);

      return {
        list,
        currentBookIndex,
        currentChapterInBook,
        completedDays,
        isTodayComplete,
        totalChapters,
      };
    });
  }, [completedSet, dayOfYear]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-6 h-16 flex items-center">
          <h1 className="text-xl font-semibold font-serif text-foreground">
            Reading Lists
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-6">
        <p className="text-sm text-muted-foreground mb-6">
          Explore all 10 reading lists. Tap a list to see books and chapters.
        </p>

        <div className="space-y-3">
          {listData.map(
            ({
              list,
              currentBookIndex,
              currentChapterInBook,
              completedDays,
              isTodayComplete,
            }) => {
              const isExpanded = expandedLists.has(list.id);

              return (
                <Collapsible
                  key={list.id}
                  open={isExpanded}
                  onOpenChange={() => toggleList(list.id)}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "w-full bg-card rounded-2xl p-4 border transition-all duration-200 text-left",
                        isExpanded
                          ? "border-primary/30 shadow-md"
                          : "border-border hover:border-primary/20 hover:shadow-sm"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        {/* Color indicator */}
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                          style={{ backgroundColor: list.color }}
                        >
                          {list.id}
                        </div>

                        {/* List info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">
                              {list.name}
                            </h3>
                            {isTodayComplete && (
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-success text-success-foreground">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {list.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {list.cycleDays} chapters · {list.books.length} book
                            {list.books.length > 1 ? "s" : ""}
                          </p>
                        </div>

                        {/* Expand indicator */}
                        <div className="text-muted-foreground">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </div>
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    <div className="pt-2 pb-1 px-1">
                      {list.books.map((book, bookIndex) => {
                        const isCurrentBook = bookIndex === currentBookIndex;

                        return (
                          <div key={book.name} className="mb-4">
                            {/* Book header */}
                            <div
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg mb-2",
                                isCurrentBook
                                  ? "bg-primary/10"
                                  : "bg-secondary/50"
                              )}
                            >
                              <BookOpen
                                className={cn(
                                  "w-4 h-4",
                                  isCurrentBook
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                )}
                              />
                              <span
                                className={cn(
                                  "font-medium text-sm",
                                  isCurrentBook
                                    ? "text-primary"
                                    : "text-foreground"
                                )}
                              >
                                {book.name}
                              </span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {book.chapters} chapters
                              </span>
                            </div>

                            {/* Chapters grid */}
                            <div className="grid grid-cols-8 gap-1.5 px-2">
                              {Array.from(
                                { length: book.chapters },
                                (_, i) => i + 1
                              ).map((chapter) => {
                                const isCurrentChapter =
                                  isCurrentBook &&
                                  chapter === currentChapterInBook;

                                return (
                                  <button
                                    key={chapter}
                                    className={cn(
                                      "aspect-square rounded-md text-xs font-medium flex items-center justify-center transition-all duration-150",
                                      isCurrentChapter
                                        ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                                        : "bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground"
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isCurrentChapter) {
                                        toggleComplete(dayOfYear, list.id);
                                      }
                                    }}
                                    disabled={!isCurrentChapter}
                                    title={
                                      isCurrentChapter
                                        ? "Today's reading - tap to toggle"
                                        : `${book.name} ${chapter}`
                                    }
                                  >
                                    {chapter}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            }
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Lists;
