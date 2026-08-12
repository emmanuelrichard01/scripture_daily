import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { useCloudProgress } from "@/hooks/useCloudProgress";
import { readingLists } from "@/lib/readingPlan";
import { ChevronDown, Check, Trophy, ArrowLeft } from "lucide-react";
import { cn, pluralize } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { motion, AnimatePresence } from "framer-motion";
import { useAudio } from "@/hooks/useAudio";
import { useHaptics } from "@/hooks/useHaptics";

export function Lists() {
  const navigate = useNavigate();
  const { listProgress, completedTodayListIds, toggleComplete } = useCloudProgress();
  const [expandedLists, setExpandedLists] = useState<Set<number>>(new Set());
  const { playBloop, playTada } = useAudio();
  const { triggerHaptic } = useHaptics();

  const getTodayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const todayIso = getTodayISO();

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

  // Calculate which chapters are completed for each list based on historical completions
  const listData = useMemo(() => {
    return readingLists.map((list) => {
      const totalChapters = list.books.reduce((sum, b) => sum + b.chapters, 0);
      
      const totalCompletedInList = listProgress[list.id] || 0;
      const isTodayComplete = completedTodayListIds.has(list.id);
      
      // Target chapter is the one we are on right now. 
      // If we finished today, the target is what we just finished. 
      // If we haven't finished today, the target is the NEXT chapter to read.
      const targetChapterIndex = isTodayComplete ? totalCompletedInList : totalCompletedInList + 1;
      
      let dayInCycle = targetChapterIndex % totalChapters;
      if (dayInCycle === 0) dayInCycle = totalChapters; // 1-indexed

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

      const completedCycles = Math.floor(totalCompletedInList / totalChapters);
      const progressInCycle = totalCompletedInList % totalChapters;

      return {
        list,
        currentBookIndex,
        currentChapterInBook,
        isTodayComplete,
        totalChapters,
        completedCycles,
        progressInCycle,
        totalCompletedInList,
      };
    });
  }, [listProgress, completedTodayListIds]);

  return (
    <div className="min-h-dvh bg-background pb-[88px]">
      <Header 
        left={
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-xl tap-target flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" aria-hidden="true" />
            </button>
            <h1 className="text-xl font-heading font-semibold text-foreground">Reading Tracks</h1>
          </div>
        }
        right={
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            10 Lists
          </span>
        }
      />

      <main className="max-w-lg mx-auto px-5 py-6">
        <p className="text-sm font-medium text-muted-foreground mb-6">
          Explore all 10 reading lists in Professor Horner's system. Your bookmarks only move when you complete a reading.
        </p>

        <div className="space-y-3">
          {listData.map(
            ({
              list,
              currentBookIndex,
              currentChapterInBook,
              isTodayComplete,
              totalChapters,
              completedCycles,
              progressInCycle,
            }) => {
              const isExpanded = expandedLists.has(list.id);
              const progressPercent = Math.round((progressInCycle / totalChapters) * 100);

              return (
                <Collapsible
                  key={list.id}
                  open={isExpanded}
                  onOpenChange={() => toggleList(list.id)}
                >
                  <CollapsibleTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        "w-full bg-card rounded-2xl p-4 border text-left focus-ring relative overflow-hidden transition-shadow",
                        isExpanded
                          ? "border-border shadow-md"
                          : "border-border/60 shadow-sm hover:shadow-md"
                      )}
                      aria-expanded={isExpanded}
                      aria-controls={`list-content-${list.id}`}
                    >
                      {/* Active indicator border */}
                      <div
                        className={cn(
                          "absolute left-0 top-0 bottom-0 w-1 transition-all duration-300",
                          isExpanded ? "opacity-100" : "opacity-0"
                        )}
                        style={{ backgroundColor: `hsl(var(${list.colorVar}))` }}
                        aria-hidden="true"
                      />

                      <div className="flex items-center gap-4">
                        {/* List Number Badge */}
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm"
                          style={{ 
                            backgroundColor: `hsl(var(${list.colorVar}))`,
                            color: "hsl(var(--primary-foreground))"
                          }}
                          aria-hidden="true"
                        >
                          {list.id}
                        </div>

                        {/* List info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-base text-foreground tracking-tight">
                              {list.name}
                            </h3>
                            {isTodayComplete && (
                              <span 
                                className="flex items-center justify-center w-5 h-5 rounded-full bg-success text-success-foreground shadow-sm"
                                aria-label="Completed today"
                              >
                                <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" />
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <p className="text-xs font-medium text-muted-foreground">
                              {list.books.length} {pluralize(list.books.length, "book")}
                            </p>
                            <div className="w-1 h-1 rounded-full bg-border" aria-hidden="true" />
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <Trophy className="w-3 h-3" aria-hidden="true" />
                              <span aria-label={`${completedCycles} cycles completed`}>
                                {completedCycles} {pluralize(completedCycles, "cycle")}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Expand indicator */}
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="text-muted-foreground p-1"
                          aria-hidden="true"
                        >
                          <ChevronDown className="w-5 h-5" />
                        </motion.div>
                      </div>

                      {/* Mini progress bar when collapsed */}
                      <AnimatePresence>
                        {!isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4"
                            aria-hidden="true"
                          >
                            <div className="h-1 bg-secondary rounded-full overflow-hidden w-full max-w-[200px] ml-15">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${progressPercent}%`,
                                  backgroundColor: `hsl(var(${list.colorVar}))`,
                                }}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </CollapsibleTrigger>

                  <CollapsibleContent id={`list-content-${list.id}`} className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                    <div className="pt-3 pb-2 px-1">
                      
                      {/* Cycle Stats Banner */}
                      <div className="mb-4 p-4 rounded-xl bg-secondary/50 border border-border/50">
                        <div className="flex justify-between items-end mb-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Cycle Progress
                          </p>
                          <span className="text-sm font-bold text-foreground" aria-label={`${progressPercent} percent complete`}>
                            {progressPercent}%
                          </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden shadow-inner" aria-hidden="true">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full rounded-full shadow-sm"
                            style={{ backgroundColor: `hsl(var(${list.colorVar}))` }}
                          />
                        </div>
                        <p className="text-xs font-medium text-muted-foreground mt-2">
                          {totalChapters - progressInCycle} {pluralize(totalChapters - progressInCycle, "chapter")} remaining until Cycle {completedCycles + 2}
                        </p>
                      </div>

                      {list.books.map((book, bookIndex) => {
                        const isCurrentBook = bookIndex === currentBookIndex;

                        return (
                          <div key={book.name} className="mb-5">
                            {/* Book header */}
                            <div
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-xl mb-3",
                                isCurrentBook
                                  ? "bg-secondary border border-border/50"
                                  : "bg-transparent"
                              )}
                            >
                              <BookOpen
                                className={cn(
                                  "w-4 h-4",
                                  isCurrentBook
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                                )}
                                aria-hidden="true"
                              />
                              <span
                                className={cn(
                                  "font-bold text-sm tracking-tight",
                                  isCurrentBook
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                                )}
                              >
                                {book.name}
                              </span>
                              <span className="text-xs font-medium text-muted-foreground ml-auto">
                                {book.chapters} ch.
                              </span>
                            </div>

                            {/* Chapters grid */}
                            <div className="grid grid-cols-8 gap-2 px-1">
                              {Array.from(
                                { length: book.chapters },
                                (_, i) => i + 1
                              ).map((chapter) => {
                                const isCurrentChapter = isCurrentBook && chapter === currentChapterInBook;
                                // In the true Horner system, any chapter before the current bookmark in the same book is "read"
                                // Also any book before the current book in the cycle is "read"
                                const isChapterReadInCycle = bookIndex < currentBookIndex || (isCurrentBook && chapter < currentChapterInBook);

                                return (
                                  <button
                                    key={chapter}
                                    className={cn(
                                      "aspect-square min-h-[36px] rounded-lg text-xs font-bold flex items-center justify-center transition-all duration-200 focus-ring relative overflow-hidden",
                                      isCurrentChapter
                                        ? "bg-foreground text-background shadow-md transform scale-110 z-10"
                                        : isChapterReadInCycle
                                        ? "bg-success/15 text-success/80 border border-success/20"
                                        : "bg-secondary/70 text-foreground/50 hover:bg-secondary border border-transparent"
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isCurrentChapter) {
                                        triggerHaptic("medium");
                                        if (!isTodayComplete) {
                                          playBloop();
                                          if (completedTodayListIds.size === 9) {
                                            setTimeout(playTada, 300);
                                          }
                                        }
                                        toggleComplete(todayIso, list.id);
                                      }
                                    }}
                                    disabled={!isCurrentChapter}
                                    aria-label={
                                      isCurrentChapter
                                        ? `Today's reading: ${book.name} chapter ${chapter}`
                                        : `${book.name} chapter ${chapter}`
                                    }
                                  >
                                    {isCurrentChapter && isTodayComplete ? (
                                      <Check className="w-4 h-4" aria-hidden="true" />
                                    ) : (
                                      chapter
                                    )}
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