import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getList, readingLists } from "@/lib/readingPlan";

/**
 * Announces a completed cycle, once, at the moment it happens.
 *
 * Keyed off the *previous* counts held in a ref rather than off the current
 * state, so the toast fires on the transition and not on every render that
 * happens to observe a completed cycle. The first effect run only records a
 * baseline — otherwise every app launch would replay old milestones.
 */
export function useMilestoneToasts(listProgress: Readonly<Record<number, number>>) {
  const previous = useRef<Map<number, number> | null>(null);

  useEffect(() => {
    const counts = new Map(readingLists.map((list) => [list.id, listProgress[list.id] ?? 0]));

    if (previous.current === null) {
      previous.current = counts;
      return;
    }

    for (const [listId, count] of counts) {
      const before = previous.current.get(listId) ?? 0;
      if (count <= before) continue;

      const list = getList(listId);
      if (!list) continue;

      const cyclesBefore = Math.floor(before / list.totalChapters);
      const cyclesNow = Math.floor(count / list.totalChapters);
      if (cyclesNow <= cyclesBefore) continue;

      toast.success(`${list.name} complete`, {
        description:
          cyclesNow === 1
            ? `You've read all ${list.totalChapters} chapters. Cycle 2 starts tomorrow.`
            : `That's ${cyclesNow} full passes through ${list.name}.`,
        duration: 6_000,
      });
    }

    previous.current = counts;
  }, [listProgress]);
}
