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
      className="relative mb-8 overflow-hidden rounded-[2rem] border-[0.5px] border-border/40 bg-card p-6 shadow-xl transition-shadow hover:shadow-2xl"
    >
      <div className="flex items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-track-orange/10 shadow-[inset_0_0_12px_rgba(255,165,0,0.1)] text-track-orange">
            <Flame className="h-5 w-5 drop-shadow-sm" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-display text-[1.05rem] font-bold leading-tight tracking-tight">
              {streakCount > 0 ? `${streakCount}-Day Streak` : "Start Your Streak"}
            </h3>
            <p className="mt-0.5 text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground/80">
              Best record: {bestStreak} {pluralize(bestStreak, "day")}
            </p>
          </div>
        </div>

        {freezeShields > 0 && (
          <div
            className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-widest text-primary shadow-sm"
            title={`${freezeShields} streak freeze shields earned`}
          >
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{freezeShields} {pluralize(freezeShields, "shield")}</span>
          </div>
        )}
      </div>

      {/* 30-Day Dot Matrix */}
      <div className="pt-2">
        <div className="grid grid-cols-10 gap-2 sm:gap-2.5">
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
                    "flex aspect-square w-full items-center justify-center rounded-[0.4rem] text-[0.6rem] font-bold tabular-nums transition-all duration-300",
                    day.isToday && "ring-[1.5px] ring-primary ring-offset-2 ring-offset-card scale-110",
                    isFull && "bg-success text-success-foreground shadow-[0_0_8px_rgba(var(--success),0.4)] dark:shadow-[0_0_12px_rgba(var(--success),0.6)]",
                    isPartial && "bg-track-orange/30 text-track-orange font-semibold shadow-[inset_0_0_4px_rgba(255,165,0,0.2)]",
                    isEmpty && "bg-secondary/40 text-muted-foreground/30 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.2)]",
                    "hover:scale-110"
                  )}
                  aria-label={`${formatShortDate(day.date)}: ${day.completedCount} chapters`}
                >
                  {isFull ? (
                    <Sparkles className="h-2.5 w-2.5 drop-shadow-sm" aria-hidden="true" />
                  ) : day.completedCount > 0 ? (
                    day.completedCount
                  ) : (
                    ""
                  )}
                </div>

                {/* Glassmorphism micro-tooltip */}
                <div className="pointer-events-none absolute -top-10 z-30 hidden whitespace-nowrap rounded-lg bg-card/90 backdrop-blur-md border-[0.5px] border-border/50 px-2.5 py-1.5 text-[0.6rem] font-bold uppercase tracking-widest text-foreground shadow-xl group-hover:block transition-all animate-in fade-in zoom-in-95">
                  {formatShortDate(day.date)} <span className="opacity-50 mx-1">·</span> {day.completedCount} ch
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground/70">
          <span>30 days ago</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-success shadow-[0_0_6px_rgba(var(--success),0.5)]" aria-hidden="true" />
              10 ch
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-track-orange/40 shadow-[inset_0_0_2px_rgba(255,165,0,0.3)]" aria-hidden="true" />
              Partial
            </span>
          </div>
          <span className="text-foreground">Today</span>
        </div>
      </div>
    </section>
  );
}
