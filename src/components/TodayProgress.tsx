import { ProgressRing } from "./ProgressRing";

interface TodayProgressProps {
  completedCount: number;
  totalCount: number;
}

export function TodayProgress({ completedCount, totalCount }: TodayProgressProps) {
  const progress = Math.round((completedCount / totalCount) * 100);
  const isComplete = completedCount === totalCount;

  return (
    <div className="card-elevated p-6 flex items-center gap-6">
      <ProgressRing progress={progress} size={100} strokeWidth={8}>
        <div className="text-center">
          <span className="text-2xl font-bold font-serif text-foreground">
            {completedCount}
          </span>
          <span className="text-muted-foreground text-lg">/{totalCount}</span>
        </div>
      </ProgressRing>

      <div className="flex-1">
        <h2 className="text-xl font-semibold font-serif text-foreground mb-1">
          {isComplete ? "Today's reading complete! 🎉" : "Today's Reading"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {isComplete
            ? "Well done! You've completed all 10 chapters for today."
            : `${totalCount - completedCount} chapter${
                totalCount - completedCount !== 1 ? "s" : ""
              } remaining to complete today's reading.`}
        </p>
        
        {/* Progress bar */}
        <div className="mt-4 h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: isComplete
                ? "hsl(var(--success))"
                : "hsl(var(--primary))",
            }}
          />
        </div>
      </div>
    </div>
  );
}
