import { createContext } from "react";
import type { ISODate } from "@/lib/date";
import type { ReadingLog } from "@/lib/progress";
import type { ListPosition, TodayReading } from "@/lib/readingPlan";
import type { SyncStatus } from "@/lib/syncEngine";

export interface ProgressContextValue {
  // ── Raw state ──
  readonly history: ReadingLog;
  readonly startDate: ISODate;
  /** False until local storage has been read and any cloud pull has settled. */
  readonly isHydrated: boolean;

  // ── Derived, memoised once per state change ──
  readonly listProgress: Readonly<Record<number, number>>;
  readonly completedTodayListIds: ReadonlySet<number>;
  readonly todaysReadings: readonly TodayReading[];
  readonly listPositions: readonly ListPosition[];
  readonly totalChaptersRead: number;
  readonly streakCount: number;
  readonly bestStreak: number;
  readonly averagePerDay: number;
  readonly readingDay: number;
  /** Chapters completed today, 0–10. */
  readonly completedToday: number;
  /** True when all ten of today's chapters are marked. */
  readonly isTodayComplete: boolean;

  // ── Commands ──
  readonly toggleReading: (date: ISODate, listId: number) => void;
  readonly completeToday: () => void;
  readonly clearDay: (date: ISODate) => void;
  readonly updateStartDate: (date: ISODate) => void;
  readonly resetProgress: () => void;
  readonly importProgress: (payload: unknown) => boolean;

  // ── Queries ──
  readonly getCompletedForDay: (date: ISODate) => number;
  readonly isDayComplete: (date: ISODate) => boolean;

  // ── Sync ──
  readonly syncStatus: SyncStatus;
  readonly lastSyncedAt: Date | null;
  readonly syncError: string | null;
  readonly retrySync: () => void;
  readonly isAuthenticated: boolean;
}

export const ProgressContext = createContext<ProgressContextValue | null>(null);
