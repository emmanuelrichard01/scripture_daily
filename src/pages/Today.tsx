import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Flame } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { CalendarView } from "@/components/CalendarView";
import { ReadingCard } from "@/components/ReadingCard";
import { Reader } from "@/components/reader/Reader";
import { SyncIndicator } from "@/components/SyncIndicator";
import { UserProfile } from "@/components/UserProfile";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { FullPageSpinner } from "@/components/layout/FullPageSpinner";
import { ProgressRing } from "@/components/ProgressRing";
import { Confetti } from "@/components/Confetti";
import { DailyVerse } from "@/components/DailyVerse";
import { StreakVisualization } from "@/components/StreakVisualization";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useProgress } from "@/hooks/useProgress";
import { useAuth } from "@/hooks/useAuth";
import { useFeedback } from "@/hooks/useFeedback";
import { useMilestoneToasts } from "@/hooks/useMilestoneToasts";
import { formatLongDate, greetingFor, todayISO } from "@/lib/date";
import { CHAPTERS_PER_DAY } from "@/lib/readingPlan";
import { cn, pluralize } from "@/lib/utils";

export default function Today() {
  const { user } = useAuth();
  const feedback = useFeedback();
  const { shouldShow: showOnboarding, isChecking, complete } = useOnboarding();
  const [openListId, setOpenListId] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const {
    todaysReadings,
    completedTodayListIds,
    completedToday,
    isTodayComplete,
    streakCount,
    bestStreak,
    history,
    totalChaptersRead,
    averagePerDay,
    readingDay,
    listProgress,
    toggleReading,
    getCompletedForDay,
    isDayComplete,
    syncStatus,
    lastSyncedAt,
    retrySync,
    isAuthenticated,
  } = useProgress();

  useMilestoneToasts(listProgress);

  const today = todayISO();

  const firstName = useMemo(() => {
    const metadata = user?.user_metadata as Record<string, unknown> | undefined;
    const full =
      (typeof metadata?.full_name === "string" && metadata.full_name) ||
      (typeof metadata?.display_name === "string" && metadata.display_name) ||
      (typeof metadata?.name === "string" && metadata.name) ||
      "";
    return full.trim().split(/\s+/)[0] || "friend";
  }, [user]);

  const openReading = useMemo(
    () => todaysReadings.find((reading) => reading.listId === openListId) ?? null,
    [todaysReadings, openListId],
  );

  /** The first list not yet read — what "continue" should open. */
  const nextUp = useMemo(
    () => todaysReadings.find((reading) => !reading.completed) ?? null,
    [todaysReadings],
  );

  /**
   * The next unread list *other than* the one already open, so the reader can
   * offer to carry straight on once a chapter is marked.
   */
  const nextAfterOpen = useMemo(() => {
    if (openListId === null) return null;
    const candidate = todaysReadings.find(
      (reading) => !reading.completed && reading.listId !== openListId,
    );
    return candidate
      ? {
          listId: candidate.listId,
          listName: candidate.listName,
          book: candidate.book,
          chapter: candidate.chapter,
        }
      : null;
  }, [todaysReadings, openListId]);

  const handleToggle = (listId: number) => {
    const wasComplete = completedTodayListIds.has(listId);

    // Only celebrate on the way up. Chiming when someone corrects a mistap
    // rewards the wrong action.
    if (!wasComplete) {
      if (completedToday === CHAPTERS_PER_DAY - 1) {
        feedback.dayComplete();
        setShowConfetti(true);
      } else {
        feedback.chapterComplete();
      }
    }

    toggleReading(today, listId);
  };

  const [filterMode, setFilterMode] = useState<"all" | "remaining" | "completed">("all");

  const filteredReadings = useMemo(() => {
    if (filterMode === "remaining") return todaysReadings.filter((r) => !r.completed);
    if (filterMode === "completed") return todaysReadings.filter((r) => r.completed);
    return todaysReadings;
  }, [todaysReadings, filterMode]);

  if (isChecking) return <FullPageSpinner label="Starting Scripture Daily" />;
  if (showOnboarding) return <OnboardingFlow onComplete={complete} />;

  const percent = Math.round((completedToday / CHAPTERS_PER_DAY) * 100);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}

      <header className="glass safe-top sticky top-0 z-40 border-b border-border/50">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-5">
          <UserProfile size="sm" showName={false} linkToProfile={isAuthenticated} />
          <SyncIndicator
            status={syncStatus}
            lastSyncedAt={lastSyncedAt}
            isAuthenticated={isAuthenticated}
            onRetry={retrySync}
          />
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pb-28 pt-7">
        {/* ── Greeting ── */}
        <div className="mb-5">
          <p className="text-2xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
            {formatLongDate(today)} · Day {readingDay.toLocaleString()}
          </p>
          <h1 className="mt-1.5 font-display text-[1.9rem] font-semibold leading-tight tracking-tight">
            {greetingFor()}, {firstName}
          </h1>
        </div>

        {/* ── Daily Inspiration ── */}
        <DailyVerse readingDay={readingDay} />

        {/* ── Hero ──
            The single most important thing on the page: how far through today
            you are, and the one action that moves it forward. */}
        <section
          className="surface-raised relative overflow-hidden p-5"
          aria-label="Today's progress"
        >
          {/* A soft accent wash behind the ring, warming on completion. */}
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl transition-colors duration-700 animate-pulse-glow"
            style={{
              backgroundColor: isTodayComplete
                ? "hsl(var(--success) / 0.2)"
                : "hsl(var(--primary) / 0.14)",
            }}
            aria-hidden="true"
          />

          <div className="relative flex items-center gap-5">
            <ProgressRing
              progress={percent}
              size={96}
              strokeWidth={8}
              isComplete={isTodayComplete}
            >
              {isTodayComplete ? (
                <Check className="h-9 w-9 text-success" strokeWidth={2.5} aria-hidden="true" />
              ) : (
                <span className="flex items-baseline" aria-hidden="true">
                  <span className="stat-display text-[1.75rem] leading-none">
                    {completedToday}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                    /{CHAPTERS_PER_DAY}
                  </span>
                </span>
              )}
            </ProgressRing>

            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-semibold leading-snug">
                {isTodayComplete ? "Today is complete! 🎉" : "Today's reading"}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {isTodayComplete
                  ? `All ${CHAPTERS_PER_DAY} chapters finished. Well done.`
                  : `${CHAPTERS_PER_DAY - completedToday} ${pluralize(
                      CHAPTERS_PER_DAY - completedToday,
                      "chapter",
                    )} to go — about ${Math.max(
                      3,
                      (CHAPTERS_PER_DAY - completedToday) * 3,
                    )} minutes.`}
              </p>

              {streakCount > 0 && (
                <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-track-orange/10 px-2.5 py-1 text-xs font-bold text-track-orange">
                  <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                  {streakCount} day {pluralize(streakCount, "streak", "streak")}
                </p>
              )}
            </div>
          </div>

          {/* Primary action. Absent when the day is done — a completed state
              should not still be asking for input. */}
          {nextUp && (
            <button
              type="button"
              onClick={() => setOpenListId(nextUp.listId)}
              className="relative mt-5 flex w-full items-center justify-between gap-3 rounded-2xl bg-primary px-4 py-3.5 text-primary-foreground shadow-md transition-transform duration-200 hover:brightness-110 active:scale-[0.985] focus-ring"
            >
              <span className="min-w-0 text-left">
                <span className="block text-2xs font-bold uppercase tracking-[0.08em] opacity-80">
                  {completedToday === 0 ? "Start with" : "Continue with"}
                </span>
                <span className="mt-0.5 block truncate font-display text-base font-semibold">
                  {nextUp.book} {nextUp.chapter}
                </span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
            </button>
          )}
        </section>

        {/* ── At a glance ── */}
        <section
          aria-label="Reading statistics"
          className="surface mt-4 grid grid-cols-3 divide-x divide-border/60"
        >
          {[
            { value: totalChaptersRead.toLocaleString(), label: "chapters" },
            { value: averagePerDay.toFixed(1), label: "per day" },
            { value: readingDay.toLocaleString(), label: "days in" },
          ].map((stat) => (
            <div key={stat.label} className="px-2 py-4 text-center">
              <p className="stat-display text-xl leading-none">{stat.value}</p>
              <p className="mt-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </section>

        {/* ── The ten with quick filter chips ── */}
        <section aria-labelledby="todays-chapters" className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="todays-chapters" className="section-label">
              Today's chapters
            </h2>
            <div className="flex items-center gap-1 rounded-xl bg-secondary/50 p-0.5">
              {(["all", "remaining", "completed"] as const).map((mode) => {
                const isSelected = filterMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFilterMode(mode)}
                    className={cn(
                      "rounded-lg px-2 py-1 text-3xs font-bold uppercase tracking-wider transition-all",
                      isSelected
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {mode === "all"
                      ? "All 10"
                      : mode === "remaining"
                        ? `${CHAPTERS_PER_DAY - completedToday} Left`
                        : `${completedToday} Done`}
                  </button>
                );
              })}
            </div>
          </div>

          <ul className="space-y-2">
            {filteredReadings.map((reading, index) => (
              <li
                key={reading.listId}
                className="animate-rise"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <ReadingCard
                  reading={reading}
                  onToggle={() => handleToggle(reading.listId)}
                  onOpenReader={() => setOpenListId(reading.listId)}
                />
              </li>
            ))}
          </ul>
        </section>

        {/* ── 30-Day Activity Strip ── */}
        <StreakVisualization
          history={history}
          streakCount={streakCount}
          bestStreak={bestStreak}
        />

        {/* ── Activity ── */}
        <section aria-labelledby="activity-history" className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="activity-history" className="section-label">
              This month
            </h2>
            <Link
              to="/history"
              className="rounded text-xs font-semibold text-primary hover:underline focus-ring"
            >
              Full history
            </Link>
          </div>

          <CalendarView
            getCompletedForDay={getCompletedForDay}
            isDayComplete={isDayComplete}
          />
        </section>
      </main>

      <BottomNav />

      {openReading && (
        <Reader
          isOpen
          onOpenChange={(open) => {
            if (!open) setOpenListId(null);
          }}
          listId={openReading.listId}
          listName={openReading.listName}
          book={openReading.book}
          chapter={openReading.chapter}
          isCompleted={openReading.completed}
          onToggleComplete={() => handleToggle(openReading.listId)}
          nextUp={nextAfterOpen}
          onAdvance={setOpenListId}
        />
      )}
    </div>
  );
}
