import { ReadingList } from "@/lib/readingPlan";
import { ProgressRing } from "./ProgressRing";
import { ChevronRight } from "lucide-react";

interface ListProgressCardProps {
  list: ReadingList;
  cycleProgress: number; // 0-100
  timesCompleted: number;
  currentBook: string;
  currentChapter: number;
}

export function ListProgressCard({
  list,
  cycleProgress,
  timesCompleted,
  currentBook,
  currentChapter,
}: ListProgressCardProps) {
  return (
    <div className="group bg-card rounded-2xl p-4 border border-border hover:shadow-elegant transition-all duration-300 hover-lift">
      <div className="flex items-center gap-4">
        {/* Progress Ring */}
        <div className="relative">
          <ProgressRing progress={cycleProgress} size={56} strokeWidth={5} />
          <div
            className="absolute inset-0 flex items-center justify-center text-xs font-semibold"
            style={{ color: list.color }}
          >
            {Math.round(cycleProgress)}%
          </div>
        </div>

        {/* List Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: list.color }}
            />
            <h3 className="font-semibold text-foreground truncate">
              {list.name}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {currentBook} {currentChapter}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-muted-foreground">
              {list.cycleDays} chapters/cycle
            </span>
            {timesCompleted > 0 && (
              <span className="text-xs font-medium text-success">
                {timesCompleted}× completed
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}
