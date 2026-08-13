import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SyncEngine } from "@/lib/syncEngine";

/** Lets a test resolve or reject a writer call on demand. */
function deferredWriter() {
  const calls: unknown[] = [];
  let resolveCurrent: (() => void) | null = null;
  let rejectCurrent: ((error: Error) => void) | null = null;

  const writer = vi.fn((payload: unknown) => {
    calls.push(payload);
    return new Promise<void>((resolve, reject) => {
      resolveCurrent = resolve;
      rejectCurrent = reject;
    });
  });

  return {
    writer,
    calls,
    resolve: () => resolveCurrent?.(),
    reject: (message = "network down") => rejectCurrent?.(new Error(message)),
  };
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    get: () => value,
  });
}

describe("SyncEngine", () => {
  let engine: SyncEngine<"progress" | "settings">;

  beforeEach(() => {
    vi.useFakeTimers();
    setOnline(true);
  });

  afterEach(() => {
    engine?.dispose();
    vi.useRealTimers();
  });

  it("debounces a burst of edits into a single write", async () => {
    const { writer, calls, resolve } = deferredWriter();
    engine = new SyncEngine({ debounceMs: 100 });
    engine.register("progress", writer);

    // Ten rapid taps, as in a full reading session.
    for (let i = 1; i <= 10; i++) engine.enqueue("progress", { chapters: i });

    expect(writer).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);

    expect(writer).toHaveBeenCalledTimes(1);
    expect(calls[0]).toEqual({ chapters: 10 });
    resolve();
  });

  it("keeps channels independent so one does not cancel the other", async () => {
    const progress = deferredWriter();
    const settings = deferredWriter();
    engine = new SyncEngine({ debounceMs: 100 });
    engine.register("progress", progress.writer);
    engine.register("settings", settings.writer);

    engine.enqueue("progress", { a: 1 });
    engine.enqueue("settings", { b: 2 });

    await vi.advanceTimersByTimeAsync(100);

    expect(progress.writer).toHaveBeenCalledTimes(1);
    expect(settings.writer).toHaveBeenCalledTimes(1);
  });

  it("reports pending work until the write lands", async () => {
    const { writer, resolve } = deferredWriter();
    engine = new SyncEngine({ debounceMs: 100 });
    engine.register("progress", writer);

    engine.enqueue("progress", { a: 1 });
    expect(engine.snapshot().status).toBe("pending");
    expect(engine.hasPendingWork).toBe(true);

    await vi.advanceTimersByTimeAsync(100);
    expect(engine.snapshot().status).toBe("syncing");

    resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(engine.snapshot().status).toBe("idle");
    expect(engine.hasPendingWork).toBe(false);
    expect(engine.snapshot().lastSyncedAt).toBeInstanceOf(Date);
  });

  it("flush bypasses the debounce", async () => {
    const { writer, resolve } = deferredWriter();
    engine = new SyncEngine({ debounceMs: 10_000 });
    engine.register("progress", writer);

    engine.enqueue("progress", { a: 1 });
    const flushed = engine.flush();
    await vi.advanceTimersByTimeAsync(0);

    expect(writer).toHaveBeenCalledTimes(1);
    resolve();
    await flushed;
  });

  it("retries with exponential backoff after a failure", async () => {
    const { writer, reject, resolve } = deferredWriter();
    engine = new SyncEngine({ debounceMs: 10, maxAttempts: 4 });
    engine.register("progress", writer);

    engine.enqueue("progress", { a: 1 });
    await vi.advanceTimersByTimeAsync(10);
    expect(writer).toHaveBeenCalledTimes(1);

    reject();
    await vi.advanceTimersByTimeAsync(0);

    // First retry after ~1s.
    await vi.advanceTimersByTimeAsync(1_000);
    expect(writer).toHaveBeenCalledTimes(2);

    reject();
    await vi.advanceTimersByTimeAsync(0);

    // Second retry waits ~2s, not another 1s.
    await vi.advanceTimersByTimeAsync(999);
    expect(writer).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1_001);
    expect(writer).toHaveBeenCalledTimes(3);

    resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(engine.snapshot().status).toBe("idle");
  });

  it("surfaces an error once retries are exhausted", async () => {
    const { writer, reject } = deferredWriter();
    engine = new SyncEngine({ debounceMs: 10, maxAttempts: 2 });
    engine.register("progress", writer);

    engine.enqueue("progress", { a: 1 });
    await vi.advanceTimersByTimeAsync(10);
    reject("boom");
    await vi.advanceTimersByTimeAsync(0);

    await vi.advanceTimersByTimeAsync(1_000);
    reject("boom");
    await vi.advanceTimersByTimeAsync(0);

    expect(engine.snapshot().status).toBe("error");
    expect(engine.snapshot().lastError).toBe("boom");
    // The payload is retained rather than dropped.
    expect(engine.hasPendingWork).toBe(true);
  });

  it("holds writes while offline and drains when connectivity returns", async () => {
    const { writer, resolve } = deferredWriter();
    engine = new SyncEngine({ debounceMs: 10 });
    engine.register("progress", writer);

    setOnline(false);
    engine.enqueue("progress", { a: 1 });
    await vi.advanceTimersByTimeAsync(10);

    expect(writer).not.toHaveBeenCalled();
    expect(engine.snapshot().status).toBe("offline");

    setOnline(true);
    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(0);

    expect(writer).toHaveBeenCalledTimes(1);
    resolve();
  });

  it("flushes when the page is hidden", async () => {
    const { writer, resolve } = deferredWriter();
    engine = new SyncEngine({ debounceMs: 10_000 });
    engine.register("progress", writer);

    engine.enqueue("progress", { a: 1 });

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);

    expect(writer).toHaveBeenCalledTimes(1);
    resolve();
  });

  it("does not lose an edit made while a write is in flight", async () => {
    const { writer, calls, resolve } = deferredWriter();
    engine = new SyncEngine({ debounceMs: 10 });
    engine.register("progress", writer);

    engine.enqueue("progress", { version: 1 });
    await vi.advanceTimersByTimeAsync(10);
    expect(writer).toHaveBeenCalledTimes(1);

    // User taps again before the first write resolves.
    engine.enqueue("progress", { version: 2 });
    resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(engine.hasPendingWork).toBe(true);
    await vi.advanceTimersByTimeAsync(10);

    expect(writer).toHaveBeenCalledTimes(2);
    expect(calls[1]).toEqual({ version: 2 });
    resolve();
  });

  it("stops scheduling after dispose", async () => {
    const { writer } = deferredWriter();
    engine = new SyncEngine({ debounceMs: 10 });
    engine.register("progress", writer);

    engine.enqueue("progress", { a: 1 });
    engine.dispose();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(writer).not.toHaveBeenCalled();
  });
});
