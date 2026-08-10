import { useMemo, useState } from "react";
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
import { OnboardingFlow, useOnboarding } from "@/components/onboarding/OnboardingFlow";
import { useCloudProgress } from "@/hooks/useCloudProgress";
import { useMilestoneAcknowledgements } from "@/hooks/useMilestoneAcknowledgements";
import { useHaptics } from "@/hooks/useHaptics";
import { useAudio } from "@/hooks/useAudio";
import { useAuth } from "@/contexts/AuthContext";
import { Reader } from "@/components/Reader";
import type { TodayReading } from "@/lib/readingPlan";
import {
  getTodaysReadings,
  getReadingDay,
  getDayOfYear,
  formatDate,
} from "@/lib/readingPlan";

const Index = () => {
  const today = useMemo(() => new Date(), []);
  const { user } = useAuth();
  const { triggerHaptic } = useHaptics();
  const { playBloop, playTada } = useAudio();
  const { showOnboarding, isLoading: onboardingLoading, completeOnboarding } = useOnboarding();
  const [announcement, setAnnouncement] = useState("");
  const [activeReading, setActiveReading] = useState<TodayReading | null>(null);

  const {
    history,
    listProgress,
    completedTodayListIds,
    streakCount,
    totalChaptersRead,
    startDate,
    toggleComplete,
    syncStatus,
    lastSyncedAt,
    retrySync,
    isAuthenticated,
    getCompletedForDay,
    isDayComplete,
  } = useCloudProgress();

  const formattedDate = formatDate(today);
  const readingDay = getReadingDay(today, startDate);
  const dayOfYear = getDayOfYear(today);

  // Use the TRUE HORNER calculations instead of naive sequential math
  const todaysReadings = useMemo(() => getTodaysReadings(listProgress, completedTodayListIds), [listProgress, completedTodayListIds]);
  const completedToday = todaysReadings.filter((r) => r.completed).length;
  const isComplete = completedToday === 10;

  const daysSinceStart = Math.max(1, Math.floor((today.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
  const avgPerDay = (totalChaptersRead / daysSinceStart).toFixed(1);

  // Check for milestones
  useMilestoneAcknowledgements(streakCount, totalChaptersRead, (msg) => {
    setAnnouncement(msg);
    setTimeout(() => setAnnouncement(""), 4000);
  });

  const handleToggle = (listId: number) => {
    // Only play sounds/haptics if we are checking it, not unchecking it
    const isCurrentlyCompleted = completedTodayListIds.has(listId);
    
    if (!isCurrentlyCompleted) {
      triggerHaptic("light");
      
      if (completedToday === 9) {
        // This is the 10th one!
        playTada();
      } else {
        playBloop();
      }
    }
    
    toggleComplete(today.toISOString().split("T")[0], listId);
  };

  // Show onboarding for new users
  if (onboardingLoading) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
          <img src="/apple-touch-icon.png" alt="Logo" className="w-12 h-12 rounded-xl opacity-80" />
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return <OnboardingFlow onComplete={completeOnboarding} />;
  }

  return (
    <div className="min-h-dvh bg-background pb-24 text-foreground selection:bg-primary/20">
      <Header
        left={<UserProfile user={user} />}
        right={
          isAuthenticated ? (
            <SyncIndicator
              status={syncStatus}
              lastSyncedAt={lastSyncedAt}
              onRetry={retrySync}
            />
          ) : null
        }
      />
      
      <main className="max-w-md mx-auto px-6 pt-24 fade-in">
        <header className="mb-8" aria-label="Date and progress summary">
          <div className="flex flex-col gap-1 mb-6">
            <h1 className="text-3xl font-serif text-foreground tracking-tight">
              {formattedDate}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              Day {dayOfYear} of the year
            </p>
            {announcement && (
              <p className="text-sm font-medium text-success animate-fade-in" role="status" aria-live="polite">
                {announcement}
              </p>
            )}
          </div>
          
          <TodayProgress 
            completed={completedToday} 
            total={10} 
            isComplete={isComplete}
          />
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 mb-8" role="region" aria-label="Reading statistics">
          <div className="animate-slide-up" style={{ animationDelay: "50ms" }}>
            <StatsCard
              icon={<Flame className="w-5 h-5 text-track-orange" strokeWidth={1.5} aria-hidden="true" />}
              label="Streak"
              value={streakCount}
              sublabel={streakCount === 1 ? "day" : "days"}
              accentColor="track-orange"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
            <StatsCard
              icon={<BookOpen className="w-5 h-5 text-track-blue" strokeWidth={1.5} aria-hidden="true" />}
              label="Chapters"
              value={totalChaptersRead}
              sublabel="read"
              accentColor="track-blue"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "150ms" }}>
            <StatsCard
              icon={<Calendar className="w-5 h-5 text-track-green" strokeWidth={1.5} aria-hidden="true" />}
              label="Day"
              value={readingDay}
              sublabel="reading day"
              accentColor="track-green"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
            <StatsCard
              icon={<TrendingUp className="w-5 h-5 text-track-purple" strokeWidth={1.5} aria-hidden="true" />}
              label="Average"
              value={avgPerDay}
              sublabel="/day"
              accentColor="track-purple"
            />
          </div>
        </div>

        {/* Today's readings list */}
        <section className="mb-6" aria-labelledby="todays-chapters-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="todays-chapters-heading" className="text-sm font-semibold text-foreground">
              Today's Chapters
            </h2>
            <span className="text-xs text-muted-foreground" aria-hidden="true">
              Day {readingDay}
            </span>
          </div>

          <div className="space-y-2" role="list" aria-label="Reading list">
            {todaysReadings.map((reading, index) => (
              <div
                key={reading.listId}
                className="animate-slide-up"
                style={{ animationDelay: `${250 + index * 30}ms` }}
                role="listitem"
              >
                <ReadingCard
                  reading={reading}
                  onToggle={() => handleToggle(reading.listId)}
                  onOpenReader={() => setActiveReading(reading)}
                  index={index}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Calendar */}
        <section className="mb-6" aria-labelledby="calendar-heading">
          <div className="mb-3">
            <h2 id="calendar-heading" className="text-sm font-semibold text-foreground">
              Calendar
            </h2>
          </div>
          <div className="animate-scale-in" style={{ animationDelay: "400ms" }}>
            <CalendarView
              getCompletedForDay={getCompletedForDay}
              isDayComplete={isDayComplete}
            />
          </div>
        </section>
      </main>

      <InstallPrompt />
      <BottomNav />

      {activeReading && (
        <Reader
          isOpen={!!activeReading}
          onOpenChange={(open) => !open && setActiveReading(null)}
          book={activeReading.book}
          chapter={activeReading.chapter}
          listName={activeReading.listName}
          isCompleted={activeReading.completed}
          onToggleComplete={() => handleToggle(activeReading.listId)}
        />
      )}
    </div>
  );
};

export default Index;
