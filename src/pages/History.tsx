import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { useCloudProgress } from "@/hooks/useCloudProgress";
import { ShareableProgressCard } from "@/components/ShareableProgressCard";
import { readingLists } from "@/lib/readingPlan";
import { getDateISO } from "@/lib/utils";
import { ChevronRight, Share2, Filter } from "lucide-react";
import { LifetimeStats } from "@/components/history/LifetimeStats";
import { HistoryChart } from "@/components/history/HistoryChart";
import { HornerFacts } from "@/components/history/HornerFacts";
import { AnimatePresence } from "framer-motion";

type ViewMode = "week" | "month";

const History = () => {
  const { history, totalChaptersRead } = useCloudProgress();
  const today = useMemo(() => new Date(), []);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [trackFilter, setTrackFilter] = useState<number | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);

  const trackIds = useMemo(
    () => (trackFilter === null ? readingLists.map((l) => l.id) : [trackFilter]),
    [trackFilter]
  );

  const maxPerDay = trackIds.length;

  // Calculate weekly/monthly data
  const chartData = useMemo(() => {
    const data: { label: string; chapters: number; fullDate: string }[] = [];

    const countForDay = (dateIso: string) => {
      const completedListIds = history[dateIso] || [];
      return trackIds.reduce(
        (sum, listId) => sum + (completedListIds.includes(listId) ? 1 : 0),
        0
      );
    };

    if (viewMode === "week") {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i + weekOffset * 7);

        data.push({
          label: date.toLocaleDateString("en-US", { weekday: "short" }),
          chapters: countForDay(getDateISO(date)),
          fullDate: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
        });
      }
    } else {
      for (let week = 3; week >= 0; week--) {
        let weekTotal = 0;
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - (week + 1) * 7 + 1);

        for (let day = 0; day < 7; day++) {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + day);
          weekTotal += countForDay(getDateISO(date));
        }

        data.push({
          label: `Week ${4 - week}`,
          chapters: weekTotal,
          fullDate: weekStart.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
        });
      }
    }

    return data;
  }, [history, viewMode, weekOffset, today, trackIds]);

  // Lifetime summary
  const lifetime = useMemo(() => {
    // Unique days read in general
    const daysSet = new Set<string>();
    
    // Total chapters read in the current month
    let monthChapters = 0;

    const currentMonthStr = getDateISO(today).substring(0, 7); // "YYYY-MM"

    for (const [dateStr, listIds] of Object.entries(history)) {
      if (listIds.length === 0) continue;
      
      const filteredListIds = trackFilter !== null ? listIds.filter(id => id === trackFilter) : listIds;
      if (filteredListIds.length === 0) continue;

      daysSet.add(dateStr);

      if (dateStr.startsWith(currentMonthStr)) {
        monthChapters += filteredListIds.length;
      }
    }

    const sortedDates = Array.from(daysSet).sort();
    let best = 0;
    let run = 0;
    let previousDate: Date | null = null;

    for (const dateStr of sortedDates) {
      const d = new Date(dateStr);
      if (previousDate) {
        const diffTime = Math.abs(d.getTime() - previousDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          run += 1;
        } else {
          run = 1;
        }
      } else {
        run = 1;
      }
      best = Math.max(best, run);
      previousDate = d;
    }

    return { bestStreak: best, monthChapters, activeDays: daysSet.size };
  }, [history, today, trackFilter]);

  // Calculate summary stats for chart
  const stats = useMemo(() => {
    const totalThisWeek = chartData.reduce((sum, d) => sum + d.chapters, 0);
    const days = viewMode === "week" ? 7 : 28;
    const avgPerDay = (totalThisWeek / days).toFixed(1);
    const completionRate = (
      (totalThisWeek / (days * maxPerDay)) *
      100
    );

    return { avgPerDay, completionRate, totalThisWeek };
  }, [chartData, viewMode, maxPerDay]);

  return (
    <div className="min-h-dvh bg-background pb-[88px]">
      <header className="sticky top-0 z-40 glass border-b border-border/50 shadow-sm">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            History
          </h1>
          <button
            onClick={() => setShowShareCard(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors focus-ring"
            aria-label="Share progress"
            aria-haspopup="dialog"
            aria-expanded={showShareCard}
          >
            <Share2 className="w-4 h-4" aria-hidden="true" />
            <span className="text-xs font-semibold">Share</span>
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 flex-1 flex flex-col">
        {totalChaptersRead === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground/50"
              >
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-2">No History Yet</h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-[240px]">
              Your reading journey will be mapped out here once you complete your first chapter.
            </p>
            <Link
              to="/"
              className="px-6 py-3 rounded-full bg-foreground text-background font-bold text-sm shadow-md hover:bg-foreground/90 transition-all focus-ring"
            >
              Start Reading
            </Link>
          </div>
        ) : (
          <>
            <LifetimeStats
              bestStreak={lifetime.bestStreak}
              totalChaptersRead={totalChaptersRead}
              monthChapters={lifetime.monthChapters}
              activeDays={lifetime.activeDays}
            />

        {/* Track Filter */}
        <div 
          className="flex items-center gap-3 overflow-x-auto pb-4 mb-2 scrollbar-none snap-x"
          role="radiogroup"
          aria-label="Filter history by track"
        >
          <div className="flex items-center gap-2 pl-1 snap-start">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            <button
              role="radio"
              aria-checked={trackFilter === null}
              onClick={() => setTrackFilter(null)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all focus-ring ${
                trackFilter === null
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              }`}
            >
              All Tracks
            </button>
          </div>
          {readingLists.map((list) => (
            <button
              key={list.id}
              role="radio"
              aria-checked={trackFilter === list.id}
              onClick={() => setTrackFilter(list.id)}
              className={`snap-start whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all focus-ring flex items-center gap-2 ${
                trackFilter === list.id
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              }`}
            >
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: `hsl(var(${list.colorVar}))` }}
                aria-hidden="true"
              />
              Track {list.id}
            </button>
          ))}
        </div>

        <HistoryChart
          data={chartData}
          viewMode={viewMode}
          setViewMode={setViewMode}
          weekOffset={weekOffset}
          setWeekOffset={setWeekOffset}
          avgPerDay={stats.avgPerDay}
          completionRate={stats.completionRate}
          maxPerDay={maxPerDay}
        />

        {/* Action Link to Progress Page */}
        <Link
          to="/progress"
          className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10 mb-8 hover:bg-primary/10 transition-colors focus-ring group"
          aria-label="View detailed milestones"
        >
          <div>
            <h3 className="font-bold text-sm text-foreground">Detailed Milestones</h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">View your trophies and streak data</p>
          </div>
          <ChevronRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" aria-hidden="true" />
        </Link>

        <HornerFacts />
          </>
        )}
      </main>

      <BottomNav />

      {/* Share Card Modal */}
      <AnimatePresence>
        {showShareCard && (
          <ShareableProgressCard
            streak={lifetime.bestStreak} 
            totalChapters={totalChaptersRead}
            onClose={() => setShowShareCard(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default History;
