import { useMemo } from "react";
import { Flame, Target, Trophy } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { useProgress } from "@/hooks/useProgress";
import { cn, pluralize } from "@/lib/utils";

const CHAPTER_GOALS = [100, 365, 1_000, 2_500, 5_000, 10_000, 25_000];
const STREAK_GOALS = [7, 30, 100, 365, 1_000];

interface Milestone {
  key: string;
  label: string;
  detail: string;
  current: number;
  target: number;
  icon: typeof Target;
  colorVar?: string;
}

export default function Milestones() {
  const { listPositions, totalChaptersRead, streakCount, bestStreak } = useProgress();

  const upcoming = useMemo<Milestone[]>(() => {
    const items: Milestone[] = [];

    const nextChapters = CHAPTER_GOALS.find((goal) => goal > totalChaptersRead);
    if (nextChapters) {
      items.push({
        key: "chapters",
        label: `${nextChapters.toLocaleString()} chapters`,
        detail: `${(nextChapters - totalChaptersRead).toLocaleString()} to go`,
        current: totalChaptersRead,
        target: nextChapters,
        icon: Target,
      });
    }

    const nextStreak = STREAK_GOALS.find((goal) => goal > streakCount);
    if (nextStreak) {
      const remaining = nextStreak - streakCount;
      items.push({
        key: "streak",
        label: `${nextStreak}-day streak`,
        detail: `${remaining} ${pluralize(remaining, "day")} to go`,
        current: streakCount,
        target: nextStreak,
        icon: Flame,
      });
    }

    // The three lists closest to finishing — where encouragement is actionable.
    for (const position of listPositions
      .filter((item) => item.chaptersIntoCycle > 0)
      .sort((a, b) => b.progressPercent - a.progressPercent)
      .slice(0, 3)) {
      const remaining = position.totalChapters - position.chaptersIntoCycle;
      items.push({
        key: `cycle-${position.listId}`,
        label: `Finish ${position.listName}`,
        detail: `${remaining} ${pluralize(remaining, "chapter")} left in cycle ${
          position.completedCycles + 1
        }`,
        current: position.chaptersIntoCycle,
        target: position.totalChapters,
        icon: Trophy,
        colorVar: position.colorVar,
      });
    }

    return items;
  }, [listPositions, totalChaptersRead, streakCount]);

  const totalCycles = listPositions.reduce((sum, item) => sum + item.completedCycles, 0);
  const completed = listPositions.filter((item) => item.completedCycles > 0);

  return (
    <PageLayout title="Milestones" showBack>
      <section className="surface-raised relative overflow-hidden p-6" aria-label="Overview">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-track-yellow/15 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative grid grid-cols-3 gap-4">
          {[
            { value: totalCycles, label: "cycles" },
            { value: totalChaptersRead, label: "chapters" },
            { value: bestStreak, label: "best streak" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="stat-display text-2xl leading-none">
                {stat.value.toLocaleString()}
              </p>
              <p className="mt-1.5 text-2xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="upcoming" className="mt-8">
        <h2 id="upcoming" className="section-label mb-3">
          On the horizon
        </h2>

        {upcoming.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Mark a chapter read to set your first milestone in motion.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((item, index) => {
              const percent = Math.min(100, Math.round((item.current / item.target) * 100));
              const accent = item.colorVar
                ? `hsl(var(${item.colorVar}))`
                : "hsl(var(--primary))";

              return (
                <li
                  key={item.key}
                  className="surface animate-rise flex items-start gap-3.5 p-4"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)` }}
                    aria-hidden="true"
                  >
                    <item.icon className="h-4.5 w-4.5" style={{ color: accent }} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-bold">{item.label}</p>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                        {percent}%
                      </span>
                    </div>

                    <div
                      className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"
                      role="progressbar"
                      aria-valuenow={item.current}
                      aria-valuemin={0}
                      aria-valuemax={item.target}
                      aria-label={item.label}
                    >
                      <div
                        className="h-full rounded-full transition-[width] duration-700 ease-out-expo"
                        style={{ width: `${percent}%`, backgroundColor: accent }}
                      />
                    </div>

                    <p className="mt-1.5 text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="achieved" className="mt-8">
        <h2 id="achieved" className="section-label mb-3">
          Completed cycles
        </h2>

        {completed.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm leading-relaxed text-muted-foreground">
            No full cycles yet. Acts is the shortest list at 28 chapters — it'll be
            the first to come around.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {completed.map((position) => (
              <li
                key={position.listId}
                className="surface flex flex-col items-center gap-2 p-4 text-center"
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full"
                  style={{ backgroundColor: `hsl(var(${position.colorVar}) / 0.14)` }}
                  aria-hidden="true"
                >
                  <Trophy
                    className="h-5 w-5"
                    style={{ color: `hsl(var(${position.colorVar}))` }}
                  />
                </span>
                <span className="text-xs font-bold leading-tight">{position.listName}</span>
                <span className="text-2xs font-semibold text-muted-foreground">
                  {position.completedCycles}×
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="all-lists" className="mt-8">
        <h2 id="all-lists" className="section-label mb-3">
          Every list
        </h2>

        <ul className="surface divide-y divide-border/60 overflow-hidden">
          {listPositions.map((position) => (
            <li key={position.listId} className="flex items-center gap-3 px-4 py-3">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: `hsl(var(${position.colorVar}))` }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {position.listName}
              </span>
              <span
                className={cn(
                  "shrink-0 text-xs font-semibold tabular-nums",
                  position.completedCycles > 0 ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {position.chaptersIntoCycle}/{position.totalChapters}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        A cycle is one complete pass through every chapter in a list. Because the
        lists differ in length they finish at their own pace — that is the point.
      </p>
    </PageLayout>
  );
}
