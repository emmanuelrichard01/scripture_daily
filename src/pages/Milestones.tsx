import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { useCloudProgress } from "@/hooks/useCloudProgress";
import { useCycleMilestones } from "@/hooks/useCycleMilestones";
import { ArrowLeft, Trophy } from "lucide-react";

export default function Milestones() {
  const navigate = useNavigate();
  const { completedSet } = useCloudProgress();
  const { cycleStats, totalStats } = useCycleMilestones(completedSet);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" aria-hidden="true" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Milestones</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-5" role="main" aria-label="Reading milestones">
        <div className="card-elevated p-4 bg-gradient-to-br from-track-yellow/5 to-track-blue/5">
          <p className="text-2xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Overview</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-semibold text-foreground">{totalStats.totalCycles}</p>
              <p className="text-2xs text-muted-foreground">total completed cycles</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{totalStats.totalChapters}</p>
              <p className="text-2xs text-muted-foreground">chapters completed</p>
            </div>
          </div>

          {totalStats.mostReadList && (
            <div className="mt-4 pt-4 border-t border-border/60">
              <p className="text-sm text-foreground">
                Most revisited: <span className="font-medium">{totalStats.mostReadList.listName}</span>
              </p>
              <p className="text-xs text-muted-foreground">{totalStats.mostReadList.completedCycles} cycle{totalStats.mostReadList.completedCycles === 1 ? "" : "s"}</p>
            </div>
          )}
        </div>

        <section aria-label="Per-track milestones" className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">By track</h2>
            <span className="text-2xs text-muted-foreground">10 tracks</span>
          </div>

          <div className="space-y-2" role="list">
            {cycleStats.map((stat) => (
              <div key={stat.listId} className="card-elevated p-4" role="listitem">
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `hsl(var(${stat.colorVar}) / 0.14)` }}
                    aria-hidden="true"
                  >
                    <Trophy className="w-4 h-4" style={{ color: `hsl(var(${stat.colorVar}))` }} aria-hidden="true" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground truncate">{stat.listName}</p>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {stat.completedCycles} cycle{stat.completedCycles === 1 ? "" : "s"}
                      </p>
                    </div>

                    <p className="mt-0.5 text-2xs text-muted-foreground">
                      {stat.completedCycles > 0
                        ? `You've read ${stat.listName} ${stat.completedCycles} time${stat.completedCycles === 1 ? "" : "s"}`
                        : `Progress: ${stat.progressPercent}% of this cycle`}
                    </p>

                    <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden" aria-hidden="true">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${stat.progressPercent}%`,
                          backgroundColor: `hsl(var(${stat.colorVar}))`,
                        }}
                      />
                    </div>

                    <p className="mt-2 text-2xs text-muted-foreground">
                      {stat.completedChapters} chapters marked complete
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="text-2xs text-muted-foreground">
          Milestones are counted quietly per track—each time you complete every chapter in a list, it counts as one full cycle.
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
