import { useMemo } from "react";
import { TrendingUp, BookOpen, Calendar, Flame } from "lucide-react";
import { Header } from "@/components/Header";
import { TodayProgress } from "@/components/TodayProgress";
import { ReadingCard } from "@/components/ReadingCard";
import { StatsCard } from "@/components/StatsCard";
import { CalendarView } from "@/components/CalendarView";
import { BottomNav } from "@/components/BottomNav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { SyncIndicator } from "@/components/SyncIndicator";
import { UserProfile } from "@/components/UserProfile";
import { useCloudProgress } from "@/hooks/useCloudProgress";
import { useHaptics } from "@/hooks/useHaptics";
import { useAuth } from "@/contexts/AuthContext";
import {
  getTodaysReadings,
  getDayOfYear,
  formatDate,
} from "@/lib/readingPlan";

const Index = () => {
  const today = new Date();
  const dayOfYear = getDayOfYear(today);
  const formattedDate = formatDate(today);
  const { user } = useAuth();
  const { triggerHaptic } = useHaptics();

  const {
    completedSet,
    streakCount,
    totalChaptersRead,
    startDate,
    toggleComplete,
    getCompletedForDay,
    isDayComplete,
    isSyncing,
    isAuthenticated,
  } = useCloudProgress();

  const handleToggle = (listId: number) => {
    triggerHaptic("light");
    toggleComplete(dayOfYear, listId);
  };

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
    <div className="min-h-screen bg-background pb-20">
      <Header formattedDate={formattedDate} />

      <main className="max-w-lg mx-auto px-5 py-5">
        {/* User greeting & sync */}
        <div className="flex items-center justify-between mb-4">
          {user ? (
            <UserProfile size="sm" showGreeting={true} />
          ) : (
            <div className="text-sm text-muted-foreground">Welcome</div>
          )}
          <SyncIndicator isSyncing={isSyncing} isAuthenticated={isAuthenticated} />
        </div>

        {/* Hero section with today's progress */}
        <div className="mb-6 animate-fade-in">
          <TodayProgress completedCount={completedToday} totalCount={10} />
        </div>

        {/* Stats grid with subtle colors */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          <div className="animate-slide-up" style={{ animationDelay: "50ms" }}>
            <StatsCard
              icon={<Flame className="w-5 h-5 text-track-orange" strokeWidth={1.5} />}
              label="Streak"
              value={streakCount}
              sublabel={streakCount === 1 ? "day" : "days"}
              accentColor="track-orange"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
            <StatsCard
              icon={<BookOpen className="w-5 h-5 text-track-blue" strokeWidth={1.5} />}
              label="Chapters"
              value={totalChaptersRead}
              sublabel="read"
              accentColor="track-blue"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "150ms" }}>
            <StatsCard
              icon={<Calendar className="w-5 h-5 text-track-green" strokeWidth={1.5} />}
              label="Day"
              value={dayOfYear}
              sublabel={`of 365`}
              accentColor="track-green"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
            <StatsCard
              icon={<TrendingUp className="w-5 h-5 text-track-purple" strokeWidth={1.5} />}
              label="Average"
              value={avgPerDay}
              sublabel="/day"
              accentColor="track-purple"
            />
          </div>
        </div>

        {/* Today's readings list */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">
              Today's Chapters
            </h2>
            <span className="text-xs text-muted-foreground">
              Day {dayOfYear}
            </span>
          </div>

          <div className="space-y-2">
            {todaysReadings.map((reading, index) => (
              <div
                key={reading.listId}
                className="animate-slide-up"
                style={{ animationDelay: `${250 + index * 30}ms` }}
              >
                <ReadingCard
                  reading={reading}
                  onToggle={() => handleToggle(reading.listId)}
                  index={index}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div className="mb-6">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-foreground">
              Calendar
            </h2>
          </div>
          <div className="animate-scale-in" style={{ animationDelay: "400ms" }}>
            <CalendarView
              getCompletedForDay={getCompletedForDay}
              isDayComplete={isDayComplete}
            />
          </div>
        </div>
      </main>

      <InstallPrompt />
      <BottomNav />
    </div>
  );
};

export default Index;