import { useMemo, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { useCloudProgress } from "@/hooks/useCloudProgress";
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

  // Calculate weekly/monthly data
  const chartData = useMemo(() => {
    const data: { label: string; chapters: number; fullDate: string }[] = [];

    if (viewMode === "week") {
      // Get 7 days ending at today + weekOffset
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i + weekOffset * 7);
        const dayOfYear = getDayOfYear(date);

        // Count completed readings for this day
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
      // Get last 4 weeks
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

    // Days since start
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

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center">
          <h1 className="text-lg font-semibold text-foreground">History</h1>
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
                      stopColor="hsl(var(--foreground))"
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--foreground))"
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
                  stroke="hsl(var(--foreground))"
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
            <TrendingUp className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-lg font-semibold text-foreground">{streakCount}</p>
            <p className="text-2xs text-muted-foreground">Day Streak</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <BookOpen className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-lg font-semibold text-foreground">
              {totalChaptersRead}
            </p>
            <p className="text-2xs text-muted-foreground">Total Read</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <Calendar className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-lg font-semibold text-foreground">
              {stats.daysSinceStart}
            </p>
            <p className="text-2xs text-muted-foreground">Days Active</p>
          </div>
        </div>

        {/* Daily Tip */}
        <div className="card-elevated p-4 bg-secondary/30">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4 text-muted-foreground" />
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

        {/* List Progress Summary */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Track Progress
          </h2>
          <div className="grid grid-cols-5 gap-2">
            {readingLists.map((list) => {
              const totalChapters = list.books.reduce(
                (sum, b) => sum + b.chapters,
                0
              );
              // Count completed for this list
              let completedCount = 0;
              completedSet.forEach((key) => {
                if (key.endsWith(`-${list.id}`)) completedCount++;
              });
              const cyclesCompleted = Math.floor(completedCount / totalChapters);

              return (
                <div
                  key={list.id}
                  className="card-elevated p-3 text-center"
                  title={`${list.name}: ${cyclesCompleted} cycles completed`}
                >
                  <div
                    className="w-6 h-6 rounded-lg mx-auto mb-1.5 flex items-center justify-center text-xs font-semibold text-white"
                    style={{ backgroundColor: `hsl(${list.colorVar})` }}
                  >
                    {list.id}
                  </div>
                  <p className="text-2xs text-muted-foreground truncate">
                    {cyclesCompleted}×
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default History;