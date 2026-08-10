import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodayReading } from "@/lib/readingPlan";
import { motion, AnimatePresence } from "framer-motion";

interface ReadingCardProps {
  reading: TodayReading;
  onToggle: () => void;
  index: number;
}

export function ReadingCard({ reading, onToggle, index }: ReadingCardProps) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.05,
        ease: [0.22, 1, 0.36, 1] // ease-spring
      }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "w-full group relative flex items-center gap-4 p-4 rounded-2xl border text-left min-h-[72px] focus-ring overflow-hidden",
        reading.completed
          ? "bg-success/5 border-success/20 shadow-sm"
          : "glass-card hover:shadow-md transition-shadow"
      )}
      onClick={onToggle}
      aria-pressed={reading.completed}
      aria-label={`${reading.book} chapter ${reading.chapter} from ${reading.listName}. ${reading.completed ? "Completed" : "Not completed"}. Tap to ${reading.completed ? "unmark" : "mark as read"}.`}
    >
      {/* Background glow when completed */}
      <AnimatePresence>
        {reading.completed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-r from-success/10 to-transparent pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Track color indicator - left edge */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-300",
          reading.completed ? "bg-success" : ""
        )}
        style={{ 
          backgroundColor: !reading.completed ? `hsl(var(${reading.colorVar}))` : undefined 
        }}
        aria-hidden="true"
      />

      {/* Completion indicator with spring animation */}
      <motion.div
        layout
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ml-2 shadow-sm z-10",
          reading.completed
            ? "bg-success text-success-foreground"
            : "bg-secondary text-muted-foreground"
        )}
        aria-hidden="true"
      >
        <AnimatePresence mode="wait">
          {reading.completed ? (
            <motion.div
              key="check"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 45 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Check className="w-5 h-5" strokeWidth={2.5} />
            </motion.div>
          ) : (
            <motion.span
              key="number"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm font-semibold"
            >
              {reading.listId}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Reading details */}
      <div className="flex-1 min-w-0 z-10">
        <span className="text-label">
          {reading.listName}
        </span>
        <h3
          className={cn(
            "font-semibold text-base transition-colors",
            reading.completed ? "text-success" : "text-foreground"
          )}
        >
          {reading.book} {reading.chapter}
        </h3>
      </div>

      {/* Mark as read text */}
      <span
        className={cn(
          "text-xs font-semibold uppercase tracking-wider transition-colors z-10",
          reading.completed ? "text-success" : "text-muted-foreground"
        )}
        aria-hidden="true"
      >
        {reading.completed ? "Done" : "Mark"}
      </span>
    </motion.button>
  );
}