import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useCycleMilestones } from "@/hooks/useCycleMilestones";

/**
 * Quiet acknowledgements when a user completes a full cycle in any track.
 * This is intentionally subtle (non-celebratory) to match the app's tone.
 */
export function useMilestoneAcknowledgements(completedSet: Set<string>) {
  const { cycleStats, checkMilestones } = useCycleMilestones(completedSet);
  const prevCountsRef = useRef<Map<number, number>>(new Map());
  const initializedRef = useRef(false);

  useEffect(() => {
    // Avoid firing toasts on initial load.
    if (!initializedRef.current) {
      cycleStats.forEach((s) => prevCountsRef.current.set(s.listId, s.completedChapters));
      initializedRef.current = true;
      return;
    }

    for (const stat of cycleStats) {
      const prev = prevCountsRef.current.get(stat.listId);
      if (prev === undefined) {
        prevCountsRef.current.set(stat.listId, stat.completedChapters);
        continue;
      }

      if (stat.completedChapters > prev) {
        const milestone = checkMilestones(stat.listId, prev);
        if (milestone?.type === "cycle_complete") {
          const cycles = milestone.cycleNumber ?? stat.completedCycles;
          toast(`Quiet milestone: ${stat.listName} × ${cycles}`, {
            duration: 4500,
          });
        }
      }

      prevCountsRef.current.set(stat.listId, stat.completedChapters);
    }
  }, [cycleStats, checkMilestones]);
}
