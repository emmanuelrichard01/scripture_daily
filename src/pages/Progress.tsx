import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronRight, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { useProgress } from "@/hooks/useProgress";
import { getList, TOTAL_PLAN_CHAPTERS } from "@/lib/readingPlan";
import { cn, pluralize } from "@/lib/utils";

type SortMode = "track" | "closest" | "cycles";

export default function Progress() {
  const { listPositions, totalChaptersRead } = useProgress();
  const [sortMode, setSortMode] = useState<SortMode>("track");

  const summary = useMemo(() => {
    const totalCycles = listPositions.reduce((sum, item) => sum + item.completedCycles, 0);
    const averagePercent = Math.round(
      listPositions.reduce((sum, item) => sum + item.progressPercent, 0) /
        Math.max(1, listPositions.length),
    );

    let distinctChapters = 0;
    for (const pos of listPositions) {
      if (pos.completedCycles > 0) {
        distinctChapters += pos.totalChapters;
      } else {
        distinctChapters += pos.chaptersIntoCycle;
      }
    }

    const coveragePercent = Math.min(
      100,
      Math.round((distinctChapters / TOTAL_PLAN_CHAPTERS) * 100),
    );

    const sortedByProgress = [...listPositions].sort(
      (a, b) => b.progressPercent - a.progressPercent,
    );
    const closestTrack = sortedByProgress[0];

    return {
      totalCycles,
      averagePercent,
      distinctChapters,
      coveragePercent,
      closestTrack,
    };
  }, [listPositions]);

  /** Complete passes through the whole Bible, by volume. */
  const biblesRead = totalChaptersRead / TOTAL_PLAN_CHAPTERS;
  const currentPassNumber = Math.floor(biblesRead) + 1;
  const currentPassChapters = totalChaptersRead % TOTAL_PLAN_CHAPTERS;
  const currentPassPercent = Math.round((currentPassChapters / TOTAL_PLAN_CHAPTERS) * 100);

  const sortedListPositions = useMemo(() => {
    const list = [...listPositions];
    if (sortMode === "closest") {
      return list.sort((a, b) => b.progressPercent - a.progressPercent);
    }
    if (sortMode === "cycles") {
      return list.sort((a, b) => b.completedCycles - a.completedCycles || b.progressPercent - a.progressPercent);
    }
    return list.sort((a, b) => a.listId - b.listId);
  }, [listPositions, sortMode]);

  return (
    <PageLayout
      title="Progress"
      description="Each list advances only when you mark a chapter read — never by the calendar."
    >
      {/* ── Headline: Total Scripture Volume (Clean & Flat) ── */}
      <section
        className="surface relative overflow-hidden p-6"
        aria-label="Overall Bible Reading Progress"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="section-label">Total scripture volume</p>
          {totalChaptersRead > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
              {biblesRead.toFixed(2)}× Bible pass
            </span>
          )}
        </div>

        <p className="stat-display text-4xl sm:text-5xl leading-none">
          {totalChaptersRead.toLocaleString()}
          <span className="ml-2 text-sm sm:text-base font-sans font-medium text-muted-foreground">
            chapters read
          </span>
        </p>

        {totalChaptersRead > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-1.5">
              <span>
                Pass #{currentPassNumber} ({currentPassChapters.toLocaleString()} of {TOTAL_PLAN_CHAPTERS.toLocaleString()} chapters)
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                {currentPassPercent}%
              </span>
            </div>

            <div
              className="h-2 w-full overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuenow={currentPassPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Pass ${currentPassNumber} progress`}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out-expo"
                style={{ width: `${currentPassPercent}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border/50 pt-5">
          <div>
            <p className="stat-display text-2xl leading-none">{summary.totalCycles}</p>
            <p className="mt-1 text-2xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              cycles done
            </p>
          </div>
          <div className="border-x border-border/50 px-2 sm:px-3 text-center sm:text-left">
            <p className="stat-display text-2xl leading-none">{summary.averagePercent}%</p>
            <p className="mt-1 text-2xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              avg cycle
            </p>
          </div>
          <div className="text-right sm:text-left">
            <p className="stat-display text-2xl leading-none">{summary.distinctChapters}</p>
            <p className="mt-1 text-2xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              unique ch ({summary.coveragePercent}%)
            </p>
          </div>
        </div>
      </section>

      {/* ── Exploration Links ── */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/bible-map"
          className="surface-interactive flex items-center justify-between gap-3 p-4 focus-ring"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold leading-tight">66-Book Bible Map</h3>
              <p className="text-xs text-muted-foreground">
                {summary.coveragePercent}% visual chapter heatmap
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Link>

        <Link
          to="/milestones"
          className="surface-interactive flex items-center justify-between gap-3 p-4 focus-ring"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
              <Trophy className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold leading-tight">Milestones & Goals</h3>
              <p className="text-xs text-muted-foreground truncate">
                {summary.closestTrack
                  ? `${summary.closestTrack.listName} is ${summary.closestTrack.totalChapters - summary.closestTrack.chaptersIntoCycle} ch away`
                  : "Upcoming cycle milestones"}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Link>
      </div>

      {/* ── The 10 Reading Tracks (Clean & Simple) ── */}
      <section aria-labelledby="reading-tracks" className="mt-8">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <div className="flex items-center gap-3">
            <h2 id="reading-tracks" className="section-label">
              Every list
            </h2>

            {/* Simple quiet sort buttons */}
            <div className="flex rounded-lg bg-secondary/60 p-0.5">
              {[
                { mode: "track" as const, label: "1–10" },
                { mode: "closest" as const, label: "Near finish" },
                { mode: "cycles" as const, label: "Cycles" },
              ].map(({ mode, label }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSortMode(mode)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[0.62rem] font-bold transition-colors cursor-pointer",
                    sortMode === mode
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Link
            to="/lists"
            className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline focus-ring"
          >
            All chapters
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        <ul className="space-y-2">
          {sortedListPositions.map((position) => {
            const list = getList(position.listId);
            if (!list) return null;

            const accent = `hsl(var(${list.colorVar}))`;
            const remaining = position.totalChapters - position.chaptersIntoCycle;
            const cycleNumber = position.completedCycles + 1;

            return (
              <li key={position.listId}>
                <Link
                  to="/lists"
                  className="surface-interactive block p-4 focus-ring"
                  aria-label={`${list.name}: ${position.progressPercent}% through cycle ${cycleNumber}`}
                >
                  <div className="mb-2 flex items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: accent }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">
                      {list.name}
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                      {position.completedCycles > 0 && (
                        <span className="mr-1.5 text-foreground/80 font-bold">
                          {position.completedCycles}×
                        </span>
                      )}
                      {position.progressPercent}%
                    </span>
                  </div>

                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-secondary"
                    role="progressbar"
                    aria-valuenow={position.progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${list.name} cycle progress`}
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-500 ease-out-expo"
                      style={{ width: `${position.progressPercent}%`, backgroundColor: accent }}
                    />
                  </div>

                  <div className="mt-2 flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
                    <span className="min-w-0 truncate">
                      Next: <strong className="text-foreground font-semibold">{position.nextChapter.book} {position.nextChapter.chapter}</strong>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {position.chaptersIntoCycle} of {position.totalChapters} ({remaining} {pluralize(remaining, "ch")} left)
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* ── How Horner Cycles Work Concept Card ── */}
        <div className="surface mt-6 flex items-start gap-3.5 p-4 sm:p-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              How Horner cycles work
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              A cycle is one complete pass through every chapter in a list. Because list lengths vary from 28 chapters (Acts) to 250 chapters (Prophets), each track advances and resets at its own natural velocity — generating a fresh scripture combination every single day.
            </p>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}


