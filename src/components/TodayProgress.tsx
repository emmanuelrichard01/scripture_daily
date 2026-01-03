import { ProgressRing } from "./ProgressRing";
import { Check } from "lucide-react";

interface TodayProgressProps {
  completedCount: number;
  totalCount: number;
}

export function TodayProgress({ completedCount, totalCount }: TodayProgressProps) {
  const progress = Math.round((completedCount / totalCount) * 100);
  const isComplete = completedCount === totalCount;

  return (
    <div className="card-elevated p-5 flex items-center gap-5">
      <ProgressRing progress={progress} size={80} strokeWidth={6}>
        <div className="text-center">
          {isComplete ? (
            <Check className="w-6 h-6 text-success" />
          ) : (
            <>
              <span className="text-xl font-semibold text-foreground">
                {completedCount}
              </span>
              <span className="text-muted-foreground text-sm">/{totalCount}</span>
            </>
          )}
        </div>
      </ProgressRing>

      <div className="flex-1">
        <h2 className="text-base font-semibold text-foreground mb-0.5">
          {isComplete ? "Today's reading complete" : "Today's Reading"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isComplete
            ? "Well done. All 10 chapters finished."
            : `${totalCount - completedCount} chapter${
                totalCount - completedCount !== 1 ? "s" : ""
              } remaining`}
        </p>
        
        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
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