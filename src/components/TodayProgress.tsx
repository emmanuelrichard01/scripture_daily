import { ProgressRing } from "./ProgressRing";
import { Check } from "lucide-react";

interface TodayProgressProps {
  completedCount: number;
  totalCount: number;
}

export function TodayProgress({ completedCount, totalCount }: TodayProgressProps) {
  const progress = Math.round((completedCount / totalCount) * 100);
  const isComplete = completedCount === totalCount;
  const remaining = totalCount - completedCount;

  return (
    <div className="surface-hero p-5 flex items-center gap-5">
      <ProgressRing progress={progress} size={92} strokeWidth={7}>
        <div className="text-center leading-none">
          {isComplete ? (
            <Check className="w-7 h-7 text-success" aria-hidden="true" />
          ) : (
            <div className="flex items-baseline justify-center">
              <span className="text-2xl font-semibold tabular-nums text-foreground">
                {completedCount}
              </span>
              <span className="text-muted-foreground text-sm tabular-nums">
                /{totalCount}
              </span>
            </div>
          )}
        </div>
      </ProgressRing>

      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold text-foreground mb-0.5">
          {isComplete ? "Today's reading complete" : "Today's Reading"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isComplete
            ? "Well done. All 10 chapters finished."
            : `${remaining} chapter${remaining !== 1 ? "s" : ""} remaining`}
        </p>

        {/* Progress bar */}
        <div
          className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={totalCount}
          aria-label="Chapters completed today"
        >
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{
              width: `${progress}%`,
              backgroundColor: isComplete
                ? "hsl(var(--success))"
                : "hsl(var(--foreground))",
            }}
          />
        </div>
      </div>
    </div>
  );
}
