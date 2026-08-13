import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  eachDay,
  isISODate,
  parseISODate,
  readingDayNumber,
  toISODate,
  formatRelativeTime,
  greetingFor,
} from "@/lib/date";

describe("toISODate", () => {
  it("formats in local time, not UTC", () => {
    // 23:30 local on Aug 12. `toISOString()` would report the 13th for any
    // timezone at or ahead of UTC+01:00 — this is the bug that caused progress
    // to be written under a day the app never read back.
    expect(toISODate(new Date(2026, 7, 12, 23, 30))).toBe("2026-08-12");
  });

  it("formats early-morning times as the same local day", () => {
    // Mirror case: `toISOString()` reports the 11th anywhere west of UTC.
    expect(toISODate(new Date(2026, 7, 12, 0, 15))).toBe("2026-08-12");
  });

  it("zero-pads single-digit months and days", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("parseISODate", () => {
  it("round-trips through toISODate", () => {
    expect(toISODate(parseISODate("2026-08-12"))).toBe("2026-08-12");
  });

  it("parses to local midnight rather than UTC midnight", () => {
    const date = parseISODate("2026-08-12");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(12);
    expect(date.getHours()).toBe(0);
  });

  it("rejects malformed input", () => {
    expect(() => parseISODate("12/08/2026")).toThrow(RangeError);
    expect(() => parseISODate("2026-8-12")).toThrow(RangeError);
  });
});

describe("isISODate", () => {
  it("accepts real calendar dates", () => {
    expect(isISODate("2026-08-12")).toBe(true);
    expect(isISODate("2024-02-29")).toBe(true);
  });

  it("rejects dates that overflow their month", () => {
    expect(isISODate("2026-02-31")).toBe(false);
    expect(isISODate("2025-02-29")).toBe(false);
    expect(isISODate("2026-13-01")).toBe(false);
  });

  it("rejects non-date values", () => {
    expect(isISODate("")).toBe(false);
    expect(isISODate(null)).toBe(false);
    expect(isISODate(20260812)).toBe(false);
  });
});

describe("addDays", () => {
  it("moves forward and backward", () => {
    expect(addDays("2026-08-12", 1)).toBe("2026-08-13");
    expect(addDays("2026-08-12", -1)).toBe("2026-08-11");
    expect(addDays("2026-08-12", 0)).toBe("2026-08-12");
  });

  it("crosses month and year boundaries", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("handles leap days", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2025-02-28", 1)).toBe("2025-03-01");
  });
});

describe("daysBetween", () => {
  it("counts whole days in both directions", () => {
    expect(daysBetween("2026-08-12", "2026-08-19")).toBe(7);
    expect(daysBetween("2026-08-19", "2026-08-12")).toBe(-7);
    expect(daysBetween("2026-08-12", "2026-08-12")).toBe(0);
  });

  it("stays exact across a year", () => {
    expect(daysBetween("2026-01-01", "2027-01-01")).toBe(365);
    expect(daysBetween("2024-01-01", "2025-01-01")).toBe(366);
  });

  it("is consistent with addDays across DST boundaries", () => {
    // US DST transitions produce 23- and 25-hour days; naive millisecond
    // division truncates those to 0 or rounds them to 2.
    for (const start of ["2026-03-07", "2026-11-06"]) {
      for (let offset = 1; offset <= 5; offset++) {
        expect(daysBetween(start, addDays(start, offset))).toBe(offset);
      }
    }
  });
});

describe("eachDay", () => {
  it("is inclusive of both endpoints", () => {
    expect(eachDay("2026-08-12", "2026-08-15")).toEqual([
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
      "2026-08-15",
    ]);
  });

  it("returns a single day when the range is one day", () => {
    expect(eachDay("2026-08-12", "2026-08-12")).toEqual(["2026-08-12"]);
  });

  it("returns nothing for an inverted range", () => {
    expect(eachDay("2026-08-15", "2026-08-12")).toEqual([]);
  });
});

describe("readingDayNumber", () => {
  it("counts the start date as day 1", () => {
    expect(readingDayNumber("2026-08-12", "2026-08-12")).toBe(1);
    expect(readingDayNumber("2026-08-12", "2026-08-13")).toBe(2);
    expect(readingDayNumber("2026-01-01", "2026-12-31")).toBe(365);
  });

  it("clamps a future start date to day 1", () => {
    expect(readingDayNumber("2026-09-01", "2026-08-12")).toBe(1);
  });
});

describe("formatRelativeTime", () => {
  const now = new Date(2026, 7, 12, 12, 0, 0);
  const ago = (ms: number) => new Date(now.getTime() - ms);

  it("describes recent times coarsely", () => {
    expect(formatRelativeTime(ago(5_000), now)).toBe("just now");
    expect(formatRelativeTime(ago(5 * 60_000), now)).toBe("5m ago");
    expect(formatRelativeTime(ago(3 * 3_600_000), now)).toBe("3h ago");
    expect(formatRelativeTime(ago(2 * 86_400_000), now)).toBe("2d ago");
  });

  it("never reports 0m for a time past the just-now window", () => {
    expect(formatRelativeTime(ago(50_000), now)).toBe("1m ago");
  });
});

describe("greetingFor", () => {
  it("changes with the local hour", () => {
    expect(greetingFor(new Date(2026, 7, 12, 8))).toBe("Good morning");
    expect(greetingFor(new Date(2026, 7, 12, 13))).toBe("Good afternoon");
    expect(greetingFor(new Date(2026, 7, 12, 20))).toBe("Good evening");
  });
});
