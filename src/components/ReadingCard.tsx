import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodayReading } from "@/lib/readingPlan";
import { motion, AnimatePresence } from "framer-motion";

interface ReadingCardProps {
  reading: TodayReading;
  onToggle: () => void;
  onOpenReader?: () => void;
  index: number;
}

export function ReadingCard({ reading, onToggle, onOpenReader, index }: ReadingCardProps) {
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
        "w-full group relative flex items-center gap-4 p-4 rounded-2xl border text-left min-h-[76px] focus-ring overflow-hidden",
        reading.completed
          ? "bg-success/10 border-success/30 shadow-sm"
          : "glass-card hover:shadow-md transition-shadow"
      )}
      onClick={onOpenReader || onToggle}
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

      {/* Completion indicator with spring animation - now an interactive button */}
      <motion.button
        layout
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ml-2 shadow-sm z-10 transition-transform hover:scale-105 active:scale-95",
          reading.completed
            ? "bg-success text-success-foreground"
            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
        )}
        aria-label={reading.completed ? "Unmark as read" : "Mark as read"}
      >
        <AnimatePresence mode="wait">
          {reading.completed ? (
            <motion.div
              key="check"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 45 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
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
      </motion.button>

      {/* Reading details */}
      <div className="flex-1 min-w-0 z-10">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-0.5 block">
          {reading.listName}
        </span>
        <h3
          className={cn(
            "font-heading font-semibold text-lg transition-colors leading-tight",
            reading.completed ? "text-success" : "text-foreground"
          )}
        >
          {reading.book} {reading.chapter}
        </h3>
      </div>

      {/* Mark as read text */}
      <span
        className={cn(
          "text-[10px] font-bold uppercase tracking-wider transition-colors z-10",
          reading.completed ? "text-success/80" : "text-muted-foreground/60 group-hover:text-primary/70"
        )}
        aria-hidden="true"
      >
        {reading.completed ? "Done" : "Mark"}
      </span>
    </motion.button>
  );
}