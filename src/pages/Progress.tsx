import { useMemo } from "react";
import { BottomNav } from "@/components/BottomNav";
import { ListProgressCard } from "@/components/ListProgressCard";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { readingLists, getDayOfYear } from "@/lib/readingPlan";
import { BookOpen, Award, Target } from "lucide-react";

const Progress = () => {
  const { completedSet, totalChaptersRead } = useReadingProgress();
  const dayOfYear = getDayOfYear(new Date());

  // Calculate progress for each list
  const listProgress = useMemo(() => {
    return readingLists.map((list) => {
      const totalChapters = list.books.reduce((sum, b) => sum + b.chapters, 0);
      const dayInCycle = ((dayOfYear - 1) % totalChapters) + 1;
      
      // Count completed chapters in current cycle
      const completedInCycle = Array.from(completedSet).filter((key) => {
        const [dayStr, listIdStr] = key.split("-");
        const day = parseInt(dayStr);
        const listId = parseInt(listIdStr);
        
        if (listId !== list.id) return false;
        
        // Check if this day is in the current cycle
        const cycleStart = dayOfYear - dayInCycle + 1;
        return day >= cycleStart && day <= dayOfYear;
      }).length;

      const cycleProgress = (completedInCycle / totalChapters) * 100;
      const timesCompleted = Math.floor(
        Array.from(completedSet).filter((k) => k.endsWith(`-${list.id}`)).length /
          totalChapters
      );

      // Get current book and chapter
      let chapterCount = 0;
      let currentBook = list.books[0].name;
      let currentChapter = 1;
      
      for (const book of list.books) {
        if (chapterCount + book.chapters >= dayInCycle) {
          currentBook = book.name;
          currentChapter = dayInCycle - chapterCount;
          break;
        }
        chapterCount += book.chapters;
      }

      return {
        list,
        cycleProgress: Math.min(100, cycleProgress),
        timesCompleted,
        currentBook,
        currentChapter,
      };
    });
  }, [completedSet, dayOfYear]);

  // Overall stats
  const totalCycleProgress = useMemo(() => {
    const total = listProgress.reduce((sum, p) => sum + p.cycleProgress, 0);
    return total / listProgress.length;
  }, [listProgress]);

  const totalCompletedCycles = useMemo(() => {
    return listProgress.reduce((sum, p) => sum + p.timesCompleted, 0);
  }, [listProgress]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto px-6 h-16 flex items-center">
          <h1 className="text-xl font-semibold font-serif text-foreground">
            Reading Progress
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-card rounded-2xl p-4 border border-border text-center">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {totalChaptersRead}
            </p>
            <p className="text-xs text-muted-foreground">Chapters Read</p>
          </div>
          
          <div className="bg-card rounded-2xl p-4 border border-border text-center">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-2">
              <Target className="w-5 h-5 text-accent-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {Math.round(totalCycleProgress)}%
            </p>
            <p className="text-xs text-muted-foreground">Avg Progress</p>
          </div>
          
          <div className="bg-card rounded-2xl p-4 border border-border text-center">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-2">
              <Award className="w-5 h-5 text-success" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {totalCompletedCycles}
            </p>
            <p className="text-xs text-muted-foreground">Cycles Done</p>
          </div>
        </div>

        {/* List Progress */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold font-serif text-foreground mb-1">
            Reading Lists
          </h2>
          <p className="text-sm text-muted-foreground">
            Track your progress through each list
          </p>
        </div>

        <div className="space-y-3">
          {listProgress.map(
            ({ list, cycleProgress, timesCompleted, currentBook, currentChapter }, index) => (
              <div
                key={list.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ListProgressCard
                  list={list}
                  cycleProgress={cycleProgress}
                  timesCompleted={timesCompleted}
                  currentBook={currentBook}
                  currentChapter={currentChapter}
                />
              </div>
            )
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Progress;
