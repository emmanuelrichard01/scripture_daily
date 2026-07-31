import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getDayOfYear } from "@/lib/readingPlan";

const LOCAL_STORAGE_KEY = "horner-reading-progress";

export type SyncStatus = "local" | "idle" | "syncing" | "offline" | "error";

interface ProgressData {
  completedReadings: string[];
  lastReadDate: string | null;
  startDate: string;
}

const todayISO = () => new Date().toISOString().split("T")[0];

const getDefaultProgress = (): ProgressData => ({
  completedReadings: [],
  lastReadDate: null,
  startDate: todayISO(),
});

const getLocalProgress = (): ProgressData => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        completedReadings: Array.isArray(parsed.completedReadings)
          ? parsed.completedReadings
          : [],
        lastReadDate: parsed.lastReadDate ?? null,
        startDate: parsed.startDate ?? todayISO(),
      };
    }
  } catch {
    // Ignore parse errors
  }
  return getDefaultProgress();
};

/**
 * Derive the streak from the completed readings themselves rather than from a
 * stored counter, so the number can never drift between devices.
 */
const deriveStreak = (readings: string[]): number => {
  const days = new Set<number>();
  for (const key of readings) {
    const day = parseInt(key.split("-")[0], 10);
    if (!Number.isNaN(day)) days.add(day);
  }
  if (days.size === 0) return 0;

  const today = getDayOfYear(new Date());
  let cursor: number;
  if (days.has(today)) {
    cursor = today;
  } else if (days.has(today - 1)) {
    cursor = today - 1;
  } else {
    return 0;
  }

  let streak = 0;
  while (cursor >= 1 && days.has(cursor)) {
    streak++;
    cursor--;
  }
  return streak;
};

export function useCloudProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ProgressData>(getLocalProgress);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<ProgressData | null>(null);
  const errorNotifiedRef = useRef(false);

  const isAuthenticated = !!user;

  // ---- Cloud write -------------------------------------------------------
  const syncToCloud = useCallback(
    async (data: ProgressData) => {
      if (!user) return;

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        pendingRef.current = data;
        setSyncStatus("offline");
        return;
      }

      setSyncStatus("syncing");
      try {
        const { error } = await supabase.from("reading_progress").upsert(
          {
            user_id: user.id,
            completed_readings: data.completedReadings,
            streak_count: deriveStreak(data.completedReadings),
            last_read_date: data.lastReadDate,
            total_chapters_read: data.completedReadings.length,
            start_date: data.startDate,
          },
          { onConflict: "user_id" }
        );

        if (error) throw error;

        pendingRef.current = null;
        errorNotifiedRef.current = false;
        setLastSyncedAt(new Date());
        setSyncStatus("idle");
      } catch (error) {
        pendingRef.current = data;
        setSyncStatus("error");
        if (!errorNotifiedRef.current) {
          errorNotifiedRef.current = true;
          toast.error("Couldn't save your progress to the cloud", {
            description: "It's stored on this device. We'll retry shortly.",
          });
        }
        console.error("Error syncing to cloud:", error);
      }
    },
    [user]
  );

  const retrySync = useCallback(() => {
    errorNotifiedRef.current = false;
    syncToCloud(pendingRef.current ?? progress);
  }, [syncToCloud, progress]);

  // ---- Cloud read / merge ------------------------------------------------
  useEffect(() => {
    if (!user) {
      setSyncStatus("local");
      setHasLoaded(true);
      return;
    }

    let cancelled = false;

    const loadCloudProgress = async () => {
      setSyncStatus("syncing");
      try {
        const { data, error } = await supabase
          .from("reading_progress")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;

        const localProgress = getLocalProgress();

        if (data) {
          // Reconcile on the readings set only; every counter is recomputed.
          const mergedReadings = Array.from(
            new Set([
              ...(data.completed_readings || []),
              ...localProgress.completedReadings,
            ])
          );

          const merged: ProgressData = {
            completedReadings: mergedReadings,
            lastReadDate:
              [data.last_read_date, localProgress.lastReadDate]
                .filter(Boolean)
                .sort()
                .pop() ?? null,
            startDate:
              data.start_date && data.start_date < localProgress.startDate
                ? data.start_date
                : localProgress.startDate,
          };

          setProgress(merged);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        }

        setLastSyncedAt(new Date());
        setSyncStatus("idle");
      } catch (error) {
        if (cancelled) return;
        console.error("Error loading cloud progress:", error);
        setSyncStatus("error");
        toast.error("Couldn't load your cloud progress", {
          description: "Showing what's saved on this device.",
        });
      } finally {
        if (!cancelled) setHasLoaded(true);
      }
    };

    loadCloudProgress();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ---- Persist locally + debounce cloud write ----------------------------
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(progress));

    if (!user) return;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => syncToCloud(progress), 800);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [progress, user, syncToCloud]);

  // ---- Offline queue -----------------------------------------------------
  useEffect(() => {
    const handleOffline = () => {
      if (user) setSyncStatus("offline");
    };
    const handleOnline = () => {
      if (!user) return;
      const queued = pendingRef.current;
      if (queued) syncToCloud(queued);
      else setSyncStatus("idle");
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [user, syncToCloud]);

  // ---- Derived values ----------------------------------------------------
  const completedSet = useMemo(
    () => new Set(progress.completedReadings),
    [progress.completedReadings]
  );

  const streakCount = useMemo(
    () => deriveStreak(progress.completedReadings),
    [progress.completedReadings]
  );

  const totalChaptersRead = progress.completedReadings.length;

  const toggleComplete = useCallback((dayOfYear: number, listId: number) => {
    const key = `${dayOfYear}-${listId}`;
    setProgress((prev) => {
      const has = prev.completedReadings.includes(key);
      return {
        ...prev,
        completedReadings: has
          ? prev.completedReadings.filter((k) => k !== key)
          : [...prev.completedReadings, key],
        lastReadDate: has ? prev.lastReadDate : todayISO(),
      };
    });
  }, []);

  const getCompletedForDay = useCallback(
    (dayOfYear: number): number =>
      progress.completedReadings.filter((key) =>
        key.startsWith(`${dayOfYear}-`)
      ).length,
    [progress.completedReadings]
  );

  const isDayComplete = useCallback(
    (dayOfYear: number): boolean => getCompletedForDay(dayOfYear) === 10,
    [getCompletedForDay]
  );

  const resetProgress = useCallback(() => {
    const defaults = getDefaultProgress();
    setProgress(defaults);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    if (user) syncToCloud(defaults);
  }, [user, syncToCloud]);

  const updateStartDate = useCallback((newStartDate: string) => {
    setProgress((prev) => ({ ...prev, startDate: newStartDate }));
  }, []);

  return {
    completedSet,
    streakCount,
    totalChaptersRead,
    startDate: progress.startDate,
    lastReadDate: progress.lastReadDate,
    toggleComplete,
    getCompletedForDay,
    isDayComplete,
    isSyncing: syncStatus === "syncing",
    syncStatus,
    lastSyncedAt,
    retrySync,
    isLoading: !hasLoaded,
    isAuthenticated,
    resetProgress,
    updateStartDate,
  };
}
