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
        "group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 cursor-pointer hover-lift",
        reading.completed
          ? "bg-success/5 border-success/30"
          : "bg-card border-border hover:border-primary/30"
      )}
      onClick={onToggle}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Completion indicator */}
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
          reading.completed
            ? "bg-success text-success-foreground animate-check"
            : "bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
        )}
      >
        {reading.completed ? (
          <Check className="w-5 h-5" />
        ) : (
          <Book className="w-5 h-5" />
        )}
      </div>

      {/* Reading details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: reading.color }}
          />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            List {reading.listId} · {reading.listName}
          </span>
        </div>
        <h3
          className={cn(
            "font-medium text-foreground transition-colors",
            reading.completed && "text-success"
          )}
        >
          {reading.book} {reading.chapter}
        </h3>
      </div>

      {/* Chapter number badge */}
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg text-sm font-semibold transition-colors",
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
