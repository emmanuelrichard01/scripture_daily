import { Trophy, Flame, Calendar, BookOpen } from "lucide-react";
import { cn, pluralize } from "@/lib/utils";

interface LifetimeStatsProps {
  bestStreak: number;
  totalChaptersRead: number;
  monthChapters: number;
  activeDays: number;
}

export function LifetimeStats({
  bestStreak,
  totalChaptersRead,
  monthChapters,
  activeDays,
}: LifetimeStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-muted-foreground">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Lifetime
          </span>
        </div>
        <p className="text-2xl font-bold tracking-tight text-foreground">
          {totalChaptersRead}
        </p>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">
          {pluralize(totalChaptersRead, "chapter")} read
        </p>
      </div>

      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-muted-foreground">
          <Flame className="w-4 h-4 text-track-orange" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Best Streak
          </span>
        </div>
        <p className="text-2xl font-bold tracking-tight text-foreground">
          {bestStreak}
        </p>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">
          {pluralize(bestStreak, "day")} in a row
        </p>
      </div>

      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-muted-foreground">
          <Calendar className="w-4 h-4 text-track-green" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            This Month
          </span>
        </div>
        <p className="text-2xl font-bold tracking-tight text-foreground">
          {monthChapters}
        </p>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">
          {pluralize(monthChapters, "chapter")}
        </p>
      </div>

      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-muted-foreground">
          <BookOpen className="w-4 h-4 text-track-purple" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Active Days
          </span>
        </div>
        <p className="text-2xl font-bold tracking-tight text-foreground">
          {activeDays}
        </p>
        <p className="text-xs font-medium text-muted-foreground mt-0.5">
          days reading
        </p>
      </div>
    </div>
  );
}
