import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { parseISODate, toISODate, todayISO, type ISODate } from "@/lib/date";
import { CHAPTERS_PER_DAY } from "@/lib/readingPlan";
import { cn, pluralize } from "@/lib/utils";

interface CalendarViewProps {
  getCompletedForDay: (date: ISODate) => number;
  isDayComplete: (date: ISODate) => boolean;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

/** Maps chapters read to one of five heat levels. */
function intensityOf(completed: number): 0 | 1 | 2 | 3 | 4 {
  if (completed <= 0) return 0;
  if (completed >= CHAPTERS_PER_DAY) return 4;
  return Math.min(3, Math.ceil((completed / CHAPTERS_PER_DAY) * 3)) as 1 | 2 | 3;
}

const INTENSITY_CLASS: Record<number, string> = {
  0: "bg-secondary/50 text-muted-foreground",
  1: "bg-primary/20 text-foreground",
  2: "bg-primary/45 text-foreground",
  3: "bg-primary/70 text-primary-foreground font-semibold",
  4: "bg-primary text-primary-foreground font-bold shadow-sm",
};

export function CalendarView({ getCompletedForDay, isDayComplete }: CalendarViewProps) {
  const today = todayISO();
  const [cursor, setCursor] = useState(() => today.slice(0, 7)); // YYYY-MM
  const [selected, setSelected] = useState<ISODate | null>(null);

  const { year, monthIndex, days, leadingBlanks, isCurrentMonth, monthTotal } = useMemo(() => {
    const [yearText, monthText] = cursor.split("-");
    const year = Number(yearText);
    const monthIndex = Number(monthText) - 1;

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const leadingBlanks = new Date(year, monthIndex, 1).getDay();
    let monthTotal = 0;

    const days = Array.from({ length: daysInMonth }, (_, offset) => {
      const date = toISODate(new Date(year, monthIndex, offset + 1));
      const completed = getCompletedForDay(date);
      monthTotal += completed;

      return {
        dayOfMonth: offset + 1,
        date,
        completed,
        isComplete: isDayComplete(date),
        intensity: intensityOf(completed),
        isToday: date === today,
        isFuture: date > today,
      };
    });

    return {
      year,
      monthIndex,
      days,
      leadingBlanks,
      monthTotal,
      isCurrentMonth: cursor === today.slice(0, 7),
    };
  }, [cursor, getCompletedForDay, isDayComplete, today]);

  const shiftMonth = (delta: number) => {
    setCursor(toISODate(new Date(year, monthIndex + delta, 1)).slice(0, 7));
    setSelected(null);
  };

  const monthLabel = parseISODate(`${cursor}-01`).toLocaleDateString(undefined, {
    month: "long",
  });

  return (
    <div className="surface p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight">
            {monthLabel} <span className="text-muted-foreground">{year}</span>
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {monthTotal.toLocaleString()} {pluralize(monthTotal, "chapter")}
          </p>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-ring"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            // Nothing exists past the current month, and paging endlessly into
            // empty future months reads as broken.
            disabled={isCurrentMonth}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-25 disabled:hover:bg-transparent focus-ring"
            aria-label="Next month"
          >
            <ChevronRight className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((day, index) => (
          <div
            key={index}
            className="pb-1.5 text-center text-2xs font-bold uppercase text-muted-foreground/70"
            aria-hidden="true"
          >
            {day}
          </div>
        ))}

        {Array.from({ length: leadingBlanks }, (_, index) => (
          <div key={`blank-${index}`} aria-hidden="true" />
        ))}

        {days.map((day) => (
          <div key={day.date} className="relative flex justify-center">
            <button
              type="button"
              disabled={day.isFuture}
              onClick={() => setSelected((current) => (current === day.date ? null : day.date))}
              className={cn(
                "flex aspect-square w-full items-center justify-center rounded-[10px] text-xs tabular-nums transition-all duration-200 focus-ring",
                day.isFuture
                  ? "text-muted-foreground/25"
                  : cn(INTENSITY_CLASS[day.intensity], "hover:scale-110"),
                day.isToday && "ring-2 ring-primary ring-offset-2 ring-offset-card",
              )}
              aria-label={`${monthLabel} ${day.dayOfMonth}: ${day.completed} of ${CHAPTERS_PER_DAY} chapters`}
              aria-pressed={selected === day.date}
            >
              {day.dayOfMonth}
            </button>

            {selected === day.date && day.completed > 0 && (
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-2xs font-semibold text-background shadow-lg"
              >
                {day.completed} {pluralize(day.completed, "chapter")}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-end gap-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground/70">
        <span>Less</span>
        <div className="flex gap-1" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className={cn("h-3 w-3 rounded", INTENSITY_CLASS[level])} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
