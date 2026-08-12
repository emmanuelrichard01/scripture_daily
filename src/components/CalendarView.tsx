import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, pluralize, getDateISO } from "@/lib/utils";

interface CalendarViewProps {
  getCompletedForDay: (dateIso: string) => number;
  isDayComplete: (dateIso: string) => boolean;
}

export function CalendarView({
  getCompletedForDay,
  isDayComplete,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);
  const today = useMemo(() => new Date(), []);

  const { year, month, days, firstDayOfWeek } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1);
      const dateIso = getDateISO(date);
      const completed = getCompletedForDay(dateIso);
      
      // Heatmap intensity calculation (0 to 4 level)
      // 0 = none, 1 = 1-3 ch, 2 = 4-6 ch, 3 = 7-9 ch, 4 = 10 ch (complete)
      let intensity = 0;
      if (completed > 0) {
        intensity = Math.ceil((completed / 10) * 4);
      }

      return {
        date: i + 1,
        dateIso,
        completed,
        isComplete: isDayComplete(dateIso),
        intensity,
        isToday: date.toDateString() === today.toDateString(),
        isPast: date < today && date.toDateString() !== today.toDateString(),
      };
    });

    return { year, month, days, firstDayOfWeek };
  }, [currentDate, getCompletedForDay, isDayComplete, today]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const getIntensityClass = (intensity: number, isFuture: boolean) => {
    if (isFuture) return "bg-transparent border border-dashed border-border text-muted-foreground/30";
    
    switch (intensity) {
      case 4: return "bg-primary text-primary-foreground font-bold shadow-sm";
      case 3: return "bg-primary/75 text-primary-foreground font-semibold";
      case 2: return "bg-primary/50 text-foreground font-medium";
      case 1: return "bg-primary/25 text-foreground/80";
      default: return "bg-secondary/40 text-foreground/40";
    }
  };

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-bold text-foreground tracking-tight">
          {monthName} <span className="text-muted-foreground ml-1 font-semibold">{year}</span>
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors focus-ring"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors focus-ring"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2"
          >
            {day}
          </div>
        ))}

        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map((dayInfo, i) => {
          const isFuture = !dayInfo.isPast && !dayInfo.isToday;
          return (
            <div
              key={i}
              className="relative flex justify-center"
            >
              <button
                className={cn(
                  "w-full aspect-square rounded-xl flex items-center justify-center text-xs transition-all duration-300",
                  getIntensityClass(dayInfo.intensity, isFuture),
                  dayInfo.isToday && !dayInfo.isComplete && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                )}
                onClick={() => {
                  if (dayInfo.completed > 0) {
                    setActiveTooltip(activeTooltip === dayInfo.date ? null : dayInfo.date);
                  }
                }}
                onBlur={() => setActiveTooltip(null)}
                disabled={isFuture}
                aria-label={`${monthName} ${dayInfo.date}, ${year}: ${dayInfo.completed} chapters read`}
              >
                {dayInfo.date}
              </button>
              
              {/* Tooltip (shows on tap for mobile, or hover on desktop if we kept group-hover, but we use state for both to be consistent) */}
              {dayInfo.completed > 0 && activeTooltip === dayInfo.date && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-popover text-popover-foreground text-[11px] font-semibold rounded-lg shadow-lg z-20 border border-border/50 whitespace-nowrap pointer-events-none animate-fade-in">
                  {dayInfo.completed} {pluralize(dayInfo.completed, "chapter")}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border/50" />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover mt-[-1px]" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-6 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded bg-secondary/40" />
          <div className="w-3 h-3 rounded bg-primary/25" />
          <div className="w-3 h-3 rounded bg-primary/50" />
          <div className="w-3 h-3 rounded bg-primary/75" />
          <div className="w-3 h-3 rounded bg-primary" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}