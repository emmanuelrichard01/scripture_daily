import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDayOfYear } from "@/lib/readingPlan";

interface CalendarViewProps {
  getCompletedForDay: (dayOfYear: number) => number;
  isDayComplete: (dayOfYear: number) => boolean;
}

export function CalendarView({
  getCompletedForDay,
  isDayComplete,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();

  const { year, month, days, firstDayOfWeek } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1);
      const dayOfYear = getDayOfYear(date);
      return {
        date: i + 1,
        dayOfYear,
        completed: getCompletedForDay(dayOfYear),
        isComplete: isDayComplete(dayOfYear),
        isToday:
          date.toDateString() === today.toDateString(),
        isPast: date < today && date.toDateString() !== today.toDateString(),
        isFuture: date > today,
      };
    });

    return { year, month, days, firstDayOfWeek };
  }, [currentDate, getCompletedForDay, isDayComplete, today]);

  const monthName = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="card-elevated p-5" role="region" aria-label={`Calendar for ${monthName}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-foreground" id="calendar-month">
          {monthName}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={goToToday}
            className="px-2.5 py-1.5 text-2xs font-medium text-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors min-h-[32px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Go to today"
          >
            Today
          </button>
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-secondary transition-colors min-h-[36px] min-w-[36px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-secondary transition-colors min-h-[36px] min-w-[36px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1.5" role="row" aria-label="Days of the week">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
          <div
            key={`${day}-${i}`}
            className="text-center text-2xs font-medium text-muted-foreground py-1.5"
            role="columnheader"
            aria-label={day}
          >
            {day.charAt(0)}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1" role="grid" aria-labelledby="calendar-month">
        {/* Empty cells for days before first of month */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" role="gridcell" aria-hidden="true" />
        ))}

        {/* Day cells */}
        {days.map((day) => (
          <div
            key={day.date}
            role="gridcell"
            aria-label={`${new Date(year, month, day.date).toLocaleDateString("en-US", { month: "long", day: "numeric" })}. ${day.isComplete ? "All readings complete" : day.completed > 0 ? `${day.completed} of 10 readings complete` : "No readings complete"}`}
            className={cn(
              "aspect-square flex flex-col items-center justify-center rounded-xl text-xs relative transition-all motion-reduce:transition-none",
              day.isToday && "bg-foreground text-background",
              day.isComplete && !day.isToday && "bg-success/10",
              day.isPast && !day.isComplete && day.completed === 0 && "bg-destructive/5",
              day.isFuture && "opacity-40"
            )}
          >
            <span
              className={cn(
                "font-medium",
                day.isComplete && !day.isToday && "text-success"
              )}
            >
              {day.date}
            </span>
            
            {/* Progress indicator */}
            {day.completed > 0 && !day.isFuture && !day.isToday && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2" aria-hidden="true">
                <div
                  className={cn(
                    "w-1 h-1 rounded-full",
                    day.isComplete ? "bg-success" : "bg-muted-foreground"
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-success/30" />
          <span className="text-2xs text-muted-foreground">Complete</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
          <span className="text-2xs text-muted-foreground">Partial</span>
        </div>
      </div>
    </div>
  );
}