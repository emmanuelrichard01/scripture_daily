import { Check, Book } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodayReading } from "@/lib/readingPlan";

interface ReadingCardProps {
  reading: TodayReading;
  onToggle: () => void;
  index: number;
}

export function ReadingCard({ reading, onToggle, index }: ReadingCardProps) {
  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 cursor-pointer",
        reading.completed
          ? "bg-success/5 border-success/20"
          : "bg-card border-border hover:border-primary/20 hover:shadow-sm active:scale-[0.99]"
      )}
      onClick={onToggle}
    >
      {/* Completion indicator */}
      <div
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 flex-shrink-0",
          reading.completed
            ? "bg-success text-success-foreground"
            : "bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
        )}
      >
        {reading.completed ? (
          <Check className="w-4 h-4" />
        ) : (
          <Book className="w-4 h-4" />
        )}
      </div>

      {/* Reading details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: reading.color }}
          />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
            {reading.listName}
          </span>
        </div>
        <h3
          className={cn(
            "font-medium text-sm text-foreground transition-colors truncate",
            reading.completed && "text-success"
          )}
        >
          {reading.book} {reading.chapter}
        </h3>
      </div>

      {/* Chapter number badge */}
      <div
        className={cn(
          "flex items-center justify-center w-7 h-7 rounded-lg text-xs font-semibold transition-colors flex-shrink-0",
          reading.completed
            ? "bg-success/10 text-success"
            : "bg-secondary text-muted-foreground"
        )}
      >
        {reading.chapter}
      </div>
    </div>
  );
}
