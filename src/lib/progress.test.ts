import { describe, expect, it } from "vitest";
import {
  chaptersInMonth,
  clearDay,
  completeDay,
  createEmptyProgress,
  deriveAveragePerDay,
  deriveBestStreak,
  deriveListProgress,
  deriveStreak,
  deriveTotalChapters,
  deserializeLog,
  lastReadDate,
  mergeLogs,
  mergeProgress,
  parseProgress,
  serializeLog,
  setStartDate,
  toggleReading,
  type ProgressState,
  type ReadingLog,
} from "@/lib/progress";

const stateWith = (history: ReadingLog, startDate = "2026-08-01"): ProgressState => ({
  version: 2,
  history,
  startDate,
  updatedAt: "2026-08-12T00:00:00.000Z",
});

describe("parseProgress", () => {
  it("accepts a well-formed document", () => {
    const parsed = parseProgress({
      version: 2,
      history: { "2026-08-12": [1, 2] },
      startDate: "2026-08-01",
      updatedAt: "2026-08-12T00:00:00.000Z",
    });
    expect(parsed?.history).toEqual({ "2026-08-12": [1, 2] });
    expect(parsed?.startDate).toBe("2026-08-01");
  });

  it("rejects other versions and non-objects", () => {
    expect(parseProgress({ version: 1, history: {} })).toBeNull();
    expect(parseProgress(null)).toBeNull();
    expect(parseProgress("nope")).toBeNull();
    expect(parseProgress({ version: 2 })).toBeNull();
  });

  it("drops malformed date keys and unknown list ids", () => {
    const parsed = parseProgress({
      version: 2,
      history: {
        "2026-08-12": [1, 99, "2", null],
        "not-a-date": [1],
        "2026-02-31": [1],
      },
      startDate: "2026-08-01",
    });
    expect(parsed?.history).toEqual({ "2026-08-12": [1] });
  });

  it("deduplicates and sorts list ids within a day", () => {
    const parsed = parseProgress({
      version: 2,
      history: { "2026-08-12": [3, 1, 3, 2] },
      startDate: "2026-08-01",
    });
    expect(parsed?.history["2026-08-12"]).toEqual([1, 2, 3]);
  });

  it("omits days that end up empty", () => {
    const parsed = parseProgress({
      version: 2,
      history: { "2026-08-12": [], "2026-08-13": [99] },
      startDate: "2026-08-01",
    });
    expect(parsed?.history).toEqual({});
  });

  it("falls back to today when the start date is unusable", () => {
    const parsed = parseProgress({ version: 2, history: {}, startDate: "garbage" });
    expect(parsed?.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("toggleReading", () => {
  it("adds a reading to an empty day", () => {
    const next = toggleReading(stateWith({}), "2026-08-12", 3);
    expect(next.history["2026-08-12"]).toEqual([3]);
  });

  it("keeps list ids sorted", () => {
    let state = stateWith({});
    state = toggleReading(state, "2026-08-12", 7);
    state = toggleReading(state, "2026-08-12", 2);
    expect(state.history["2026-08-12"]).toEqual([2, 7]);
  });

  it("removes a reading that was already marked", () => {
    const next = toggleReading(stateWith({ "2026-08-12": [1, 2] }), "2026-08-12", 1);
    expect(next.history["2026-08-12"]).toEqual([2]);
  });

  it("deletes the day key when the last reading is removed", () => {
    const next = toggleReading(stateWith({ "2026-08-12": [1] }), "2026-08-12", 1);
    expect(next.history).not.toHaveProperty("2026-08-12");
  });

  it("does not mutate the input state", () => {
    const original = stateWith({ "2026-08-12": [1] });
    toggleReading(original, "2026-08-12", 2);
    expect(original.history["2026-08-12"]).toEqual([1]);
  });

  it("ignores invalid dates and unknown list ids", () => {
    const original = stateWith({});
    expect(toggleReading(original, "nope", 1)).toBe(original);
    expect(toggleReading(original, "2026-08-12", 99)).toBe(original);
  });

  it("advances updatedAt so sync can order writes", () => {
    const original = stateWith({});
    const next = toggleReading(original, "2026-08-12", 1);
    expect(next.updatedAt).not.toBe(original.updatedAt);
  });
});

describe("completeDay and clearDay", () => {
  it("marks all ten lists complete", () => {
    const next = completeDay(stateWith({}), "2026-08-12");
    expect(next.history["2026-08-12"]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("is a no-op on an already complete day", () => {
    const full = completeDay(stateWith({}), "2026-08-12");
    expect(completeDay(full, "2026-08-12")).toBe(full);
  });

  it("clears a day entirely", () => {
    const next = clearDay(stateWith({ "2026-08-12": [1, 2] }), "2026-08-12");
    expect(next.history).not.toHaveProperty("2026-08-12");
  });

  it("is a no-op when clearing an empty day", () => {
    const original = stateWith({});
    expect(clearDay(original, "2026-08-12")).toBe(original);
  });
});

describe("setStartDate", () => {
  it("updates a valid date", () => {
    expect(setStartDate(stateWith({}), "2026-01-01").startDate).toBe("2026-01-01");
  });

  it("rejects an invalid date and an unchanged date", () => {
    const original = stateWith({}, "2026-08-01");
    expect(setStartDate(original, "nope")).toBe(original);
    expect(setStartDate(original, "2026-08-01")).toBe(original);
  });
});

describe("derivations", () => {
  const history: ReadingLog = {
    "2026-08-10": [1, 2, 3],
    "2026-08-11": [1, 2],
    "2026-08-12": [1],
  };

  it("counts lifetime chapters per list", () => {
    const progress = deriveListProgress(history);
    expect(progress[1]).toBe(3);
    expect(progress[2]).toBe(2);
    expect(progress[3]).toBe(1);
    expect(progress[10]).toBe(0);
  });

  it("includes every list even with no history", () => {
    expect(Object.keys(deriveListProgress({}))).toHaveLength(10);
  });

  it("counts total chapters", () => {
    expect(deriveTotalChapters(history)).toBe(6);
    expect(deriveTotalChapters({})).toBe(0);
  });

  it("counts chapters within a month", () => {
    expect(chaptersInMonth({ ...history, "2026-07-30": [1, 2] }, "2026-08")).toBe(6);
  });

  it("averages over elapsed days, not active days", () => {
    // 6 chapters over Aug 10-12 inclusive = 3 elapsed days.
    expect(deriveAveragePerDay(history, "2026-08-10", "2026-08-12")).toBe(2);
  });
});

describe("deriveStreak", () => {
  it("counts consecutive days ending today", () => {
    const history = { "2026-08-10": [1], "2026-08-11": [1], "2026-08-12": [1] };
    expect(deriveStreak(history, "2026-08-12")).toBe(3);
  });

  it("keeps a streak alive on a day not yet read", () => {
    // Reading has not happened yet today, but the day is not over. Reporting 0
    // here would tell someone at breakfast that their 10-day run had ended.
    const history = { "2026-08-10": [1], "2026-08-11": [1] };
    expect(deriveStreak(history, "2026-08-12")).toBe(2);
  });

  it("breaks once a full day is skipped", () => {
    const history = { "2026-08-09": [1], "2026-08-10": [1] };
    expect(deriveStreak(history, "2026-08-12")).toBe(0);
  });

  it("returns 0 for empty history", () => {
    expect(deriveStreak({}, "2026-08-12")).toBe(0);
  });

  it("counts a single day read today", () => {
    expect(deriveStreak({ "2026-08-12": [1] }, "2026-08-12")).toBe(1);
  });

  it("counts across a month boundary", () => {
    const history = { "2026-07-31": [1], "2026-08-01": [1] };
    expect(deriveStreak(history, "2026-08-01")).toBe(2);
  });
});

describe("deriveBestStreak", () => {
  it("finds the longest run", () => {
    const history = {
      "2026-08-01": [1],
      "2026-08-02": [1],
      "2026-08-03": [1],
      "2026-08-09": [1],
      "2026-08-10": [1],
    };
    expect(deriveBestStreak(history)).toBe(3);
  });

  it("handles a single day and empty history", () => {
    expect(deriveBestStreak({ "2026-08-01": [1] })).toBe(1);
    expect(deriveBestStreak({})).toBe(0);
  });

  it("does not depend on key insertion order", () => {
    const history = { "2026-08-03": [1], "2026-08-01": [1], "2026-08-02": [1] };
    expect(deriveBestStreak(history)).toBe(3);
  });
});

describe("cloud serialization", () => {
  it("round-trips a log", () => {
    const history: ReadingLog = { "2026-08-12": [1, 2], "2026-08-11": [3] };
    expect(deserializeLog(serializeLog(history))).toEqual(history);
  });

  it("produces a stable, sorted array for identical logs", () => {
    const a = serializeLog({ "2026-08-11": [3], "2026-08-12": [1, 2] });
    const b = serializeLog({ "2026-08-12": [2, 1], "2026-08-11": [3] });
    expect(a).toEqual(b);
  });

  it("drops malformed and out-of-range entries", () => {
    expect(deserializeLog(["2026-08-12-1", "garbage", "2026-08-12-99", ""])).toEqual({
      "2026-08-12": [1],
    });
  });

  it("tolerates null and undefined", () => {
    expect(deserializeLog(null)).toEqual({});
    expect(deserializeLog(undefined)).toEqual({});
  });
});

describe("mergeLogs", () => {
  it("unions overlapping days", () => {
    const merged = mergeLogs({ "2026-08-12": [1, 2] }, { "2026-08-12": [2, 3] });
    expect(merged["2026-08-12"]).toEqual([1, 2, 3]);
  });

  it("keeps days unique to either side", () => {
    const merged = mergeLogs({ "2026-08-11": [1] }, { "2026-08-12": [2] });
    expect(merged).toEqual({ "2026-08-11": [1], "2026-08-12": [2] });
  });

  it("is commutative", () => {
    const a = { "2026-08-12": [1, 2] };
    const b = { "2026-08-12": [2, 3], "2026-08-11": [5] };
    expect(mergeLogs(a, b)).toEqual(mergeLogs(b, a));
  });

  it("does not mutate either input", () => {
    const a = { "2026-08-12": [1] };
    const b = { "2026-08-12": [2] };
    mergeLogs(a, b);
    expect(a["2026-08-12"]).toEqual([1]);
    expect(b["2026-08-12"]).toEqual([2]);
  });
});

describe("mergeProgress", () => {
  it("keeps the earlier start date", () => {
    const local = stateWith({}, "2026-08-01");
    const remote = stateWith({}, "2026-01-01");
    expect(mergeProgress(local, remote).startDate).toBe("2026-01-01");
    expect(mergeProgress(remote, local).startDate).toBe("2026-01-01");
  });

  it("never loses a reading recorded on either device", () => {
    const local = stateWith({ "2026-08-12": [1, 2] });
    const remote = stateWith({ "2026-08-11": [3], "2026-08-12": [4] });
    const merged = mergeProgress(local, remote);
    expect(merged.history["2026-08-12"]).toEqual([1, 2, 4]);
    expect(merged.history["2026-08-11"]).toEqual([3]);
  });
});

describe("createEmptyProgress", () => {
  it("starts empty at the given start date", () => {
    const state = createEmptyProgress("2026-08-12");
    expect(state.history).toEqual({});
    expect(state.startDate).toBe("2026-08-12");
    expect(state.version).toBe(2);
  });
});

describe("lastReadDate", () => {
  it("returns the most recent day with a reading", () => {
    const history: ReadingLog = {
      "2026-08-10": [1],
      "2026-08-12": [2, 3],
      "2026-08-11": [4],
    };
    expect(lastReadDate(history)).toBe("2026-08-12");
  });

  it("ignores days whose readings were all unticked", () => {
    const history: ReadingLog = { "2026-08-10": [1], "2026-08-12": [] };
    expect(lastReadDate(history)).toBe("2026-08-10");
  });

  it("is null before anything has been read", () => {
    expect(lastReadDate({})).toBeNull();
  });
});
