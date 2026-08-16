import { useMemo } from "react";
import { Flame, Shield, Sparkles } from "lucide-react";
import { addDays, formatShortDate, todayISO, type ISODate } from "@/lib/date";
import type { ReadingLog } from "@/lib/progress";
import { CHAPTERS_PER_DAY } from "@/lib/readingPlan";
import { cn, pluralize } from "@/lib/utils";

interface StreakVisualizationProps {
  history: ReadingLog;
  streakCount: number;
  bestStreak: number;
}

export function StreakVisualization({
  history,
  streakCount,
  bestStreak,
}: StreakVisualizationProps) {
  const today = todayISO();

  // 30 days rolling strip ending today
  const days = useMemo(() => {
    const list: Array<{
      date: ISODate;
      completedCount: number;
      isToday: boolean;
      isComplete: boolean;
    }> = [];

    for (let i = 29; i >= 0; i--) {
      const date = addDays(today, -i);
      const count = history[date]?.length ?? 0;
      list.push({
        date,
        completedCount: count,
        isToday: i === 0,
        isComplete: count >= CHAPTERS_PER_DAY,
      });
    }
    return list;
  }, [history, today]);

  // Available freeze shields (1 per 7 days of streak, max 3)
  const freezeShields = Math.min(3, Math.floor(streakCount / 7));

  return (
    <section
      aria-label="30-day Reading Streak Activity"
      className="surface mb-6 overflow-hidden rounded-2xl p-5"
    >
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-track-orange/15 text-track-orange">
            <Flame className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-display text-sm font-bold leading-tight">
              {streakCount > 0 ? `${streakCount}-Day Streak` : "Start Your Streak"}
            </h3>
            <p className="text-2xs font-semibold text-muted-foreground">
              Best record: {bestStreak} {pluralize(bestStreak, "day")}
            </p>
          </div>
        </div>

        {freezeShields > 0 && (
          <div
            className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-2xs font-bold text-primary"
            title={`${freezeShields} streak freeze shields earned`}
          >
            <Shield className="h-3 w-3" aria-hidden="true" />
            <span>{freezeShields} {pluralize(freezeShields, "shield")}</span>
          </div>
        )}
      </div>

      {/* 30-Day Dot Matrix */}
      <div className="pt-2">
        <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
          {days.map((day) => {
            const isFull = day.isComplete;
            const isPartial = day.completedCount > 0 && !isFull;
            const isEmpty = day.completedCount === 0;

            return (
              <div
                key={day.date}
                className="group relative flex flex-col items-center"
              >
                <div
                  className={cn(
                    "flex aspect-square w-full items-center justify-center rounded-lg text-[9px] font-bold tabular-nums transition-all",
                    day.isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                    isFull && "bg-success text-success-foreground shadow-xs",
                    isPartial && "bg-track-orange/30 text-track-orange font-semibold",
                    isEmpty && "bg-secondary/70 text-muted-foreground/40",
                  )}
                  aria-label={`${formatShortDate(day.date)}: ${day.completedCount} chapters`}
                >
                  {isFull ? (
                    <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                  ) : day.completedCount > 0 ? (
                    day.completedCount
                  ) : (
                    ""
                  )}
                </div>

                {/* Micro tooltip on hover */}
                <div className="pointer-events-none absolute -top-8 z-30 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] font-semibold text-background shadow-md group-hover:block">
                  {formatShortDate(day.date)} · {day.completedCount} ch
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between text-2xs font-semibold text-muted-foreground">
          <span>30 days ago</span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-success" aria-hidden="true" />
              10 ch
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-track-orange/40" aria-hidden="true" />
              Partial
            </span>
          </div>
          <span className="font-bold text-foreground">Today</span>
        </div>
      </div>
    </section>
  );
}
