import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const LOCAL_STORAGE_KEY = "horner-reading-progress";

interface ProgressData {
  completedReadings: string[];
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

const getLocalProgress = (): ProgressData => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore parse errors
  }
  return getDefaultProgress();
};

export function useCloudProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ProgressData>(getLocalProgress);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load from cloud when user logs in
  useEffect(() => {
    if (!user) return;

    const loadCloudProgress = async () => {
      try {
        const { data, error } = await supabase
          .from("reading_progress")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error loading cloud progress:", error);
          return;
        }

        if (data) {
          const cloudProgress: ProgressData = {
            completedReadings: data.completed_readings || [],
            streakCount: data.streak_count,
            lastReadDate: data.last_read_date,
            totalChaptersRead: data.total_chapters_read,
            startDate: data.start_date,
          };

          // Merge with local progress (union of completed readings)
          const localProgress = getLocalProgress();
          const mergedReadings = Array.from(
            new Set([
              ...cloudProgress.completedReadings,
              ...localProgress.completedReadings,
            ])
          );

          const mergedProgress: ProgressData = {
            completedReadings: mergedReadings,
            streakCount: Math.max(
              cloudProgress.streakCount,
              localProgress.streakCount
            ),
            lastReadDate:
              cloudProgress.lastReadDate || localProgress.lastReadDate,
            totalChaptersRead: mergedReadings.length,
            startDate:
              cloudProgress.startDate < localProgress.startDate
                ? cloudProgress.startDate
                : localProgress.startDate,
          };

          setProgress(mergedProgress);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mergedProgress));
        }
      } catch (error) {
        console.error("Error loading cloud progress:", error);
      }
    };

    loadCloudProgress();
  }, [user]);

  // Debounced sync to cloud
  const syncToCloud = useCallback(
    async (data: ProgressData) => {
      if (!user) return;

      setIsSyncing(true);
      try {
        const { error } = await supabase
          .from("reading_progress")
          .update({
            completed_readings: data.completedReadings,
            streak_count: data.streakCount,
            last_read_date: data.lastReadDate,
            total_chapters_read: data.totalChaptersRead,
            start_date: data.startDate,
          })
          .eq("user_id", user.id);

        if (error) {
          console.error("Error syncing to cloud:", error);
        }
      } catch (error) {
        console.error("Error syncing to cloud:", error);
      } finally {
        setIsSyncing(false);
      }
    },
    [user]
  );

  // Save to localStorage and schedule cloud sync
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(progress));

    if (user) {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(() => {
        syncToCloud(progress);
      }, 1000);
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [progress, user, syncToCloud]);

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

  const resetProgress = useCallback(() => {
    const defaultProgress = getDefaultProgress();
    setProgress(defaultProgress);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    if (user) {
      syncToCloud(defaultProgress);
    }
  }, [user, syncToCloud]);

  return {
    completedSet,
    streakCount: progress.streakCount,
    totalChaptersRead: progress.totalChaptersRead,
    startDate: progress.startDate,
    toggleComplete,
    getCompletedForDay,
    isDayComplete,
    isSyncing,
    isAuthenticated: !!user,
    resetProgress,
  };
}
