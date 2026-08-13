import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { useProgress } from "@/hooks/useProgress";
import { getList, TOTAL_PLAN_CHAPTERS } from "@/lib/readingPlan";
import { pluralize } from "@/lib/utils";

export default function Progress() {
  const { listPositions, totalChaptersRead } = useProgress();

  const summary = useMemo(() => {
    const totalCycles = listPositions.reduce((sum, item) => sum + item.completedCycles, 0);
    const averagePercent = Math.round(
      listPositions.reduce((sum, item) => sum + item.progressPercent, 0) /
        Math.max(1, listPositions.length),
    );
    return { totalCycles, averagePercent };
  }, [listPositions]);

  /** Complete passes through the whole Bible, by volume. */
  const biblesRead = totalChaptersRead / TOTAL_PLAN_CHAPTERS;

  return (
    <PageLayout
      title="Progress"
      description="Each list advances only when you mark a chapter read — never by the calendar."
    >
      {/* ── Headline ── */}
      <section className="surface-raised relative overflow-hidden p-6" aria-label="Overall">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative">
          <p className="section-label">Chapters read</p>
          <p className="stat-display mt-1.5 text-5xl leading-none">
            {totalChaptersRead.toLocaleString()}
          </p>

          {totalChaptersRead > 0 && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              That's{" "}
              <span className="font-semibold text-foreground">{biblesRead.toFixed(2)}×</span>{" "}
              the whole Bible by volume — {TOTAL_PLAN_CHAPTERS.toLocaleString()} chapters
              make one full pass.
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/60 pt-5">
            <div>
              <p className="stat-display text-2xl leading-none">{summary.totalCycles}</p>
              <p className="mt-1 text-2xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                cycles completed
              </p>
            </div>
            <div>
              <p className="stat-display text-2xl leading-none">{summary.averagePercent}%</p>
              <p className="mt-1 text-2xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                average cycle
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── By list ── */}
      <div className="mb-3 mt-8 flex items-baseline justify-between">
        <h2 className="section-label">Every list</h2>
        <Link
          to="/lists"
          className="flex items-center gap-0.5 rounded text-xs font-semibold text-primary hover:underline focus-ring"
        >
          All chapters
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <ul className="space-y-2">
        {listPositions.map((position, index) => {
          const list = getList(position.listId);
          if (!list) return null;

          const accent = `hsl(var(${list.colorVar}))`;

          return (
            <li
              key={position.listId}
              className="animate-rise"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <Link
                to="/lists"
                className="surface-interactive block p-4 focus-ring"
                aria-label={`${list.name}: ${position.progressPercent}% through cycle ${
                  position.completedCycles + 1
                }`}
              >
                <div className="mb-2.5 flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: accent }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">
                    {list.name}
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
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
                    className="h-full rounded-full transition-[width] duration-700 ease-out-expo"
                    style={{ width: `${position.progressPercent}%`, backgroundColor: accent }}
                  />
                </div>

                <div className="mt-2 flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
                  <span className="min-w-0 truncate">
                    Next: {position.nextChapter.book} {position.nextChapter.chapter}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {position.completedCycles > 0
                      ? `${position.completedCycles} ${pluralize(
                          position.completedCycles,
                          "cycle",
                        )}`
                      : `${position.chaptersIntoCycle} of ${position.totalChapters}`}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </PageLayout>
  );
}
