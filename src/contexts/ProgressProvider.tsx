import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { readingDayNumber, todayISO, type ISODate } from "@/lib/date";
import {
  CHAPTERS_PER_DAY,
  getTodaysReadings,
  getListPosition,
  readingLists,
} from "@/lib/readingPlan";
import {
  createEmptyProgress,
  deriveAveragePerDay,
  deriveBestStreak,
  deriveListProgress,
  deriveStreak,
  deriveTotalChapters,
  deserializeLog,
  lastReadDate,
  mergeProgress,
  parseProgress,
  serializeLog,
  clearDay as clearDayIn,
  completeDay,
  setStartDate,
  toggleReading as toggleReadingIn,
  type ProgressState,
} from "@/lib/progress";
import { readJSON, StorageKeys, writeJSON } from "@/lib/storage";
import { SyncEngine, type SyncSnapshot } from "@/lib/syncEngine";
import { ProgressContext, type ProgressContextValue } from "@/contexts/ProgressContext";

/**
 * All state transitions, as a reducer.
 *
 * The old implementation performed the localStorage write, the sync scheduling
 * and a `setSyncStatus` call *inside* the `setState` updater. That made the
 * updater impure — React 18 invokes updaters twice in StrictMode, so every tap
 * scheduled two writes — and made the transitions impossible to test in
 * isolation. Persistence and sync now happen in an effect that observes the
 * resulting state instead.
 */
type ProgressAction =
  | { type: "toggle"; date: ISODate; listId: number }
  | { type: "completeDay"; date: ISODate }
  | { type: "clearDay"; date: ISODate }
  | { type: "setStartDate"; date: ISODate }
  | { type: "reset" }
  | { type: "replace"; state: ProgressState };

function progressReducer(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    case "toggle":
      return toggleReadingIn(state, action.date, action.listId);
    case "completeDay":
      return completeDay(state, action.date);
    case "clearDay":
      return clearDayIn(state, action.date);
    case "setStartDate":
      return setStartDate(state, action.date);
    case "reset":
      return createEmptyProgress();
    case "replace":
      return action.state;
  }
}

/** Reads persisted progress, falling back to a fresh document. */
function loadLocalProgress(): ProgressState {
  return readJSON(StorageKeys.progress, parseProgress) ?? createEmptyProgress();
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [state, dispatch] = useReducer(progressReducer, undefined, loadLocalProgress);
  const [isHydrated, setIsHydrated] = useState(false);
  const [sync, setSync] = useState<SyncSnapshot>({
    status: "idle",
    lastSyncedAt: null,
    lastError: null,
    hasPendingWork: false,
  });

  /**
   * Today's date held in state rather than recomputed per render, so a session
   * left open across midnight rolls over instead of pinning yesterday's card.
   */
  const [today, setToday] = useState<ISODate>(todayISO);

  const userRef = useRef(user);
  userRef.current = user;

  // ── Midnight rollover ──
  useEffect(() => {
    const check = () => setToday((current) => {
      const now = todayISO();
      return now === current ? current : now;
    });
    // Cheap poll; also re-checks whenever the user returns to the tab, which is
    // what actually catches the common "phone slept overnight" case.
    const interval = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  // ── Sync engine ──
  const engine = useMemo(
    () => new SyncEngine<"progress">({ onStatusChange: setSync }),
    [],
  );

  useEffect(() => () => engine.dispose(), [engine]);

  useEffect(() => {
    engine.register<ProgressState>("progress", async (payload) => {
      const currentUser = userRef.current;
      if (!currentUser) return; // Guests persist locally only.

      const { error } = await supabase.from("reading_progress").upsert(
        {
          user_id: currentUser.id,
          start_date: payload.startDate,
          completed_readings: serializeLog(payload.history),
          total_chapters_read: deriveTotalChapters(payload.history),
          streak_count: deriveStreak(payload.history),
          // The column existed from the first migration but was never written,
          // so the Community page had to guess at it from `updated_at`.
          last_read_date: lastReadDate(payload.history),
          updated_at: payload.updatedAt,
        },
        { onConflict: "user_id" },
      );

      if (error) throw new Error(error.message);
    });
  }, [engine]);

  // ── Persist locally and schedule a cloud write on every change ──
  //
  // Local write is synchronous and unconditional: it is the source of truth and
  // must never wait on the network. The cloud write is queued behind it.
  const isFirstRender = useRef(true);
  useEffect(() => {
    writeJSON(StorageKeys.progress, state);
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return; // Don't push freshly-loaded state straight back to the server.
    }
    if (userRef.current) engine.enqueue("progress", state);
  }, [state, engine]);

  // ── Pull and merge on sign-in ──
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsHydrated(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const { data, error } = await supabase
          .from("reading_progress")
          .select("completed_readings, start_date, updated_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw new Error(error.message);
        if (cancelled) return;

        const local = loadLocalProgress();

        if (data) {
          const remote: ProgressState = {
            version: 2,
            history: deserializeLog(data.completed_readings),
            startDate: data.start_date,
            updatedAt: data.updated_at,
          };
          const merged = mergeProgress(local, remote);
          dispatch({ type: "replace", state: merged });

          // Push the union back so the other device converges too, but only if
          // the merge actually added something the server did not have.
          const remoteEntries = serializeLog(remote.history);
          const mergedEntries = serializeLog(merged.history);
          if (
            mergedEntries.length !== remoteEntries.length ||
            merged.startDate !== remote.startDate
          ) {
            engine.enqueue("progress", merged);
          }
        } else {
          // First sign-in on this account: seed the cloud from local.
          engine.enqueue("progress", local);
        }
      } catch {
        // Local state stands; the engine surfaces the failure on next write.
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, engine]);

  // ── Derived values ──
  const listProgress = useMemo(() => deriveListProgress(state.history), [state.history]);

  const completedTodayListIds = useMemo(
    () => new Set(state.history[today] ?? []),
    [state.history, today],
  );

  const todaysReadings = useMemo(
    () => getTodaysReadings(listProgress, completedTodayListIds),
    [listProgress, completedTodayListIds],
  );

  const listPositions = useMemo(
    () => readingLists.map((list) => getListPosition(list, listProgress[list.id] ?? 0)),
    [listProgress],
  );

  const totalChaptersRead = useMemo(
    () => deriveTotalChapters(state.history),
    [state.history],
  );
  const streakCount = useMemo(
    () => deriveStreak(state.history, today),
    [state.history, today],
  );
  const bestStreak = useMemo(() => deriveBestStreak(state.history), [state.history]);
  const averagePerDay = useMemo(
    () => deriveAveragePerDay(state.history, state.startDate, today),
    [state.history, state.startDate, today],
  );

  const completedToday = completedTodayListIds.size;

  // ── Commands ──
  const toggleReading = useCallback(
    (date: ISODate, listId: number) => dispatch({ type: "toggle", date, listId }),
    [],
  );
  const completeToday = useCallback(
    () => dispatch({ type: "completeDay", date: todayISO() }),
    [],
  );
  const clearDay = useCallback((date: ISODate) => dispatch({ type: "clearDay", date }), []);
  const updateStartDate = useCallback(
    (date: ISODate) => dispatch({ type: "setStartDate", date }),
    [],
  );
  const resetProgress = useCallback(() => dispatch({ type: "reset" }), []);

  /** Restores an exported backup. Returns whether the payload was usable. */
  const importProgress = useCallback((payload: unknown): boolean => {
    const parsed = parseProgress(payload);
    if (!parsed) return false;
    dispatch({ type: "replace", state: parsed });
    return true;
  }, []);

  const getCompletedForDay = useCallback(
    (date: ISODate) => state.history[date]?.length ?? 0,
    [state.history],
  );
  const isDayComplete = useCallback(
    (date: ISODate) => (state.history[date]?.length ?? 0) === CHAPTERS_PER_DAY,
    [state.history],
  );

  const retrySync = useCallback(() => engine.retry(), [engine]);

  const value = useMemo<ProgressContextValue>(
    () => ({
      history: state.history,
      startDate: state.startDate,
      isHydrated,
      listProgress,
      completedTodayListIds,
      todaysReadings,
      listPositions,
      totalChaptersRead,
      streakCount,
      bestStreak,
      averagePerDay,
      readingDay: readingDayNumber(state.startDate, today),
      completedToday,
      isTodayComplete: completedToday === CHAPTERS_PER_DAY,
      toggleReading,
      completeToday,
      clearDay,
      updateStartDate,
      resetProgress,
      importProgress,
      getCompletedForDay,
      isDayComplete,
      syncStatus: sync.status,
      lastSyncedAt: sync.lastSyncedAt,
      syncError: sync.lastError,
      retrySync,
      isAuthenticated: Boolean(user),
    }),
    [
      state.history,
      state.startDate,
      isHydrated,
      listProgress,
      completedTodayListIds,
      todaysReadings,
      listPositions,
      totalChaptersRead,
      streakCount,
      bestStreak,
      averagePerDay,
      today,
      completedToday,
      toggleReading,
      completeToday,
      clearDay,
      updateStartDate,
      resetProgress,
      importProgress,
      getCompletedForDay,
      isDayComplete,
      sync.status,
      sync.lastSyncedAt,
      sync.lastError,
      retrySync,
      user,
    ],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}
