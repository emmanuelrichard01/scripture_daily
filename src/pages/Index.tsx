import { useMemo } from "react";
import { Flame, BookOpen, Calendar, TrendingUp } from "lucide-react";
import { Header } from "@/components/Header";
import { TodayProgress } from "@/components/TodayProgress";
import { ReadingCard } from "@/components/ReadingCard";
import { StatsCard } from "@/components/StatsCard";
import { CalendarView } from "@/components/CalendarView";
import { BottomNav } from "@/components/BottomNav";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import {
  getTodaysReadings,
  getDayOfYear,
  formatDate,
} from "@/lib/readingPlan";

const Index = () => {
  const today = new Date();
  const dayOfYear = getDayOfYear(today);
  const formattedDate = formatDate(today);

  const {
    completedSet,
    streakCount,
    totalChaptersRead,
    startDate,
    toggleComplete,
    getCompletedForDay,
    isDayComplete,
  } = useReadingProgress();

  const todaysReadings = useMemo(
    () => getTodaysReadings(dayOfYear, completedSet),
    [dayOfYear, completedSet]
  );

  const completedToday = todaysReadings.filter((r) => r.completed).length;

  // Calculate days since start
  const daysSinceStart = useMemo(() => {
    const start = new Date(startDate);
    const diff = today.getTime() - start.getTime();
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
  }, [startDate, today]);

  // Average chapters per day
  const avgPerDay = (totalChaptersRead / daysSinceStart).toFixed(1);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header formattedDate={formattedDate} />

      <main className="max-w-lg mx-auto px-6 py-6">
        {/* Hero section with today's progress */}
        <div className="mb-8 animate-fade-in">
          <TodayProgress completedCount={completedToday} totalCount={10} />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
            <StatsCard
              icon={<Flame className="w-6 h-6" />}
              label="Current Streak"
              value={streakCount}
              sublabel={streakCount === 1 ? "day" : "days"}
              variant="accent"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "150ms" }}>
            <StatsCard
              icon={<BookOpen className="w-6 h-6" />}
              label="Chapters Read"
              value={totalChaptersRead}
              sublabel="total"
              variant="primary"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
            <StatsCard
              icon={<Calendar className="w-6 h-6" />}
              label="Day of Year"
              value={dayOfYear}
              sublabel={`of 365`}
              variant="default"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "250ms" }}>
            <StatsCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Daily Average"
              value={avgPerDay}
              sublabel="chapters"
              variant="success"
            />
          </div>
        </div>

        {/* Today's readings list */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold font-serif text-foreground">
              Today's Chapters
            </h2>
            <span className="text-sm text-muted-foreground">
              Day {dayOfYear}
            </span>
          </div>

          <div className="space-y-3">
            {todaysReadings.map((reading, index) => (
              <div
                key={reading.listId}
                className="animate-slide-up"
                style={{ animationDelay: `${300 + index * 50}ms` }}
              >
                <ReadingCard
                  reading={reading}
                  onToggle={() => toggleComplete(dayOfYear, reading.listId)}
                  index={index}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold font-serif text-foreground">
              Reading Calendar
            </h2>
          </div>
          <div className="animate-scale-in" style={{ animationDelay: "400ms" }}>
            <CalendarView
              getCompletedForDay={getCompletedForDay}
              isDayComplete={isDayComplete}
            />
          </div>
        </div>

        {/* Footer quote */}
        <footer className="text-center animate-fade-in" style={{ animationDelay: "600ms" }}>
          <blockquote className="max-w-sm mx-auto">
            <p className="text-base text-muted-foreground italic font-serif">
              "I have more wisdom than all my teachers, for thy testimonies are
              my meditation."
            </p>
            <cite className="text-sm text-muted-foreground mt-2 block">
              — Psalm 119:99
            </cite>
          </blockquote>
        </footer>
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
