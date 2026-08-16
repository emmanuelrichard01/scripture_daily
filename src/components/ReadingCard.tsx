import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodayReading } from "@/lib/readingPlan";

interface ReadingCardProps {
  reading: TodayReading;
  onToggle: () => void;
  onOpenReader: () => void;
}

/**
 * Modern Apple-grade Reading Card for today's 10 chapters.
 *
 * Features list track color spine, cycle progression badge, estimated reading time,
 * and tactile spring checkmark with zero invalid nested buttons.
 */
export function ReadingCard({ reading, onToggle, onOpenReader }: ReadingCardProps) {
  const { completed, listName, listId, book, chapter, colorVar, progressPercent } = reading;
  const reference = `${book} ${chapter}`;
  const accent = `hsl(var(${colorVar}))`;

  return (
    <div
      className={cn(
        "group relative flex items-stretch overflow-hidden rounded-2xl border transition-all duration-200 ease-out-expo",
        completed
          ? "border-success/30 bg-success/[0.05]"
          : "border-border/60 bg-card shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-border",
      )}
    >
      {/* List accent spine with vertical cycle progress gauge */}
      <div
        className="relative w-1.5 shrink-0 overflow-hidden"
        style={{ backgroundColor: completed ? "hsl(var(--success) / 0.3)" : accent }}
        aria-hidden="true"
      >
        {!completed && (
          <div
            className="absolute inset-x-0 bottom-0 bg-black/30 dark:bg-black/50 transition-all duration-300"
            style={{ height: `${100 - progressPercent}%` }}
          />
        )}
      </div>

      {/* Spring check button */}
      <button
        type="button"
        onClick={onToggle}
        role="checkbox"
        aria-checked={completed}
        aria-label={`Mark ${reference} from ${listName} as read`}
        className={cn(
          "my-auto ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-spring focus-ring",
          completed
            ? "bg-success text-success-foreground shadow-sm scale-100"
            : "border border-border/80 bg-secondary/50 text-muted-foreground hover:scale-105 hover:border-transparent active:scale-90",
        )}
      >
        {completed ? (
          <Check className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" />
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
        className="flex min-h-[76px] flex-1 items-center justify-between px-3.5 py-3 text-left focus-ring"
        aria-label={`Read ${reference}`}
      >
        <span className="min-w-0 flex-1 pr-2">
          <span className="mb-0.5 flex items-center gap-1.5">
            <span
              className="text-2xs font-bold uppercase tracking-[0.08em]"
              style={{ color: completed ? undefined : accent }}
            >
              <span className={completed ? "text-success/80" : undefined}>{listName}</span>
            </span>
            <span className="text-3xs text-muted-foreground">·</span>
            <span className="text-3xs font-semibold text-muted-foreground tabular-nums">
              {progressPercent}% cycle
            </span>
          </span>

          <span
            className={cn(
              "block truncate font-display text-[1.0625rem] font-semibold leading-snug tracking-tight",
              completed ? "text-success" : "text-foreground",
            )}
          >
            {reference}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1 rounded-lg bg-secondary/40 px-2 py-1 text-3xs font-semibold text-muted-foreground group-hover:bg-secondary/70">
          <Clock className="h-3 w-3" />
          <span>~3m</span>
        </span>
      </button>
    </div>
  );
}
