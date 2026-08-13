import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, LineChart, Share2 } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { HornerFacts } from "@/components/history/HornerFacts";
import { useProgress } from "@/hooks/useProgress";
import { addDays, eachDay, formatShortDate, monthKey, todayISO } from "@/lib/date";
import { chaptersInMonth } from "@/lib/progress";
import { CHAPTERS_PER_DAY, readingLists } from "@/lib/readingPlan";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// recharts is ~100KB gzipped; only pulled in once there is history to chart.
const HistoryChart = lazy(() =>
  import("@/components/history/HistoryChart").then((module) => ({
    default: module.HistoryChart,
  })),
);
const ShareableProgressCard = lazy(() =>
  import("@/components/ShareableProgressCard").then((module) => ({
    default: module.ShareableProgressCard,
  })),
);

type Range = "week" | "month";

export default function History() {
  const { history, totalChaptersRead, bestStreak, streakCount } = useProgress();
  const [range, setRange] = useState<Range>("week");
  const [offset, setOffset] = useState(0);
  const [listFilter, setListFilter] = useState<number | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const today = todayISO();

  const chartData = useMemo(() => {
    const span = range === "week" ? 7 : 28;
    // `offset` counts periods back from now; 0 is the current window.
    const end = addDays(today, offset * span);
    const start = addDays(end, -(span - 1));

    const countFor = (date: string) => {
      const day = history[date] ?? [];
      return listFilter === null ? day.length : day.includes(listFilter) ? 1 : 0;
    };

    if (range === "week") {
      return eachDay(start, end).map((date) => ({
        label: new Date(date).toLocaleDateString(undefined, { weekday: "narrow" }),
        fullDate: date,
        chapters: countFor(date),
      }));
    }

    // Four buckets of seven days.
    return Array.from({ length: 4 }, (_, index) => {
      const weekStart = addDays(start, index * 7);
      const chapters = eachDay(weekStart, addDays(weekStart, 6)).reduce(
        (sum, date) => sum + countFor(date),
        0,
      );
      return { label: `W${index + 1}`, fullDate: weekStart, chapters };
    });
  }, [history, range, offset, listFilter, today]);

  const stats = useMemo(() => {
    const total = chartData.reduce((sum, point) => sum + point.chapters, 0);
    const days = range === "week" ? 7 : 28;
    const ceiling = listFilter === null ? CHAPTERS_PER_DAY : 1;
    return {
      total,
      averagePerDay: total / days,
      completionRate: (total / (days * ceiling)) * 100,
    };
  }, [chartData, range, listFilter]);

  const activeDays = useMemo(
    () => Object.values(history).filter((day) => day.length > 0).length,
    [history],
  );
  const thisMonth = useMemo(() => chaptersInMonth(history, monthKey(today)), [history, today]);

  const periodLabel =
    offset === 0
      ? `This ${range}`
      : offset === -1
        ? `Last ${range}`
        : `${formatShortDate(chartData[0]?.fullDate ?? today)}`;

  if (totalChaptersRead === 0) {
    return (
      <PageLayout title="History">
        <div className="flex flex-col items-center gap-5 py-20 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground/50"
            aria-hidden="true"
          >
            <LineChart className="h-8 w-8" strokeWidth={1.5} />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-display text-lg font-semibold">Nothing charted yet</h2>
            <p className="mx-auto max-w-[16rem] text-sm leading-relaxed text-muted-foreground">
              Mark your first chapter and your reading will start appearing here.
            </p>
          </div>
          <Button asChild className="h-11 rounded-xl px-6 font-semibold">
            <Link to="/">Start reading</Link>
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="History"
      action={
        <button
          type="button"
          onClick={() => setIsSharing(true)}
          className="flex h-9 items-center gap-1.5 rounded-xl bg-primary/10 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/20 focus-ring"
        >
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          Share
        </button>
      }
    >
      {/* ── Lifetime ── */}
      <section aria-label="Lifetime statistics" className="surface mb-6 p-5">
        <div className="grid grid-cols-2 gap-y-5">
          {[
            { value: bestStreak, label: "best streak", unit: pluralUnit(bestStreak, "day") },
            { value: streakCount, label: "current streak", unit: pluralUnit(streakCount, "day") },
            { value: thisMonth, label: "this month", unit: "chapters" },
            { value: activeDays, label: "days read", unit: "total" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="stat-display text-2xl leading-none">
                {stat.value.toLocaleString()}
                <span className="ml-1.5 text-xs font-semibold text-muted-foreground">
                  {stat.unit}
                </span>
              </p>
              <p className="mt-1 text-2xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Filter ── */}
      <div
        className="scrollbar-none fade-edge-x -mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1"
        role="radiogroup"
        aria-label="Filter by list"
      >
        <button
          type="button"
          role="radio"
          aria-checked={listFilter === null}
          onClick={() => setListFilter(null)}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-colors focus-ring",
            listFilter === null
              ? "bg-foreground text-background"
              : "bg-secondary text-muted-foreground hover:text-foreground",
          )}
        >
          All lists
        </button>

        {readingLists.map((list) => (
          <button
            key={list.id}
            type="button"
            role="radio"
            aria-checked={listFilter === list.id}
            onClick={() => setListFilter(list.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-colors focus-ring",
              listFilter === list.id
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: `hsl(var(${list.colorVar}))` }}
              aria-hidden="true"
            />
            {list.name}
          </button>
        ))}
      </div>

      {/* ── Chart ── */}
      <section className="surface mb-6 p-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="section-label">Reading volume</h2>
          <div className="flex rounded-xl bg-secondary p-0.5">
            {(["week", "month"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setRange(option);
                  setOffset(0);
                }}
                className={cn(
                  "rounded-[10px] px-3 py-1.5 text-xs font-bold capitalize transition-all focus-ring",
                  range === option
                    ? "bg-card shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="flex items-baseline gap-1.5">
              <span className="stat-display text-3xl leading-none">
                {stats.averagePerDay.toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">ch/day</span>
            </p>
            <p
              className={cn(
                "mt-1.5 text-xs font-semibold",
                stats.completionRate >= 70
                  ? "text-success"
                  : stats.completionRate >= 40
                    ? "text-track-yellow"
                    : "text-muted-foreground",
              )}
            >
              {stats.completionRate.toFixed(0)}% of target · {stats.total} total
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 rounded-xl bg-secondary p-0.5">
            <button
              type="button"
              onClick={() => setOffset((value) => value - 1)}
              className="rounded-[10px] p-2 transition-colors hover:bg-card focus-ring"
              aria-label={`Previous ${range}`}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="min-w-[62px] px-1 text-center text-2xs font-bold">
              {periodLabel}
            </span>
            <button
              type="button"
              onClick={() => setOffset((value) => Math.min(0, value + 1))}
              disabled={offset === 0}
              className="rounded-[10px] p-2 transition-colors hover:bg-card disabled:opacity-25 focus-ring"
              aria-label={`Next ${range}`}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <Suspense fallback={<div className="skeleton h-[180px]" />}>
          <HistoryChart
            data={chartData}
            maxValue={
              (listFilter === null ? CHAPTERS_PER_DAY : 1) * (range === "week" ? 1 : 7)
            }
          />
        </Suspense>
      </section>

      <Link
        to="/milestones"
        className="surface-interactive mb-8 flex items-center justify-between gap-3 p-4 focus-ring"
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold">Milestones</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Cycles completed and what's next
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>

      <HornerFacts />

      {isSharing && (
        <Suspense fallback={null}>
          <ShareableProgressCard
            streak={bestStreak}
            totalChapters={totalChaptersRead}
            activeDays={activeDays}
            onClose={() => setIsSharing(false)}
          />
        </Suspense>
      )}
    </PageLayout>
  );
}

/** Singular/plural unit label for a stat. */
function pluralUnit(count: number, unit: string): string {
  return count === 1 ? unit : `${unit}s`;
}
