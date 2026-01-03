import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodayReading } from "@/lib/readingPlan";

interface ReadingCardProps {
  reading: TodayReading;
  onToggle: () => void;
  index: number;
}

export function ReadingCard({ reading, onToggle, index }: ReadingCardProps) {
  return (
    <button
      className={cn(
        "w-full group relative flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200 text-left",
        reading.completed
          ? "bg-success/5 border-success/20"
          : "bg-card border-border hover:border-border active:scale-[0.99]"
      )}
      onClick={onToggle}
    >
      {/* Track color indicator - thin left border */}
      <div
        className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
        style={{ backgroundColor: `hsl(${reading.colorVar})` }}
      />

      {/* Completion indicator */}
      <div
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 flex-shrink-0 ml-2",
          reading.completed
            ? "bg-success text-success-foreground"
            : "bg-secondary text-muted-foreground"
        )}
      >
        {reading.completed ? (
          <Check className="w-4 h-4" />
        ) : (
          <span className="text-xs font-medium">{reading.listId}</span>
        )}
      </div>

      {/* Reading details */}
      <div className="flex-1 min-w-0">
        <span className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">
          {reading.listName}
        </span>
        <h3
          className={cn(
            "font-medium text-sm text-foreground transition-colors",
            reading.completed && "text-success"
          )}
        >
          {reading.book} {reading.chapter}
        </h3>
      </div>

      {/* Mark as read text */}
      <span
        className={cn(
          "text-xs font-medium transition-colors",
          reading.completed ? "text-success" : "text-muted-foreground"
        )}
      >
        {reading.completed ? "Done" : "Mark read"}
      </span>
    </button>
  );
}