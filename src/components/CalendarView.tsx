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
    <div className="card-elevated p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold font-serif text-foreground">
          {monthName}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
          >
            Today
          </button>
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before first of month */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Day cells */}
        {days.map((day) => (
          <div
            key={day.date}
            className={cn(
              "aspect-square flex flex-col items-center justify-center rounded-lg text-sm relative transition-all",
              day.isToday && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              day.isComplete && "bg-success/10",
              day.isPast && !day.isComplete && day.completed === 0 && "bg-destructive/5",
              day.isFuture && "opacity-40"
            )}
          >
            <span
              className={cn(
                "font-medium",
                day.isToday && "text-primary font-semibold",
                day.isComplete && "text-success"
              )}
            >
              {day.date}
            </span>
            
            {/* Progress indicator */}
            {day.completed > 0 && !day.isFuture && (
              <div className="flex gap-0.5 mt-0.5">
                {Array.from({ length: Math.min(day.completed, 5) }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1 h-1 rounded-full",
                      day.isComplete ? "bg-success" : "bg-primary/60"
                    )}
                  />
                ))}
                {day.completed > 5 && (
                  <span className="text-[8px] text-muted-foreground ml-0.5">
                    +{day.completed - 5}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success/30" />
          <span className="text-xs text-muted-foreground">Complete</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary/30" />
          <span className="text-xs text-muted-foreground">Partial</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive/20" />
          <span className="text-xs text-muted-foreground">Missed</span>
        </div>
      </div>
    </div>
  );
}
