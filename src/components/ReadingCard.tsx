import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodayReading } from "@/lib/readingPlan";

interface ReadingCardProps {
  reading: TodayReading;
  onToggle: () => void;
  onOpenReader: () => void;
}

/**
 * One of today's ten chapters.
 *
 * Two sibling controls, not nested ones: the checkbox marks it read, the body
 * opens the reader. The previous version put a `<button>` inside a `<button>` —
 * invalid HTML that browsers recover from unpredictably, and which left screen
 * readers announcing one control with two conflicting labels.
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
          ? "border-success/25 bg-success/[0.06]"
          : "border-border/60 bg-card shadow-sm hover:-translate-y-px hover:shadow-md",
      )}
    >
      {/* List accent spine. Doubles as a cycle-progress gauge: the filled
          portion is how far through this list's current pass you are. */}
      <div
        className="relative w-1 shrink-0 overflow-hidden"
        style={{ backgroundColor: completed ? "hsl(var(--success) / 0.25)" : `${accent}` }}
        aria-hidden="true"
      >
        {!completed && (
          <div
            className="absolute inset-x-0 bottom-0 bg-black/25 dark:bg-black/40"
            style={{ height: `${100 - progressPercent}%` }}
          />
        )}
      </div>

      <button
        type="button"
        onClick={onToggle}
        role="checkbox"
        aria-checked={completed}
        aria-label={`Mark ${reference} from ${listName} as read`}
        className={cn(
          "my-auto ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-spring focus-ring",
          completed
            ? "bg-success text-success-foreground shadow-sm"
            : "border border-border bg-secondary/60 text-muted-foreground hover:scale-105 hover:border-transparent active:scale-95",
        )}
      >
        {completed ? (
          <Check className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" />
        ) : (
          <span className="text-sm font-bold tabular-nums" aria-hidden="true">
            {listId}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={onOpenReader}
        className="flex min-h-[74px] flex-1 items-center px-3.5 py-3 text-left focus-ring"
        aria-label={`Read ${reference}`}
      >
        <span className="min-w-0">
          <span
            className="mb-0.5 block text-2xs font-bold uppercase tracking-[0.07em]"
            style={{ color: completed ? undefined : accent }}
          >
            <span className={completed ? "text-success/70" : undefined}>{listName}</span>
          </span>
          <span
            className={cn(
              "block truncate font-display text-[1.0625rem] font-semibold leading-snug",
              completed ? "text-success" : "text-foreground",
            )}
          >
            {reference}
          </span>
        </span>
      </button>
    </div>
  );
}
