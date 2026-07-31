import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { useCloudProgress } from "@/hooks/useCloudProgress";
import { useCycleMilestones } from "@/hooks/useCycleMilestones";
import { ArrowLeft, Trophy, Target, Flame } from "lucide-react";

const CHAPTER_GOALS = [100, 365, 1000, 2500, 5000, 10000];
const STREAK_GOALS = [7, 30, 100, 365];

export default function Milestones() {
  const navigate = useNavigate();
  const { completedSet, totalChaptersRead, streakCount } = useCloudProgress();
  const { cycleStats, totalStats } = useCycleMilestones(completedSet);

  const upcoming = useMemo(() => {
    const items: {
      key: string;
      label: string;
      detail: string;
      current: number;
      target: number;
      colorVar?: string;
      icon: "chapters" | "streak" | "cycle";
    }[] = [];

    const nextChapterGoal = CHAPTER_GOALS.find((g) => g > totalChaptersRead);
    if (nextChapterGoal) {
      items.push({
        key: "chapters",
        label: `${nextChapterGoal.toLocaleString()} chapters read`,
        detail: `${(nextChapterGoal - totalChaptersRead).toLocaleString()} to go`,
        current: totalChaptersRead,
        target: nextChapterGoal,
        icon: "chapters",
      });
    }

    const nextStreakGoal = STREAK_GOALS.find((g) => g > streakCount);
    if (nextStreakGoal) {
      items.push({
        key: "streak",
        label: `${nextStreakGoal}-day streak`,
        detail: `${nextStreakGoal - streakCount} day${
          nextStreakGoal - streakCount === 1 ? "" : "s"
        } to go`,
        current: streakCount,
        target: nextStreakGoal,
        icon: "streak",
      });
    }

    // Three tracks closest to finishing their current cycle
    const closest = [...cycleStats]
      .map((s) => ({
        ...s,
        inCycle: s.completedChapters % s.totalChapters,
      }))
      .filter((s) => s.inCycle > 0)
      .sort(
        (a, b) =>
          b.inCycle / b.totalChapters - a.inCycle / a.totalChapters
      )
      .slice(0, 3);

    for (const s of closest) {
      items.push({
        key: `cycle-${s.listId}`,
        label: `Finish ${s.listName} cycle ${s.completedCycles + 1}`,
        detail: `${s.totalChapters - s.inCycle} chapter${
          s.totalChapters - s.inCycle === 1 ? "" : "s"
        } remaining`,
        current: s.inCycle,
        target: s.totalChapters,
        colorVar: s.colorVar,
        icon: "cycle",
      });
    }

    return items;
  }, [cycleStats, totalChaptersRead, streakCount]);

  return (
    <div className="min-h-dvh bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl tap-target flex items-center justify-center hover:bg-secondary transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" aria-hidden="true" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Milestones</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-6" aria-label="Reading milestones">
        <section className="surface-hero p-4" aria-label="Overview">
          <p className="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Overview
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {totalStats.totalCycles}
              </p>
              <p className="text-2xs text-muted-foreground">total completed cycles</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {totalStats.totalChapters}
              </p>
              <p className="text-2xs text-muted-foreground">chapters completed</p>
            </div>
          </div>

          {totalStats.mostReadList && (
            <div className="mt-4 pt-4 border-t border-border/60">
              <p className="text-sm text-foreground">
                Most revisited:{" "}
                <span className="font-medium">{totalStats.mostReadList.listName}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {totalStats.mostReadList.completedCycles} cycle
                {totalStats.mostReadList.completedCycles === 1 ? "" : "s"}
              </p>
            </div>
          )}
        </section>

        {/* Upcoming milestones */}
        <section aria-labelledby="upcoming-heading" className="space-y-2">
          <h2 id="upcoming-heading" className="text-sm font-semibold text-foreground">
            On the horizon
          </h2>

          {upcoming.length === 0 ? (
            <div className="card-elevated p-5 text-center">
              <p className="text-sm text-muted-foreground">
                Mark a chapter as read to set your first milestone in motion.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((item) => {
                const percent = Math.min(
                  100,
                  Math.round((item.current / item.target) * 100)
                );
                const accent = item.colorVar
                  ? `hsl(var(${item.colorVar}))`
                  : "hsl(var(--foreground))";

                return (
                  <li key={item.key} className="card-elevated p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${accent.slice(0, -1)} / 0.12)` }}
                        aria-hidden="true"
                      >
                        {item.icon === "streak" ? (
                          <Flame className="w-4 h-4" style={{ color: accent }} />
                        ) : (
                          <Target className="w-4 h-4" style={{ color: accent }} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.label}
                          </p>
                          <span className="text-2xs text-muted-foreground tabular-nums whitespace-nowrap">
                            {percent}%
                          </span>
                        </div>

                        <div
                          className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden"
                          role="progressbar"
                          aria-valuenow={item.current}
                          aria-valuemin={0}
                          aria-valuemax={item.target}
                          aria-label={item.label}
                        >
                          <div
                            className="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
                            style={{ width: `${percent}%`, backgroundColor: accent }}
                          />
                        </div>

                        <p className="mt-1.5 text-2xs text-muted-foreground">
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="tracks-heading" className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 id="tracks-heading" className="text-sm font-semibold text-foreground">
              By track
            </h2>
            <span className="text-2xs text-muted-foreground">10 tracks</span>
          </div>

          <ul className="space-y-2">
            {cycleStats.map((stat) => (
              <li key={stat.listId} className="card-elevated p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `hsl(var(${stat.colorVar}) / 0.14)` }}
                    aria-hidden="true"
                  >
                    <Trophy
                      className="w-4 h-4"
                      style={{ color: `hsl(var(${stat.colorVar}))` }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground truncate">
                        {stat.listName}
                      </p>
                      <p className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                        {stat.completedCycles} cycle
                        {stat.completedCycles === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div
                      className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden"
                      role="progressbar"
                      aria-valuenow={stat.progressPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${stat.listName} current cycle progress`}
                    >
                      <div
                        className="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
                        style={{
                          width: `${stat.progressPercent}%`,
                          backgroundColor: `hsl(var(${stat.colorVar}))`,
                        }}
                      />
                    </div>

                    <p className="mt-2 text-2xs text-muted-foreground">
                      {stat.completedChapters} chapters marked complete
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-2xs text-muted-foreground">
          Milestones are counted quietly per track—each time you complete every
          chapter in a list, it counts as one full cycle.
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
