import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "week" | "month";

interface ChartData {
  label: string;
  chapters: number;
  fullDate: string;
}

interface HistoryChartProps {
  data: ChartData[];
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  weekOffset: number;
  setWeekOffset: (offset: number) => void;
  avgPerDay: string;
  completionRate: number;
  maxPerDay: number;
}

export function HistoryChart({
  data,
  viewMode,
  setViewMode,
  weekOffset,
  setWeekOffset,
  avgPerDay,
  completionRate,
  maxPerDay,
}: HistoryChartProps) {
  return (
    <div className="card-elevated p-5 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-bold text-foreground tracking-tight">Reading Volume</h2>
        <div className="flex bg-secondary p-1 rounded-xl">
          <button
            onClick={() => {
              setViewMode("week");
              setWeekOffset(0);
            }}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all focus-ring",
              viewMode === "week"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Week
          </button>
          <button
            onClick={() => {
              setViewMode("month");
              setWeekOffset(0);
            }}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all focus-ring",
              viewMode === "month"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Month
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {avgPerDay}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              ch / day
            </span>
          </div>
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mt-1">
            <TrendingUp className="w-3 h-3 text-primary" />
            <span className={completionRate >= 50 ? "text-success" : "text-muted-foreground"}>
              {completionRate.toFixed(0)}% completion rate
            </span>
          </p>
        </div>

        {viewMode === "week" && (
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-1.5 rounded-md hover:bg-background transition-colors focus-ring"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-2 min-w-[60px] text-center">
              {weekOffset === 0 ? "This Wk" : weekOffset === -1 ? "Last Wk" : Math.abs(weekOffset) + "w ago"}
            </span>
            <button
              onClick={() => setWeekOffset((prev) => Math.min(0, prev + 1))}
              disabled={weekOffset === 0}
              className="p-1.5 rounded-md hover:bg-background transition-colors disabled:opacity-30 focus-ring"
              aria-label="Next week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="h-[200px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorChapters" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              dy={10}
            />
            <YAxis
              hide
              domain={[0, viewMode === "week" ? maxPerDay : maxPerDay * 7]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-popover text-popover-foreground border border-border p-3 rounded-xl shadow-lg">
                      <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                        {payload[0].payload.fullDate}
                      </p>
                      <p className="font-bold">
                        {payload[0].value} {payload[0].value === 1 ? "chapter" : "chapters"}
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
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorChapters)"
              animationDuration={1000}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
