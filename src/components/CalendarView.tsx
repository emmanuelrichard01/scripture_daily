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

  const getIntensityClass = (intensity: number) => {
    switch (intensity) {
      case 4: return "bg-primary text-primary-foreground font-bold shadow-sm";
      case 3: return "bg-primary/80 text-primary-foreground font-semibold";
      case 2: return "bg-primary/50 text-foreground font-medium";
      case 1: return "bg-primary/30 text-foreground/80";
      default: return "bg-secondary/50 text-foreground/50";
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

        {days.map((dayInfo, i) => (
          <div
            key={i}
            className="group relative flex justify-center"
          >
            <div
              className={cn(
                "w-full aspect-square rounded-xl flex items-center justify-center text-xs transition-all duration-300",
                getIntensityClass(dayInfo.intensity),
                dayInfo.isToday && !dayInfo.isComplete && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                !dayInfo.isPast && !dayInfo.isToday && "opacity-40",
              )}
              role="img"
              aria-label={`${monthName} ${dayInfo.date}, ${year}: ${dayInfo.completed} chapters read`}
            >
              {dayInfo.date}
            </div>
            
            {/* Tooltip */}
            {dayInfo.completed > 0 && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-popover text-popover-foreground text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg z-10 border border-border">
                {dayInfo.completed} {pluralize(dayInfo.completed, "chapter")}
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover mt-[-1px]" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}