/**
 * Guarded `localStorage` access.
 *
 * Storage is not a given: Safari Private Browsing historically threw on write,
 * quota can be exhausted, and embedded webviews may block it entirely. The old
 * code called `localStorage.setItem` bare inside a state updater, so a throw
 * there took down the render that was recording a completed chapter.
 *
 * Every function here degrades to an in-memory map instead of throwing, so the
 * app stays usable for the session even when persistence is unavailable.
 */

/** Fallback used when the real storage is unavailable. Session-scoped. */
const memoryStore = new Map<string, string>();

let storageAvailable: boolean | null = null;

function isAvailable(): boolean {
  if (storageAvailable !== null) return storageAvailable;
  try {
    const probe = "__scripture_daily_probe__";
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  return storageAvailable;
}

/** Reads a raw string, or `null` when absent or unreadable. */
export function readRaw(key: string): string | null {
  if (!isAvailable()) return memoryStore.get(key) ?? null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

/** Writes a raw string. Returns whether it reached durable storage. */
export function writeRaw(key: string, value: string): boolean {
  memoryStore.set(key, value);
  if (!isAvailable()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    // Most often QuotaExceededError. The in-memory copy above still stands.
    return false;
  }
}

export function removeRaw(key: string): void {
  memoryStore.delete(key);
  if (!isAvailable()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing useful to do; the memory copy is already gone.
  }
}

/**
 * Reads and JSON-parses a key, running the result through `parse`.
 *
 * `parse` is the single place where untrusted persisted data is validated —
 * it returns `null` to reject, and the caller supplies the fallback.
 */
export function readJSON<T>(key: string, parse: (value: unknown) => T | null): T | null {
  const raw = readRaw(key);
  if (raw === null) return null;
  try {
    return parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** JSON-serializes and writes. Returns whether it reached durable storage. */
export function writeJSON(key: string, value: unknown): boolean {
  try {
    return writeRaw(key, JSON.stringify(value));
  } catch {
    // Circular structure — a programming error, not a storage failure.
    return false;
  }
}

/** Storage keys, centralised so exports and resets cannot miss one. */
export const StorageKeys = {
  progress: "scripture-daily-progress-v2",
  settings: "scripture-daily-settings-v1",
  /** Legacy key, still read once so existing users keep their settings. */
  legacySettings: "horner-settings",
  onboarding: "scripture-daily-onboarding-complete",
  legacyOnboarding: "horner-onboarding-complete",
  typography: "scripture-daily-reader-typography",
  highlights: "scripture-daily-highlights-v1",
  outbox: "scripture-daily-sync-outbox-v1",
  installPromptDismissed: "scripture-daily-install-dismissed",
} as const;
