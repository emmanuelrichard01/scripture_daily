import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { ListProgressCard } from "@/components/ListProgressCard";
import { useCloudProgress } from "@/hooks/useCloudProgress";
import { readingLists } from "@/lib/readingPlan";
import { BookOpen, Award, Target, ChevronRight } from "lucide-react";

const Progress = () => {
  const { listProgress, totalChaptersRead } = useCloudProgress();

  // Calculate progress for each list
  const listProgressData = useMemo(() => {
    return readingLists.map((list) => {
      const totalChapters = list.books.reduce((sum, b) => sum + b.chapters, 0);
      const totalCompletedForList = listProgress[list.id] || 0;
      
      const completedInCycle = totalCompletedForList % totalChapters;
      const cycleProgress = (completedInCycle / totalChapters) * 100;
      const timesCompleted = Math.floor(totalCompletedForList / totalChapters);

      // Get current book and chapter
      let chapterCount = 0;
      let currentBook = list.books[0].name;
      let currentChapter = 1;

      // The next chapter to read is completedInCycle + 1
      const targetChapterIndex = completedInCycle + 1;

      for (const book of list.books) {
        if (chapterCount + book.chapters >= targetChapterIndex) {
          currentBook = book.name;
          currentChapter = targetChapterIndex - chapterCount;
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
  }, [listProgress]);

  // Overall stats
  const totalCycleProgress = useMemo(() => {
    const total = listProgressData.reduce((sum, p) => sum + p.cycleProgress, 0);
    return total / listProgressData.length;
  }, [listProgressData]);

  const totalCompletedCycles = useMemo(() => {
    return listProgressData.reduce((sum, p) => sum + p.timesCompleted, 0);
  }, [listProgressData]);

  return (
    <div className="min-h-dvh bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-5 h-16 flex items-center">
          <h1 className="text-xl font-semibold font-serif text-foreground">
            Reading Progress
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2.5 mb-8">
          <div className="bg-card rounded-2xl p-4 border border-border text-center">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {totalChaptersRead}
            </p>
            <p className="text-[11px] text-muted-foreground font-medium">Chapters</p>
          </div>

          <div className="bg-card rounded-2xl p-4 border border-border text-center">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center mx-auto mb-2">
              <Target className="w-5 h-5 text-accent-foreground" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {Math.round(totalCycleProgress)}%
            </p>
            <p className="text-[11px] text-muted-foreground font-medium">Avg Progress</p>
          </div>

          <div className="bg-card rounded-2xl p-4 border border-border text-center">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-2">
              <Award className="w-5 h-5 text-success" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {totalCompletedCycles}
            </p>
            <p className="text-[11px] text-muted-foreground font-medium">Cycles Done</p>
          </div>
        </div>

        {/* View all lists link */}
        <Link
          to="/lists"
          className="flex items-center justify-between bg-primary/5 hover:bg-primary/10 rounded-xl px-4 py-3 mb-6 transition-colors group"
        >
          <span className="text-sm font-medium text-foreground">
            View all books & chapters
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        </Link>

        {/* List Progress */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold font-serif text-foreground mb-1">
            Reading Lists
          </h2>
          <p className="text-sm text-muted-foreground">
            Track your progress through each list
          </p>
        </div>

        <div className="space-y-2.5">
          {listProgressData.map(
            ({ list, cycleProgress, timesCompleted, currentBook, currentChapter }, index) => (
              <Link
                to="/lists"
                key={list.id}
                className="block animate-slide-up"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <ListProgressCard
                  list={list}
                  cycleProgress={cycleProgress}
                  timesCompleted={timesCompleted}
                  currentBook={currentBook}
                  currentChapter={currentChapter}
                />
              </Link>
            )
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Progress;
