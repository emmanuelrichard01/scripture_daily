import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Flame, Shield } from "lucide-react";
import { addDays, parseISODate, todayISO, type ISODate } from "@/lib/date";
import type { ReadingLog } from "@/lib/progress";
import { CHAPTERS_PER_DAY } from "@/lib/readingPlan";
import { cn, pluralize } from "@/lib/utils";

interface WeeklyMomentumProps {
  history: ReadingLog;
  streakCount: number;
  bestStreak: number;
}

const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WeeklyMomentum({
  history,
  streakCount,
  bestStreak,
}: WeeklyMomentumProps) {
  const today = todayISO();

  // 7 days rolling strip ending today
  const days = useMemo(() => {
    const list: Array<{
      date: ISODate;
      dayOfWeek: string;
      dayOfMonth: number;
      completedCount: number;
      isToday: boolean;
      isComplete: boolean;
    }> = [];

    for (let i = 6; i >= 0; i--) {
      const date = addDays(today, -i);
      const parsed = parseISODate(date);
      const count = history[date]?.length ?? 0;
      list.push({
        date,
        dayOfWeek: SHORT_WEEKDAYS[parsed.getDay()],
        dayOfMonth: parsed.getDate(),
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
      aria-label="Weekly Reading Momentum"
      className="surface p-5 sm:p-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-track-orange">
            <Flame className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold leading-tight tracking-tight">
              {streakCount > 0 ? `${streakCount}-Day Streak` : "Daily Streak"}
            </h3>
            <p className="mt-0.5 text-[0.68rem] font-medium uppercase tracking-wider text-muted-foreground">
              Personal best: {bestStreak} {pluralize(bestStreak, "day")}
            </p>
          </div>
        </div>

        {freezeShields > 0 && (
          <div
            className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground"
            title={`${freezeShields} streak freeze shields earned`}
          >
            <Shield className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>{freezeShields} {pluralize(freezeShields, "shield")}</span>
          </div>
        )}
      </div>

      {/* 7-Day Rolling Habit Ribbon */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {days.map((day) => {
          const isFull = day.isComplete;
          const isPartial = day.completedCount > 0 && !isFull;
          const isEmpty = day.completedCount === 0;

          return (
            <div
              key={day.date}
              className="flex flex-col items-center gap-1.5 text-center"
            >
              <span className="text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {day.dayOfWeek}
              </span>

              <div
                className={cn(
                  "flex aspect-square w-full max-w-[44px] flex-col items-center justify-center rounded-xl text-xs font-bold tabular-nums transition-colors",
                  day.isToday && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                  isFull && "bg-success text-success-foreground",
                  isPartial && "bg-secondary text-foreground border border-border/80",
                  isEmpty && "bg-secondary/40 text-muted-foreground/50",
                )}
                aria-label={`${day.dayOfWeek} ${day.dayOfMonth}: ${day.completedCount} of ${CHAPTERS_PER_DAY} chapters`}
              >
                {isFull ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                ) : (
                  <span>{day.dayOfMonth}</span>
                )}
              </div>

              <span className="text-[0.6rem] font-semibold tabular-nums text-muted-foreground">
                {isFull ? "10 ch" : day.completedCount > 0 ? `${day.completedCount} ch` : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer link to full history */}
      <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-3.5">
        <span className="text-xs text-muted-foreground">
          {streakCount > 0 ? "Keep the rhythm going" : "Read daily to build your habit"}
        </span>
        <Link
          to="/history"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline focus-ring rounded"
        >
          <span>Full History</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
