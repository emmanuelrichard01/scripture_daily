import { ProgressRing } from "./ProgressRing";
import { Check } from "lucide-react";
import { pluralize } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TodayProgressProps {
  completed: number;
  total: number;
  isComplete: boolean;
}

export function TodayProgress({ completed, total, isComplete }: TodayProgressProps) {
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = total - completed;

  return (
    <div className="surface-hero p-5 flex items-center gap-5 relative overflow-hidden">
      
      {/* Celebration background glow */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent pointer-events-none"
          />
        )}
      </AnimatePresence>

      <ProgressRing progress={progress} size={92} strokeWidth={7}>
        <div className="text-center leading-none">
          <AnimatePresence mode="wait">
            {isComplete ? (
              <motion.div
                key="complete-check"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Check className="w-8 h-8 text-success drop-shadow-sm" strokeWidth={2.5} aria-hidden="true" />
              </motion.div>
            ) : (
              <motion.div
                key="progress-count"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex items-baseline justify-center"
              >
                <span className="text-2xl font-bold tabular-nums text-foreground tracking-tight">
                  {completed}
                </span>
                <span className="text-muted-foreground text-sm font-medium tabular-nums ml-0.5">
                  /{total}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ProgressRing>

      <div className="flex-1 min-w-0 z-10">
        <AnimatePresence mode="wait">
          <motion.h2
            key={isComplete ? "title-complete" : "title-progress"}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-base font-bold text-foreground mb-0.5"
          >
            {isComplete ? "Today's reading complete" : "Today's Reading"}
          </motion.h2>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.p
            key={isComplete ? "desc-complete" : "desc-progress"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-medium text-muted-foreground"
          >
            {isComplete
              ? "Well done. All 10 chapters finished."
              : `${remaining} ${pluralize(remaining, "chapter")} remaining`}
          </motion.p>
        </AnimatePresence>

        {/* Linear Progress bar */}
        <div
          className="mt-4 h-1.5 bg-secondary rounded-full overflow-hidden shadow-inner"
          role="progressbar"
          aria-valuenow={completed}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Chapters completed today"
        >
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ 
              width: `${progress}%`,
              backgroundColor: isComplete ? "hsl(var(--success))" : "hsl(var(--primary))"
            }}
            transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
          />
        </div>
      </div>
    </div>
  );
}
