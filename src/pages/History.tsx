import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { useCloudProgress } from "@/hooks/useCloudProgress";
import { ShareableProgressCard } from "@/components/ShareableProgressCard";
import {
  getDayOfYear,
  readingLists,
  hornerFacts,
  readingTips,
} from "@/lib/readingPlan";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BookOpen,
  Calendar,
  Lightbulb,
  Info,
  Share2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type ViewMode = "week" | "month";

const History = () => {
  const { completedSet, totalChaptersRead, streakCount, startDate } =
    useCloudProgress();
  const today = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedTip, setExpandedTip] = useState<number | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [expandedTrack, setExpandedTrack] = useState<number | null>(null);

  // Calculate weekly/monthly data
  const chartData = useMemo(() => {
    const data: { label: string; chapters: number; fullDate: string }[] = [];

    if (viewMode === "week") {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i + weekOffset * 7);
        const dayOfYear = getDayOfYear(date);

        let completedCount = 0;
        for (let listId = 1; listId <= 10; listId++) {
          if (completedSet.has(`${dayOfYear}-${listId}`)) {
            completedCount++;
          }
        }

        data.push({
          label: date.toLocaleDateString("en-US", { weekday: "short" }),
          chapters: completedCount,
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
          const dayOfYear = getDayOfYear(date);

          for (let listId = 1; listId <= 10; listId++) {
            if (completedSet.has(`${dayOfYear}-${listId}`)) {
              weekTotal++;
            }
          }
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
  }, [completedSet, viewMode, weekOffset, today]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalThisWeek = chartData.reduce((sum, d) => sum + d.chapters, 0);
    const avgPerDay =
      viewMode === "week"
        ? (totalThisWeek / 7).toFixed(1)
        : (totalThisWeek / 28).toFixed(1);
    const completionRate = viewMode === "week" 
      ? ((totalThisWeek / 70) * 100).toFixed(0)
      : ((totalThisWeek / 280) * 100).toFixed(0);

    const start = new Date(startDate);
    const daysSinceStart = Math.max(
      1,
      Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );

    return {
      totalThisWeek,
      avgPerDay,
      completionRate,
      daysSinceStart,
    };
  }, [chartData, viewMode, startDate, today]);

  // Get current week date range
  const weekDateRange = useMemo(() => {
    if (viewMode !== "week") return "";
    const startDay = new Date(today);
    startDay.setDate(startDay.getDate() - 6 + weekOffset * 7);
    const endDay = new Date(today);
    endDay.setDate(endDay.getDate() + weekOffset * 7);

    return `${startDay.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} – ${endDay.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
  }, [weekOffset, today, viewMode]);

  // Random tip for today
  const dailyTip = useMemo(() => {
    const dayOfYear = getDayOfYear(today);
    return readingTips[dayOfYear % readingTips.length];
  }, [today]);

  // Track progress with more detail
  const trackProgress = useMemo(() => {
    return readingLists.map((list) => {
      const totalChapters = list.books.reduce((sum, b) => sum + b.chapters, 0);
      let completedCount = 0;
      completedSet.forEach((key) => {
        if (key.endsWith(`-${list.id}`)) completedCount++;
      });
      const cyclesCompleted = Math.floor(completedCount / totalChapters);
      const currentCycleProgress = completedCount % totalChapters;
      const progressPercent = (currentCycleProgress / totalChapters) * 100;

      return {
        ...list,
        totalChapters,
        completedCount,
        cyclesCompleted,
        currentCycleProgress,
        progressPercent,
      };
    });
  }, [completedSet]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">History</h1>
          <button
            onClick={() => setShowShareCard(true)}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <Share2 className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-6">
        {/* View toggle */}
        <div className="flex items-center gap-2 p-1 bg-secondary rounded-xl">
          <button
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all",
              viewMode === "week"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
            onClick={() => setViewMode("week")}
          >
            Weekly
          </button>
          <button
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all",
              viewMode === "month"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
            onClick={() => setViewMode("month")}
          >
            Monthly
          </button>
        </div>

        {/* Week navigation */}
        {viewMode === "week" && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <span className="text-sm font-medium text-foreground">
              {weekDateRange}
            </span>
            <button
              onClick={() => setWeekOffset((o) => Math.min(0, o + 1))}
              disabled={weekOffset >= 0}
              className={cn(
                "p-2 rounded-xl transition-colors",
                weekOffset >= 0
                  ? "opacity-30"
                  : "hover:bg-secondary"
              )}
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Chart */}
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">
                Chapters Read
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {stats.totalThisWeek}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">
                Completion
              </p>
              <p className="text-lg font-semibold text-foreground">
                {stats.completionRate}%
              </p>
            </div>
          </div>

          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorChapters" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--track-blue))"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--track-blue))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  dy={8}
                />
                <YAxis hide domain={[0, "auto"]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
                          <p className="text-xs text-muted-foreground">
                            {payload[0].payload.fullDate}
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {payload[0].value} chapters
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="chapters"
                  stroke="hsl(var(--track-blue))"
                  strokeWidth={2}
                  fill="url(#colorChapters)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card-elevated p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-track-orange/10 flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-4 h-4 text-track-orange" />
            </div>
            <p className="text-lg font-semibold text-foreground">{streakCount}</p>
            <p className="text-2xs text-muted-foreground">Day Streak</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-track-blue/10 flex items-center justify-center mx-auto mb-2">
              <BookOpen className="w-4 h-4 text-track-blue" />
            </div>
            <p className="text-lg font-semibold text-foreground">
              {totalChaptersRead}
            </p>
            <p className="text-2xs text-muted-foreground">Total Read</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <div className="w-8 h-8 rounded-lg bg-track-green/10 flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-4 h-4 text-track-green" />
            </div>
            <p className="text-lg font-semibold text-foreground">
              {stats.daysSinceStart}
            </p>
            <p className="text-2xs text-muted-foreground">Days Active</p>
          </div>
        </div>

        {/* Track Progress - Redesigned for mobile */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">
              Track Progress
            </h2>
            <Link
              to="/lists"
              className="text-2xs text-track-blue font-medium"
            >
              View all →
            </Link>
          </div>
          
          <div className="space-y-2" role="list" aria-label="Reading track progress">
            {trackProgress.map((track) => (
              <button
                key={track.id}
                onClick={() => setExpandedTrack(expandedTrack === track.id ? null : track.id)}
                className="w-full card-interactive p-3 min-h-[72px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-expanded={expandedTrack === track.id}
                aria-label={`${track.name}: ${track.currentCycleProgress} of ${track.totalChapters} chapters, ${track.cyclesCompleted} cycles completed`}
              >
                <div className="flex items-center gap-3">
                  {/* Color indicator */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                    style={{ backgroundColor: `hsl(var(${track.colorVar}))` }}
                    aria-hidden="true"
                  >
                    {track.cyclesCompleted > 0 ? `${track.cyclesCompleted}×` : track.id}
                  </div>
                  
                  {/* Track info */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {track.name}
                      </p>
                      <ChevronDown 
                        className={cn(
                          "w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ml-2",
                          expandedTrack === track.id && "rotate-180"
                        )}
                      />
                    </div>
                    
                    {/* Progress bar */}
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
                        style={{
                          width: `${track.progressPercent}%`,
                          backgroundColor: `hsl(var(${track.colorVar}))`,
                        }}
                      />
                    </div>
                    
                    <p className="text-2xs text-muted-foreground mt-1">
                      {track.currentCycleProgress} / {track.totalChapters} chapters
                    </p>
                  </div>
                </div>
                
                {/* Expanded content */}
                {expandedTrack === track.id && (
                  <div className="mt-3 pt-3 border-t border-border/50 animate-fade-in">
                    <p className="text-xs text-muted-foreground mb-2">
                      {track.description}
                    </p>
                    <div className="flex gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Cycles: </span>
                        <span className="font-medium text-foreground">{track.cyclesCompleted}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total read: </span>
                        <span className="font-medium text-foreground">{track.completedCount}</span>
                      </div>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Daily Tip */}
        <div className="card-elevated p-4 bg-track-yellow/5 border-track-yellow/10">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-track-yellow/10 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4 text-track-yellow" />
            </div>
            <div>
              <p className="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Daily Tip
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {dailyTip}
              </p>
            </div>
          </div>
        </div>

        {/* Horner's System Facts */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              About Horner's System
            </h2>
          </div>
          <div className="space-y-2">
            {hornerFacts.map((fact, index) => (
              <button
                key={index}
                className={cn(
                  "w-full text-left card-interactive p-4 transition-all",
                  expandedTip === index && "bg-secondary/50"
                )}
                onClick={() =>
                  setExpandedTip(expandedTip === index ? null : index)
                }
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-foreground">
                    {fact.title}
                  </h3>
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      expandedTip === index && "rotate-90"
                    )}
                  />
                </div>
                {expandedTip === index && (
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed animate-fade-in">
                    {fact.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      </main>

      <ShareableProgressCard
        isOpen={showShareCard}
        onClose={() => setShowShareCard(false)}
      />

      <BottomNav />
    </div>
  );
};

export default History;
