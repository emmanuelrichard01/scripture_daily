import { useMemo, useState } from "react";
import { ArrowRight, Check, Flame, Sparkles } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { ReadingCard } from "@/components/ReadingCard";
import { Reader } from "@/components/reader/Reader";
import { SyncIndicator } from "@/components/SyncIndicator";
import { UserProfile } from "@/components/UserProfile";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { FullPageSpinner } from "@/components/layout/FullPageSpinner";
import { ProgressRing } from "@/components/ProgressRing";
import { Confetti } from "@/components/Confetti";
import { DailyVerse } from "@/components/DailyVerse";
import { WeeklyMomentum } from "@/components/WeeklyMomentum";
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
  const remainingChapters = CHAPTERS_PER_DAY - completedToday;
  const estimatedRemainingMins = Math.max(3, remainingChapters * 3);

  return (
    <div className="min-h-dvh bg-background text-foreground selection:bg-primary/20">
      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}

      {/* ── Top App Bar ── */}
      <header className="glass safe-top sticky top-0 z-40 border-b border-border/30 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-6">
          <UserProfile size="sm" showName={false} linkToProfile={isAuthenticated} />
          <SyncIndicator
            status={syncStatus}
            lastSyncedAt={lastSyncedAt}
            isAuthenticated={isAuthenticated}
            onRetry={retrySync}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full flex-col px-5 sm:px-6 pb-40 pt-6 max-w-xl">
        {/* ── Greeting & Date Header ── */}
        <div className="mb-6 animate-rise">
          <div className="flex items-center gap-2">
            <span className="text-[0.68rem] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              {formatLongDate(today)}
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-primary">
              Day {readingDay.toLocaleString()}
            </span>
          </div>

          <h1 className="mt-2.5 font-display text-4xl sm:text-[2.75rem] font-bold leading-[1.1] tracking-tight">
            {greetingFor()},<br />{firstName}.
          </h1>
        </div>

        {/* ── Daily Inspiration Quote ── */}
        <DailyVerse readingDay={readingDay} />

        {/* ── Central Hero Progress Card (Clean & Simple) ── */}
        <section
          className="surface p-6 sm:p-7"
          aria-label="Today's progress"
        >
          {/* Ring + Summary */}
          <div className="flex items-center gap-5 sm:gap-6 mb-5">
            <ProgressRing
              progress={percent}
              size={96}
              strokeWidth={8}
              isComplete={isTodayComplete}
            >
              {isTodayComplete ? (
                <Check className="h-8 w-8 text-success" strokeWidth={3} aria-hidden="true" />
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <span className="font-display text-2xl sm:text-3xl font-bold leading-none tabular-nums tracking-tight">
                    {completedToday}
                  </span>
                  <span className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground/80 mt-1">
                    of {CHAPTERS_PER_DAY}
                  </span>
                </div>
              )}
            </ProgressRing>

            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl sm:text-2xl font-bold leading-tight tracking-tight text-foreground">
                {isTodayComplete ? "Today is complete" : "Today's reading"}
              </h2>

              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {isTodayComplete ? (
                  <span>All {CHAPTERS_PER_DAY} chapters finished for today.</span>
                ) : (
                  <span>
                    <strong className="text-foreground font-semibold">{remainingChapters} {pluralize(remainingChapters, "chapter")}</strong> to go (~{estimatedRemainingMins} mins).
                  </span>
                )}
              </p>

              {streakCount > 0 && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-foreground">
                  <Flame className="h-3.5 w-3.5 text-track-orange" aria-hidden="true" />
                  <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                    {streakCount}-day streak
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          {nextUp ? (
            <button
              type="button"
              onClick={() => setOpenListId(nextUp.listId)}
              className="flex w-full items-center justify-between rounded-xl bg-foreground text-background dark:bg-primary dark:text-primary-foreground p-3.5 transition-opacity hover:opacity-90 active:opacity-100 focus-ring cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/15 dark:bg-black/20 text-background dark:text-primary-foreground">
                  <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <div className="text-left min-w-0">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] opacity-80">
                    {completedToday === 0 ? "Start reading" : "Continue"}
                  </p>
                  <p className="font-display text-base sm:text-lg font-bold leading-snug truncate">
                    {nextUp.book} {nextUp.chapter} <span className="opacity-70 text-xs font-sans font-normal">· {nextUp.listName}</span>
                  </p>
                </div>
              </div>

              <span className="hidden sm:inline text-2xs font-semibold uppercase tracking-wider opacity-75 pr-1">
                ~3m
              </span>
            </button>
          ) : (
            <div className="flex items-center justify-between rounded-xl bg-secondary/80 p-3.5 text-foreground">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-success" aria-hidden="true" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Today's reading complete
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-medium">All 10 finished</span>
            </div>
          )}
        </section>

        {/* ── At a Glance Quick Metrics (Clean & Flat) ── */}
        <section
          aria-label="Reading statistics"
          className="surface mt-4 flex items-center justify-between p-4"
        >
          {[
            { value: totalChaptersRead.toLocaleString(), label: "Chapters read" },
            { value: averagePerDay.toFixed(1), label: "Daily pace" },
            { value: readingDay.toLocaleString(), label: "Days active" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                "flex flex-col items-center text-center",
                i !== 1 && "flex-1",
                i === 1 && "flex-1 border-x border-border/50 px-2",
              )}
            >
              <p className="font-display text-lg sm:text-xl font-bold tabular-nums leading-none tracking-tight">
                {stat.value}
              </p>
              <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </section>

        {/* ── The 10 Chapters List with Quiet Filter ── */}
        <section aria-labelledby="todays-chapters" className="mt-8">
          <div className="mb-3 flex items-baseline justify-between flex-wrap gap-2">
            <h2 id="todays-chapters" className="section-label">
              Today's chapters
            </h2>

            <div className="flex rounded-lg bg-secondary/60 p-0.5">
              {(["all", "remaining", "completed"] as const).map((mode) => {
                const isSelected = filterMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFilterMode(mode)}
                    className={cn(
                      "rounded-md px-2.5 py-0.5 text-[0.62rem] font-bold transition-colors cursor-pointer",
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
            {filteredReadings.map((reading) => (
              <li key={reading.listId}>
                <ReadingCard
                  reading={reading}
                  onToggle={() => handleToggle(reading.listId)}
                  onOpenReader={() => setOpenListId(reading.listId)}
                />
              </li>
            ))}
          </ul>
        </section>

        {/* ── Weekly Momentum Ribbon (7-Day Rolling) ── */}
        <div className="mt-8">
          <WeeklyMomentum
            history={history}
            streakCount={streakCount}
            bestStreak={bestStreak}
          />
        </div>
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

