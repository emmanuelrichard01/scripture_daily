/**
 * Reading-progress domain logic — pure functions over the reading log.
 *
 * Nothing here touches React, storage, or the network, so every rule below is
 * directly testable. `ProgressContext` is a thin shell that owns the state and
 * delegates all reasoning to this module.
 */

import { addDays, daysBetween, isISODate, todayISO, type ISODate } from "@/lib/date";
import { listIds, readingLists } from "@/lib/readingPlan";

/**
 * Which lists were completed on which local calendar day.
 *
 * `{ "2026-08-12": [1, 2, 5] }` — list ids are unique and ascending within a
 * day, and a day with no entries is absent rather than mapped to `[]`, so
 * `Object.keys` is always the set of active days.
 */
export type ReadingLog = Readonly<Record<ISODate, readonly number[]>>;

/** The persisted progress document. `version` gates migrations. */
export interface ProgressState {
  readonly version: 2;
  readonly history: ReadingLog;
  readonly startDate: ISODate;
  /** When this device last changed the document. Drives conflict resolution. */
  readonly updatedAt: string;
}

export const PROGRESS_VERSION = 2;

const VALID_LIST_IDS = new Set(listIds);

export function createEmptyProgress(startDate: ISODate = todayISO()): ProgressState {
  return {
    version: PROGRESS_VERSION,
    history: {},
    startDate,
    updatedAt: new Date().toISOString(),
  };
}

// ────────────────────────────── Validation ──────────────────────────────

/**
 * Coerces untrusted input (localStorage, cloud rows, imported backups) into a
 * valid `ProgressState`, dropping anything malformed.
 *
 * Returns `null` when the input is unusable, letting the caller decide between
 * falling back to defaults and surfacing an error. Never throws: a corrupt
 * localStorage entry must not be able to white-screen the app.
 */
export function parseProgress(input: unknown): ProgressState | null {
  if (typeof input !== "object" || input === null) return null;
  const raw = input as Record<string, unknown>;

  if (raw.version !== PROGRESS_VERSION) return null;
  if (typeof raw.history !== "object" || raw.history === null) return null;

  const startDate = isISODate(raw.startDate) ? raw.startDate : todayISO();
  const history: Record<ISODate, number[]> = {};

  for (const [date, value] of Object.entries(raw.history as Record<string, unknown>)) {
    if (!isISODate(date) || !Array.isArray(value)) continue;

    const dayListIds = [...new Set(value)]
      .filter((id): id is number => typeof id === "number" && VALID_LIST_IDS.has(id))
      .sort((a, b) => a - b);

    if (dayListIds.length > 0) history[date] = dayListIds;
  }

  return {
    version: PROGRESS_VERSION,
    history,
    startDate,
    updatedAt:
      typeof raw.updatedAt === "string" ? raw.updatedAt : new Date(0).toISOString(),
  };
}

// ─────────────────────────────── Mutations ───────────────────────────────

/**
 * Toggles one list's completion on one day, returning a new state.
 *
 * Returns the original object when nothing changes, so React can bail out of
 * re-rendering on a no-op.
 */
export function toggleReading(
  state: ProgressState,
  date: ISODate,
  listId: number,
): ProgressState {
  if (!isISODate(date) || !VALID_LIST_IDS.has(listId)) return state;

  const current = state.history[date] ?? [];
  const isComplete = current.includes(listId);
  const next = isComplete
    ? current.filter((id) => id !== listId)
    : [...current, listId].sort((a, b) => a - b);

  const history: Record<ISODate, readonly number[]> = { ...state.history };
  if (next.length === 0) delete history[date];
  else history[date] = next;

  return { ...state, history, updatedAt: new Date().toISOString() };
}

/** Marks every list complete for a day — the "I read all ten" shortcut. */
export function completeDay(state: ProgressState, date: ISODate): ProgressState {
  if (!isISODate(date)) return state;
  if (state.history[date]?.length === listIds.length) return state;

  return {
    ...state,
    history: { ...state.history, [date]: [...listIds] },
    updatedAt: new Date().toISOString(),
  };
}

/** Clears a whole day. */
export function clearDay(state: ProgressState, date: ISODate): ProgressState {
  if (!state.history[date]) return state;
  const history = { ...state.history };
  delete history[date];
  return { ...state, history, updatedAt: new Date().toISOString() };
}

export function setStartDate(state: ProgressState, startDate: ISODate): ProgressState {
  if (!isISODate(startDate) || startDate === state.startDate) return state;
  return { ...state, startDate, updatedAt: new Date().toISOString() };
}

// ─────────────────────────────── Derivations ───────────────────────────────

/** Lifetime chapters completed per list id. Every list is present, even at 0. */
export function deriveListProgress(history: ReadingLog): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const list of readingLists) counts[list.id] = 0;

  for (const dayListIds of Object.values(history)) {
    for (const listId of dayListIds) {
      if (counts[listId] !== undefined) counts[listId] += 1;
    }
  }
  return counts;
}

/** Lifetime chapters read across all lists. */
export function deriveTotalChapters(history: ReadingLog): number {
  let total = 0;
  for (const dayListIds of Object.values(history)) total += dayListIds.length;
  return total;
}

/** Days on which at least one chapter was read, chronologically ordered. */
export function activeDays(history: ReadingLog): ISODate[] {
  return Object.keys(history)
    .filter((date) => (history[date]?.length ?? 0) > 0)
    .sort();
}

/**
 * The most recent local day with a recorded reading, or `null`.
 *
 * Published to the server so friends can be shown an accurate "read today"
 * without exposing the reading log itself. The alternative — inferring it from
 * the row's `updated_at` — was wrong twice over: it is a UTC instant, so it
 * flipped days for anyone far from Greenwich, and it advances on *any* write,
 * so changing a start date marked you as having read.
 */
export function lastReadDate(history: ReadingLog): ISODate | null {
  const days = activeDays(history);
  return days.length > 0 ? days[days.length - 1] : null;
}

/**
 * The current consecutive-day streak.
 *
 * Today counts if read, but an unread today does **not** break a streak that
 * ran through yesterday — the day isn't over yet. Showing a reader "streak: 0"
 * at breakfast because they haven't read yet would be both wrong and
 * discouraging, so the streak is anchored to yesterday until today is logged.
 */
export function deriveStreak(history: ReadingLog, today: ISODate = todayISO()): number {
  const yesterday = addDays(today, -1);
  const hasToday = (history[today]?.length ?? 0) > 0;
  const hasYesterday = (history[yesterday]?.length ?? 0) > 0;

  if (!hasToday && !hasYesterday) return 0;

  let cursor = hasToday ? today : yesterday;
  let streak = 0;
  while ((history[cursor]?.length ?? 0) > 0) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** The longest consecutive-day run ever achieved. */
export function deriveBestStreak(history: ReadingLog): number {
  const days = activeDays(history);
  if (days.length === 0) return 0;

  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = daysBetween(days[i - 1], days[i]) === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/** Chapters read in a given `YYYY-MM` month. */
export function chaptersInMonth(history: ReadingLog, month: string): number {
  let total = 0;
  for (const [date, dayListIds] of Object.entries(history)) {
    if (date.startsWith(month)) total += dayListIds.length;
  }
  return total;
}

/**
 * Mean chapters per day since the start date.
 *
 * Divides by elapsed days rather than active days, so skipped days pull the
 * average down — that is the honest reading of "per day", and the number is
 * meant to be a mirror rather than a trophy.
 */
export function deriveAveragePerDay(
  history: ReadingLog,
  startDate: ISODate,
  today: ISODate = todayISO(),
): number {
  const elapsed = Math.max(1, daysBetween(startDate, today) + 1);
  return deriveTotalChapters(history) / elapsed;
}

// ─────────────────────────── Cloud serialization ───────────────────────────

/**
 * Flattens the log to `["2026-08-12-1", ...]` for the `text[]` column.
 *
 * Sorted so that two devices holding identical progress produce byte-identical
 * arrays, which makes the row's `updated_at` meaningful rather than churning on
 * every write.
 */
export function serializeLog(history: ReadingLog): string[] {
  const entries: string[] = [];
  for (const [date, dayListIds] of Object.entries(history)) {
    for (const listId of dayListIds) entries.push(`${date}-${listId}`);
  }
  return entries.sort();
}

const SERIALIZED_ENTRY_RE = /^(\d{4}-\d{2}-\d{2})-(\d+)$/;

/** Inverse of {@link serializeLog}. Silently drops malformed entries. */
export function deserializeLog(entries: readonly string[] | null | undefined): ReadingLog {
  const history: Record<ISODate, number[]> = {};
  if (!entries) return history;

  for (const entry of entries) {
    const match = SERIALIZED_ENTRY_RE.exec(entry);
    if (!match) continue;

    const [, date, listIdText] = match;
    const listId = Number(listIdText);
    if (!isISODate(date) || !VALID_LIST_IDS.has(listId)) continue;

    const day = (history[date] ??= []);
    if (!day.includes(listId)) day.push(listId);
  }

  for (const day of Object.values(history)) day.sort((a, b) => a - b);
  return history;
}

/**
 * Union-merges two logs.
 *
 * Union rather than last-write-wins because a completed reading is a fact the
 * user asserted, and losing one is far worse than keeping one they later
 * unchecked on another device. The cost is that an un-check does not propagate
 * across devices through a merge — an acceptable trade for never silently
 * erasing someone's history.
 */
export function mergeLogs(a: ReadingLog, b: ReadingLog): ReadingLog {
  const merged: Record<ISODate, number[]> = {};

  for (const [date, dayListIds] of Object.entries(a)) merged[date] = [...dayListIds];

  for (const [date, dayListIds] of Object.entries(b)) {
    const existing = merged[date];
    if (!existing) {
      merged[date] = [...dayListIds];
      continue;
    }
    const union = new Set([...existing, ...dayListIds]);
    merged[date] = [...union].sort((x, y) => x - y);
  }

  return merged;
}

/**
 * Reconciles local and remote progress into the state both should converge on.
 *
 * History unions (see {@link mergeLogs}). The start date takes the **earlier**
 * of the two, since it marks when the journey began and moving it later would
 * discard reading days that precede it.
 */
export function mergeProgress(local: ProgressState, remote: ProgressState): ProgressState {
  return {
    version: PROGRESS_VERSION,
    history: mergeLogs(local.history, remote.history),
    startDate: remote.startDate < local.startDate ? remote.startDate : local.startDate,
    updatedAt: new Date().toISOString(),
  };
}
