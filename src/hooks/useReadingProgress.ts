import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "horner-reading-progress";

interface ProgressData {
  completedReadings: string[]; // Format: "dayOfYear-listId"
  streakCount: number;
  lastReadDate: string | null;
  totalChaptersRead: number;
  startDate: string;
}

const getDefaultProgress = (): ProgressData => ({
  completedReadings: [],
  streakCount: 0,
  lastReadDate: null,
  totalChaptersRead: 0,
  startDate: new Date().toISOString().split("T")[0],
});

export function useReadingProgress() {
  const [progress, setProgress] = useState<ProgressData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return getDefaultProgress();
      }
    }
    return getDefaultProgress();
  });

  // Save to localStorage whenever progress changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const completedSet = new Set(progress.completedReadings);

  const markComplete = useCallback((dayOfYear: number, listId: number) => {
    const key = `${dayOfYear}-${listId}`;
    
    setProgress((prev) => {
      if (prev.completedReadings.includes(key)) return prev;

      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .split("T")[0];
      
      let newStreak = prev.streakCount;
      
      // If last read was yesterday, increment streak
      // If last read was today, keep streak
      // Otherwise, reset to 1
      if (prev.lastReadDate === yesterday) {
        newStreak = prev.streakCount + 1;
      } else if (prev.lastReadDate !== today) {
        newStreak = 1;
      }

      return {
        ...prev,
        completedReadings: [...prev.completedReadings, key],
        lastReadDate: today,
        streakCount: newStreak,
        totalChaptersRead: prev.totalChaptersRead + 1,
      };
    });
  }, []);

  const markIncomplete = useCallback((dayOfYear: number, listId: number) => {
    const key = `${dayOfYear}-${listId}`;
    
    setProgress((prev) => ({
      ...prev,
      completedReadings: prev.completedReadings.filter((k) => k !== key),
      totalChaptersRead: Math.max(0, prev.totalChaptersRead - 1),
    }));
  }, []);

  const toggleComplete = useCallback(
    (dayOfYear: number, listId: number) => {
      const key = `${dayOfYear}-${listId}`;
      if (completedSet.has(key)) {
        markIncomplete(dayOfYear, listId);
      } else {
        markComplete(dayOfYear, listId);
      }
    },
    [completedSet, markComplete, markIncomplete]
  );

  const getCompletedForDay = useCallback(
    (dayOfYear: number): number => {
      return progress.completedReadings.filter((key) =>
        key.startsWith(`${dayOfYear}-`)
      ).length;
    },
    [progress.completedReadings]
  );

  const isDayComplete = useCallback(
    (dayOfYear: number): boolean => {
      return getCompletedForDay(dayOfYear) === 10;
    },
    [getCompletedForDay]
  );

  return {
    completedSet,
    streakCount: progress.streakCount,
    totalChaptersRead: progress.totalChaptersRead,
    startDate: progress.startDate,
    toggleComplete,
    getCompletedForDay,
    isDayComplete,
  };
}
