import {
  createContext,
  useCallback,
  useState,
  useRef,
  useMemo,
  ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { readingLists } from "@/lib/readingPlan";

// The new "True Horner" data structure. 
// A map of YYYY-MM-DD string to an array of completed list IDs.
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
  let cursorDate = new Date(hasToday ? todayIso : yesterdayIso);

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

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ProgressState>(loadLocalProgress);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Derived state: total chapters read historically for each list
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

  // Derived state: what is completed today
  const todayIso = getTodayISO();
  const completedTodayListIds = useMemo(() => {
    return new Set(progress.history[todayIso] || []);
  }, [progress.history, todayIso]);

  // Derived state: overall totals
  const totalChaptersRead = useMemo(() => {
    let sum = 0;
    for (const date in progress.history) {
      sum += progress.history[date].length;
    }
    return sum;
  }, [progress.history]);

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
      return newState;
    });
  }, []);

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
    setSyncStatus("idle");
  }, []);

  const value = {
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
  };

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}
