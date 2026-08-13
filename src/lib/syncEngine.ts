/**
 * A durable, offline-tolerant write scheduler.
 *
 * The previous sync was a bare `setTimeout` that called Supabase and, on
 * failure, set a status flag and gave up. Three ways that lost data:
 *
 *   1. The tab closing inside the debounce window dropped the pending write.
 *   2. A failed push was never retried — the reading only ever existed locally.
 *   3. One shared timer served both progress and start-date writes, so changing
 *      the start date cancelled a pending progress push.
 *
 * This replaces it with a per-channel scheduler that coalesces rapid edits,
 * retries with exponential backoff, waits out offline periods, and flushes
 * synchronously when the page is hidden or unloaded.
 *
 * The unit of work is a *snapshot*, not a delta: each channel keeps only the
 * latest payload, since the payload already describes the complete desired
 * state. Ten taps in a row therefore cost one network write, not ten.
 */

export type SyncStatus = "idle" | "pending" | "syncing" | "error" | "offline";

/** How the engine reports itself to the UI. */
export interface SyncSnapshot {
  readonly status: SyncStatus;
  readonly lastSyncedAt: Date | null;
  /** Populated when `status` is `"error"`. */
  readonly lastError: string | null;
  /** Whether a payload is waiting to be written. */
  readonly hasPendingWork: boolean;
}

interface Channel<T> {
  /** Latest payload awaiting a write, if any. */
  pending: T | null;
  timer: ReturnType<typeof setTimeout> | null;
  attempt: number;
  inFlight: boolean;
}

export interface SyncEngineOptions {
  /** Quiet period before a write fires. Coalesces bursts of taps. */
  debounceMs?: number;
  /** Ceiling for exponential backoff between retries. */
  maxBackoffMs?: number;
  /** Retries before the channel reports an error and stops. */
  maxAttempts?: number;
  /** Called whenever the reportable status changes. */
  onStatusChange?: (snapshot: SyncSnapshot) => void;
}

const DEFAULTS = {
  debounceMs: 1_200,
  maxBackoffMs: 30_000,
  maxAttempts: 5,
} as const;

/**
 * Schedules writes for a set of independently-debounced channels.
 *
 * `K` is the channel key union — typically `"progress" | "settings"`.
 */
export class SyncEngine<K extends string> {
  private readonly channels = new Map<K, Channel<unknown>>();
  private readonly writers = new Map<K, (payload: never) => Promise<void>>();
  private readonly options: Required<Omit<SyncEngineOptions, "onStatusChange">>;
  private readonly onStatusChange?: (snapshot: SyncSnapshot) => void;

  private lastSyncedAt: Date | null = null;
  private lastError: string | null = null;
  private disposed = false;
  private listenersAttached = false;

  constructor(options: SyncEngineOptions = {}) {
    this.options = {
      debounceMs: options.debounceMs ?? DEFAULTS.debounceMs,
      maxBackoffMs: options.maxBackoffMs ?? DEFAULTS.maxBackoffMs,
      maxAttempts: options.maxAttempts ?? DEFAULTS.maxAttempts,
    };
    this.onStatusChange = options.onStatusChange;
    this.attachLifecycleListeners();
  }

  /** Registers the function that performs a channel's write. */
  register<T>(key: K, writer: (payload: T) => Promise<void>): void {
    this.writers.set(key, writer as (payload: never) => Promise<void>);
    if (!this.channels.has(key)) {
      this.channels.set(key, { pending: null, timer: null, attempt: 0, inFlight: false });
    }
  }

  /**
   * Queues `payload` for `key`, replacing anything already queued.
   *
   * Replacing rather than appending is what keeps a long reading session down
   * to one write: each payload is a full snapshot, so only the newest matters.
   */
  enqueue<T>(key: K, payload: T): void {
    if (this.disposed) return;
    const channel = this.requireChannel(key);
    channel.pending = payload;
    channel.attempt = 0;

    if (channel.timer) clearTimeout(channel.timer);
    channel.timer = setTimeout(() => void this.drain(key), this.options.debounceMs);
    this.emit();
  }

  /**
   * Writes every pending payload immediately, bypassing the debounce.
   *
   * Used on sign-out, on manual retry, and when the page is hidden.
   */
  async flush(): Promise<void> {
    await Promise.all([...this.channels.keys()].map((key) => this.drain(key, true)));
  }

  /** Retries after a failure, resetting backoff so the user sees an immediate attempt. */
  retry(): void {
    for (const channel of this.channels.values()) channel.attempt = 0;
    this.lastError = null;
    void this.flush();
  }

  /** Whether any channel still holds unwritten work. */
  get hasPendingWork(): boolean {
    for (const channel of this.channels.values()) {
      if (channel.pending !== null) return true;
    }
    return false;
  }

  snapshot(): SyncSnapshot {
    return {
      status: this.computeStatus(),
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
      hasPendingWork: this.hasPendingWork,
    };
  }

  /** Cancels timers and detaches listeners. Pending work is left unwritten. */
  dispose(): void {
    this.disposed = true;
    for (const channel of this.channels.values()) {
      if (channel.timer) clearTimeout(channel.timer);
      channel.timer = null;
    }
    this.detachLifecycleListeners();
  }

  // ───────────────────────────── internals ─────────────────────────────

  private requireChannel(key: K): Channel<unknown> {
    const channel = this.channels.get(key);
    if (!channel) throw new Error(`No sync channel registered for "${key}"`);
    return channel;
  }

  private async drain(key: K, force = false): Promise<void> {
    if (this.disposed) return;

    const channel = this.channels.get(key);
    const writer = this.writers.get(key);
    if (!channel || !writer || channel.pending === null) return;

    // One write per channel at a time. The in-flight call re-checks `pending`
    // when it finishes, so an edit made mid-flight is not lost.
    if (channel.inFlight) return;

    if (!force && typeof navigator !== "undefined" && navigator.onLine === false) {
      // Hold the payload; the `online` listener re-drains.
      this.emit();
      return;
    }

    if (channel.timer) {
      clearTimeout(channel.timer);
      channel.timer = null;
    }

    const payload = channel.pending;
    channel.inFlight = true;
    this.emit();

    try {
      await (writer as (value: unknown) => Promise<void>)(payload);

      // Only clear if no newer payload arrived while the write was in flight.
      if (channel.pending === payload) channel.pending = null;
      channel.attempt = 0;
      this.lastSyncedAt = new Date();
      this.lastError = null;
    } catch (error) {
      channel.attempt += 1;
      this.lastError = error instanceof Error ? error.message : String(error);

      if (channel.attempt < this.options.maxAttempts) {
        // 1s, 2s, 4s, 8s… capped. Keeps a flapping connection from hammering.
        const backoff = Math.min(
          this.options.maxBackoffMs,
          1_000 * 2 ** (channel.attempt - 1),
        );
        channel.timer = setTimeout(() => void this.drain(key), backoff);
      }
    } finally {
      channel.inFlight = false;
      this.emit();
      // A newer payload landed mid-flight — schedule it.
      if (channel.pending !== null && channel.attempt === 0 && !channel.timer) {
        channel.timer = setTimeout(() => void this.drain(key), this.options.debounceMs);
      }
    }
  }

  private computeStatus(): SyncStatus {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return this.hasPendingWork ? "offline" : "idle";
    }
    for (const channel of this.channels.values()) {
      if (channel.inFlight) return "syncing";
    }
    for (const channel of this.channels.values()) {
      if (channel.pending !== null && channel.attempt >= this.options.maxAttempts) {
        return "error";
      }
    }
    return this.hasPendingWork ? "pending" : "idle";
  }

  private emit(): void {
    this.onStatusChange?.(this.snapshot());
  }

  // ─────────────────────────── page lifecycle ───────────────────────────

  private readonly handleOnline = () => {
    for (const channel of this.channels.values()) channel.attempt = 0;
    void this.flush();
  };

  private readonly handleOffline = () => this.emit();

  /**
   * Flushes when the page is hidden.
   *
   * `visibilitychange` is the only reliable signal on mobile — iOS Safari
   * frequently kills a backgrounded tab without ever firing `pagehide`, and
   * never fires `beforeunload`. This is what stops the last few taps of a
   * reading session from being stranded in the debounce window.
   */
  private readonly handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") void this.flush();
  };

  private readonly handlePageHide = () => void this.flush();

  private attachLifecycleListeners(): void {
    if (typeof window === "undefined" || this.listenersAttached) return;
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
    window.addEventListener("pagehide", this.handlePageHide);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.listenersAttached = true;
  }

  private detachLifecycleListeners(): void {
    if (typeof window === "undefined" || !this.listenersAttached) return;
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    window.removeEventListener("pagehide", this.handlePageHide);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.listenersAttached = false;
  }
}
