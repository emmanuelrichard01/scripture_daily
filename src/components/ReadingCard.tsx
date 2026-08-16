import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodayReading } from "@/lib/readingPlan";

interface ReadingCardProps {
  reading: TodayReading;
  onToggle: () => void;
  onOpenReader: () => void;
}

/**
 * Serene, dignified Reading Card for today's 10 chapters.
 *
 * Features persistent list track color spine, cycle progression badge,
 * clean typography without strikethroughs, and crisp checkmark confirmation.
 */
export function ReadingCard({ reading, onToggle, onOpenReader }: ReadingCardProps) {
  const { completed, listName, listId, book, chapter, colorVar, progressPercent } = reading;
  const reference = `${book} ${chapter}`;
  const accent = `hsl(var(${colorVar}))`;

  return (
    <div
      className={cn(
        "group relative flex items-stretch overflow-hidden rounded-2xl border transition-colors duration-200",
        completed
          ? "border-border/30 bg-card/60 opacity-80 hover:opacity-100 hover:border-border/60"
          : "border-border/50 bg-card hover:border-border/80",
      )}
    >
      {/* List accent spine - always preserves track color identity */}
      <div
        className="relative w-1 shrink-0 overflow-hidden"
        style={{ backgroundColor: accent }}
        aria-hidden="true"
      />

      {/* Check button */}
      <button
        type="button"
        onClick={onToggle}
        role="checkbox"
        aria-checked={completed}
        aria-label={`Mark ${reference} from ${listName} as ${completed ? "unread" : "read"}`}
        className={cn(
          "my-auto ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 focus-ring cursor-pointer",
          completed
            ? "bg-success text-success-foreground"
            : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:scale-95",
        )}
      >
        {completed ? (
          <Check className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />
        ) : (
          <span className="text-xs font-bold tabular-nums" aria-hidden="true">
            {listId}
          </span>
        )}
      </button>

      {/* Main card body opening reader */}
      <button
        type="button"
        onClick={onOpenReader}
        className="flex min-h-[4.25rem] flex-1 items-center justify-between px-3.5 py-2.5 text-left focus-ring cursor-pointer"
        aria-label={`Read ${reference}`}
      >
        <span className="min-w-0 flex-1 pr-3">
          <span className="mb-0.5 flex items-center gap-1.5 flex-wrap">
            <span
              className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider bg-secondary/80"
              style={{ color: accent }}
            >
              {listName}
            </span>
            <span className="text-3xs text-muted-foreground/40">·</span>
            <span className="text-[0.62rem] font-medium text-muted-foreground tabular-nums">
              {progressPercent}% cycle
            </span>
          </span>

          <span
            className={cn(
              "block truncate font-display text-[1.1rem] sm:text-[1.15rem] font-semibold leading-snug tracking-tight transition-colors",
              completed ? "text-muted-foreground/90 font-medium" : "text-foreground group-hover:text-primary",
            )}
          >
            {reference}
          </span>
        </span>

        <span
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-wider transition-colors",
            completed
              ? "bg-success/10 text-success font-bold"
              : "bg-secondary text-muted-foreground group-hover:text-foreground",
          )}
        >
          {completed ? (
            <span>Read</span>
          ) : (
            <>
              <Clock className="h-3 w-3" />
              <span>~3m</span>
            </>
          )}
        </span>
      </button>
    </div>
  );
}
