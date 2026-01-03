import { ReadingList } from "@/lib/readingPlan";
import { ProgressRing } from "./ProgressRing";
import { ChevronRight } from "lucide-react";

interface ListProgressCardProps {
  list: ReadingList;
  cycleProgress: number;
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
    <div className="group card-interactive p-4">
      <div className="flex items-center gap-4">
        {/* Progress Ring */}
        <div className="relative">
          <ProgressRing progress={cycleProgress} size={56} strokeWidth={5} />
          <div
            className="absolute inset-0 flex items-center justify-center text-xs font-semibold"
            style={{ color: `hsl(${list.colorVar})` }}
          >
            {Math.round(cycleProgress)}%
          </div>
        </div>

        {/* List Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: `hsl(${list.colorVar})` }}
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
              {list.cycleDays} chapters
            </span>
            {timesCompleted > 0 && (
              <span className="text-xs font-medium text-success">
                {timesCompleted}× completed
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
}