import {
  createContext,
  useCallback,
  useState,
  useRef,
  useMemo,
  useEffect,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { readingLists } from "@/lib/readingPlan";
import { supabase } from "@/integrations/supabase/client";

export type ReadingLog = Record<string, number[]>;

interface ProgressState {
  version: number;
  history: ReadingLog;
  startDate: string;
}

export interface ProgressContextValue {
  history: ReadingLog;
  totalChaptersRead: number;
  streakCount: number;
  startDate: string;
  listProgress: Record<number, number>;
  completedTodayListIds: Set<number>;
  toggleComplete: (dateIso: string, listId: number) => void;
  getCompletedForDay: (dateIso: string) => number;
  isDayComplete: (dateIso: string) => boolean;
  syncStatus: "idle" | "syncing" | "error";
  lastSyncedAt: Date | null;
  retrySync: () => void;
  isAuthenticated: boolean;
  resetProgress: () => void;
  updateStartDate: (newDate: string) => void;
}

export const ProgressContext = createContext<ProgressContextValue | null>(null);

const STORAGE_KEY = "scripture-daily-progress-v2";

const getTodayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getDefaultProgress = (): ProgressState => ({
  version: 2,
  history: {},
  startDate: getTodayISO(),
});

const loadLocalProgress = (): ProgressState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.version === 2 && parsed.history) {
        return parsed as ProgressState;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return getDefaultProgress();
};

const deriveTotalChapters = (history: ReadingLog): number => {
  let sum = 0;
  for (const date in history) {
    sum += history[date].length;
  }
  return sum;
};

const deriveStreak = (history: ReadingLog): number => {
  const dates = Object.keys(history).filter((d) => history[d].length > 0).sort();
  if (dates.length === 0) return 0;

  const todayIso = getTodayISO();
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterdayIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const hasToday = history[todayIso]?.length > 0;
  const hasYesterday = history[yesterdayIso]?.length > 0;

  if (!hasToday && !hasYesterday) return 0;

  let streak = 0;
  const cursorDate = new Date(hasToday ? todayIso : yesterdayIso);

  while (true) {
    const iso = `${cursorDate.getFullYear()}-${String(cursorDate.getMonth() + 1).padStart(2, "0")}-${String(cursorDate.getDate()).padStart(2, "0")}`;
    if (history[iso] && history[iso].length > 0) {
      streak++;
      cursorDate.setDate(cursorDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};

// -- Cloud Sync Utilities --

const serializeLog = (log: ReadingLog): string[] => {
  const arr: string[] = [];
  for (const date in log) {
    for (const listId of log[date]) {
      arr.push(`${date}-${listId}`);
    }
  }
  return arr;
};

const deserializeLog = (arr: string[]): ReadingLog => {
  const log: ReadingLog = {};
  for (const item of arr) {
    const match = item.match(/^(\d{4}-\d{2}-\d{2})-(\d+)$/);
    if (match) {
      const [, date, listIdStr] = match;
      const listId = parseInt(listIdStr, 10);
      if (!log[date]) {
        log[date] = [];
      }
      if (!log[date].includes(listId)) {
        log[date].push(listId);
      }
    }
  }
  return log;
};

const mergeHistory = (local: ReadingLog, cloud: ReadingLog): ReadingLog => {
  const merged: ReadingLog = { ...local };
  for (const date in cloud) {
    if (!merged[date]) {
      merged[date] = [...cloud[date]];
    } else {
      const mergedSet = new Set([...merged[date], ...cloud[date]]);
      merged[date] = Array.from(mergedSet).sort((a, b) => a - b);
    }
  }
  return merged;
};

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ProgressState>(loadLocalProgress);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const progressRef = useRef(progress);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const pushToCloud = useCallback(async (state: ProgressState) => {
    if (!user) return;
    setSyncStatus("syncing");
    try {
      const { data, error: selectError } = await supabase
        .from("reading_progress")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const payload = {
        user_id: user.id,
        start_date: state.startDate,
        completed_readings: serializeLog(state.history),
        total_chapters_read: deriveTotalChapters(state.history),
        streak_count: deriveStreak(state.history),
        updated_at: new Date().toISOString(),
      };

      if (data) {
        const { error } = await supabase
          .from("reading_progress")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("reading_progress")
          .insert([payload]);
        if (error) throw error;
      }

      setSyncStatus("idle");
      setLastSyncedAt(new Date());
    } catch (e) {
      console.error("Cloud sync failed:", e);
      setSyncStatus("error");
    }
  }, [user]);

  // Pull from cloud on login
  useEffect(() => {
    if (!user) return;
    
    let isMounted = true;
    const loadFromCloud = async () => {
      setSyncStatus("syncing");
      try {
        const { data, error } = await supabase
          .from("reading_progress")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data && isMounted) {
          const cloudHistory = deserializeLog(data.completed_readings || []);
          const mergedHistory = mergeHistory(progressRef.current.history, cloudHistory);
          
          let mergedStartDate = progressRef.current.startDate;
          if (data.start_date && new Date(data.start_date) < new Date(mergedStartDate)) {
            mergedStartDate = data.start_date;
          }

          const newState = {
            version: 2,
            history: mergedHistory,
            startDate: mergedStartDate,
          };

          setProgress(newState);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
          setSyncStatus("idle");
          setLastSyncedAt(new Date());
          
          // Save the merged state back to cloud
          pushToCloud(newState);
        } else if (isMounted) {
          // New user, push local data immediately
          setSyncStatus("idle");
          pushToCloud(progressRef.current);
        }
      } catch (err) {
        console.error("Failed to load from cloud:", err);
        if (isMounted) setSyncStatus("error");
      }
    };

    loadFromCloud();

    return () => {
      isMounted = false;
    };
  }, [user, pushToCloud]);

  // Derived states
  const listProgress = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const list of readingLists) {
      counts[list.id] = 0;
    }
    for (const date in progress.history) {
      for (const listId of progress.history[date]) {
        if (counts[listId] !== undefined) {
          counts[listId]++;
        }
      }
    }
    return counts;
  }, [progress.history]);

  const todayIso = getTodayISO();
  const completedTodayListIds = useMemo(() => {
    return new Set(progress.history[todayIso] || []);
  }, [progress.history, todayIso]);

  const totalChaptersRead = useMemo(() => deriveTotalChapters(progress.history), [progress.history]);
  const streakCount = useMemo(() => deriveStreak(progress.history), [progress.history]);

  // Handlers
  const toggleComplete = useCallback((dateIso: string, listId: number) => {
    setProgress((prev) => {
      const currentDayReadings = prev.history[dateIso] || [];
      
      let nextDayReadings: number[];
      if (currentDayReadings.includes(listId)) {
        nextDayReadings = currentDayReadings.filter((id) => id !== listId);
      } else {
        nextDayReadings = [...currentDayReadings, listId];
      }

      const newHistory = { ...prev.history };
      if (nextDayReadings.length === 0) {
        delete newHistory[dateIso];
      } else {
        newHistory[dateIso] = nextDayReadings;
      }

      const newState: ProgressState = {
        ...prev,
        history: newHistory,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));

      // Debounce push to cloud
      if (user) {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        setSyncStatus("syncing");
        syncTimeoutRef.current = setTimeout(() => {
          pushToCloud(newState);
        }, 1500);
      }

      return newState;
    });
  }, [user, pushToCloud]);

  const getCompletedForDay = useCallback(
    (dateIso: string) => {
      return (progress.history[dateIso] || []).length;
    },
    [progress.history]
  );

  const isDayComplete = useCallback(
    (dateIso: string) => {
      return getCompletedForDay(dateIso) === readingLists.length;
    },
    [getCompletedForDay]
  );

  const retrySync = useCallback(() => {
    setSyncStatus("syncing");
    pushToCloud(progressRef.current);
  }, [pushToCloud]);

  const resetProgress = useCallback(() => {
    const freshState = getDefaultProgress();
    setProgress(freshState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(freshState));
    if (user) {
      pushToCloud(freshState);
    }
  }, [user, pushToCloud]);

  const updateStartDate = useCallback((newDate: string) => {
    setProgress((prev) => {
      const newState: ProgressState = { ...prev, startDate: newDate };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      if (user) {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(() => {
          pushToCloud(newState);
        }, 1500);
      }
      return newState;
    });
  }, [user, pushToCloud]);

  const value: ProgressContextValue = {
    history: progress.history,
    totalChaptersRead,
    streakCount,
    startDate: progress.startDate,
    listProgress,
    completedTodayListIds,
    toggleComplete,
    getCompletedForDay,
    isDayComplete,
    syncStatus,
    lastSyncedAt,
    retrySync,
    isAuthenticated: !!user,
    resetProgress,
    updateStartDate,
  };

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}
