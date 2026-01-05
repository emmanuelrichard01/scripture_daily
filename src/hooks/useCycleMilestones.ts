import { useMemo, useCallback } from "react";
import { readingLists } from "@/lib/readingPlan";

interface CycleStats {
  listId: number;
  listName: string;
  colorVar: string;
  completedChapters: number;
  totalChapters: number;
  completedCycles: number;
  progressPercent: number;
}

interface MilestoneEvent {
  type: "cycle_complete" | "halfway" | "first_chapter";
  listId: number;
  listName: string;
  cycleNumber?: number;
  message: string;
}

export function useCycleMilestones(completedSet: Set<string>) {
  // Calculate cycle stats for each reading list
  const cycleStats = useMemo((): CycleStats[] => {
    return readingLists.map((list) => {
      const totalChapters = list.books.reduce((sum, b) => sum + b.chapters, 0);
      
      // Count completed chapters for this list
      let completedCount = 0;
      completedSet.forEach((key) => {
        if (key.endsWith(`-${list.id}`)) {
          completedCount++;
        }
      });

      const completedCycles = Math.floor(completedCount / totalChapters);
      const currentCycleProgress = completedCount % totalChapters;
      const progressPercent = Math.round((currentCycleProgress / totalChapters) * 100);

      return {
        listId: list.id,
        listName: list.name,
        colorVar: list.colorVar,
        completedChapters: completedCount,
        totalChapters,
        completedCycles,
        progressPercent,
      };
    });
  }, [completedSet]);

  // Calculate total stats
  const totalStats = useMemo(() => {
    const totalCycles = cycleStats.reduce((sum, s) => sum + s.completedCycles, 0);
    const totalChapters = cycleStats.reduce((sum, s) => sum + s.completedChapters, 0);
    
    // Find the list with most completed cycles
    const mostReadList = cycleStats.reduce((max, s) => 
      s.completedCycles > max.completedCycles ? s : max
    , cycleStats[0]);

    return {
      totalCycles,
      totalChapters,
      mostReadList: mostReadList.completedCycles > 0 ? mostReadList : null,
    };
  }, [cycleStats]);

  // Check for new milestones (would be called after marking complete)
  const checkMilestones = useCallback(
    (listId: number, previousCount: number): MilestoneEvent | null => {
      const stat = cycleStats.find((s) => s.listId === listId);
      if (!stat) return null;

      const currentCount = stat.completedChapters;
      const totalChapters = stat.totalChapters;

      // First chapter ever
      if (previousCount === 0 && currentCount === 1) {
        return {
          type: "first_chapter",
          listId,
          listName: stat.listName,
          message: `You've started reading ${stat.listName}!`,
        };
      }

      // Completed a cycle
      const previousCycles = Math.floor(previousCount / totalChapters);
      const currentCycles = Math.floor(currentCount / totalChapters);
      
      if (currentCycles > previousCycles) {
        return {
          type: "cycle_complete",
          listId,
          listName: stat.listName,
          cycleNumber: currentCycles,
          message: `You've completed ${stat.listName} ${currentCycles} time${currentCycles > 1 ? "s" : ""}!`,
        };
      }

      // Halfway through current cycle
      const currentProgress = currentCount % totalChapters;
      const previousProgress = previousCount % totalChapters;
      const halfwayPoint = Math.floor(totalChapters / 2);
      
      if (previousProgress < halfwayPoint && currentProgress >= halfwayPoint) {
        return {
          type: "halfway",
          listId,
          listName: stat.listName,
          message: `Halfway through ${stat.listName}!`,
        };
      }

      return null;
    },
    [cycleStats]
  );

  // Get milestone display messages for UI
  const getMilestoneMessages = useMemo(() => {
    const messages: string[] = [];

    cycleStats.forEach((stat) => {
      if (stat.completedCycles > 0) {
        if (stat.completedCycles === 1) {
          messages.push(`You've read ${stat.listName} once`);
        } else {
          messages.push(`You've read ${stat.listName} ${stat.completedCycles} times`);
        }
      }
    });

    return messages;
  }, [cycleStats]);

  return {
    cycleStats,
    totalStats,
    checkMilestones,
    getMilestoneMessages,
  };
}
