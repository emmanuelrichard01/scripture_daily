import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMediumDate } from "@/lib/date";
import { pluralize } from "@/lib/utils";

export interface ChartPoint {
  label: string;
  /** ISO date the point starts at, shown in the tooltip. */
  fullDate: string;
  chapters: number;
}

interface HistoryChartProps {
  data: ChartPoint[];
  /** Fixes the y-axis so bar heights stay comparable between periods. */
  maxValue: number;
}

/**
 * Reading volume per period.
 *
 * Bars rather than an area chart: reading is a discrete daily count, and an
 * interpolated curve implied continuous values between days that do not exist.
 * Bars also make a missed day visibly empty instead of a dip in a line.
 */
export function HistoryChart({ data, maxValue }: HistoryChartProps) {
  return (
    <div className="-mx-1.5 h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 6, left: 6, bottom: 0 }} barCategoryGap="22%">
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            dy={8}
            tick={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }}
          />
          {/* Hidden but fixed: an auto domain would rescale between periods and
              make a quiet week look identical to a strong one. */}
          <YAxis hide domain={[0, maxValue]} />

          <Tooltip
            cursor={{ fill: "hsl(var(--foreground) / 0.04)", radius: 8 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as ChartPoint;
              return (
                <div className="rounded-xl border border-border bg-popover px-3 py-2 text-popover-foreground shadow-lg">
                  <p className="text-2xs font-bold uppercase tracking-wide text-muted-foreground">
                    {formatMediumDate(point.fullDate)}
                  </p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums">
                    {point.chapters} {pluralize(point.chapters, "chapter")}
                  </p>
                </div>
              );
            }}
          />

          <Bar dataKey="chapters" radius={[6, 6, 6, 6]} animationDuration={500}>
            {data.map((point, index) => (
              <Cell
                key={index}
                // A full day earns the solid accent; partial days are muted, so
                // the shape of a strong week is readable at a glance.
                fill={
                  point.chapters >= maxValue
                    ? "hsl(var(--primary))"
                    : point.chapters > 0
                      ? "hsl(var(--primary) / 0.45)"
                      : "hsl(var(--secondary))"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
