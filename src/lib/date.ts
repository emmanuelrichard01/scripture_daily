/**
 * Local-day arithmetic.
 *
 * A "reading day" is a **calendar day in the user's own timezone**, identified
 * by an ISO `YYYY-MM-DD` string. Every date in this app — history keys, streaks,
 * start dates, calendar cells — flows through this module.
 *
 * The two traps this module exists to close:
 *
 *   1. `new Date().toISOString().slice(0, 10)` yields the *UTC* day. West of
 *      UTC that is tomorrow's date after ~19:00 local, so progress gets written
 *      under a key that today's reads never look at.
 *   2. `new Date("2026-08-12")` parses as UTC midnight, but `.getDate()` reads
 *      it back in local time — west of UTC you get the 11th. Iterating days that
 *      way silently drops or duplicates entries, which is how streaks break.
 *
 * Use {@link todayISO} and {@link parseISODate} instead of either.
 */

/** An ISO calendar date, `YYYY-MM-DD`, in the user's local timezone. */
export type ISODate = string;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Formats a `Date` as a local-time `YYYY-MM-DD`. Never uses UTC. */
export function toISODate(date: Date): ISODate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Today's calendar date in the user's timezone. */
export function todayISO(): ISODate {
  return toISODate(new Date());
}

/**
 * Parses `YYYY-MM-DD` into a `Date` at **local** midnight.
 *
 * Built from numeric parts rather than `new Date(string)` precisely because the
 * string form is specified to parse as UTC.
 */
export function parseISODate(iso: ISODate): Date {
  const match = ISO_DATE_RE.exec(iso);
  if (!match) {
    throw new RangeError(`Not an ISO calendar date: ${JSON.stringify(iso)}`);
  }
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

/** True when `value` is a well-formed `YYYY-MM-DD` naming a real calendar day. */
export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string") return false;
  const match = ISO_DATE_RE.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  // Rejects overflow like 2026-02-31, which Date would roll into March.
  return (
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day)
  );
}

/**
 * Returns the ISO date `days` after `iso` (negative moves backwards).
 *
 * Goes through `Date`'s day arithmetic so DST transitions are handled: on a
 * 23- or 25-hour day this still advances exactly one calendar day, which naive
 * `+ 86_400_000` millisecond math does not.
 */
export function addDays(iso: ISODate, days: number): ISODate {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/**
 * Whole calendar days from `from` to `to`. Positive when `to` is later.
 *
 * Rounds rather than truncates so that a DST shift — which makes the raw
 * millisecond span 23 or 25 hours — still reports a whole number of days.
 */
export function daysBetween(from: ISODate, to: ISODate): number {
  const MS_PER_DAY = 86_400_000;
  const start = parseISODate(from).getTime();
  const end = parseISODate(to).getTime();
  return Math.round((end - start) / MS_PER_DAY);
}

/** Chronologically ordered ISO dates from `from` to `to`, both inclusive. */
export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const span = daysBetween(from, to);
  if (span < 0) return [];
  const days: ISODate[] = new Array(span + 1);
  for (let offset = 0; offset <= span; offset++) {
    days[offset] = addDays(from, offset);
  }
  return days;
}

/**
 * The reading day number for `on`, counting the start date as day 1.
 *
 * Clamped to a minimum of 1 so a start date in the future still reads as
 * "Day 1" rather than a negative or zero day.
 */
export function readingDayNumber(startDate: ISODate, on: ISODate = todayISO()): number {
  return Math.max(1, daysBetween(startDate, on) + 1);
}

/** The `YYYY-MM` month key an ISO date belongs to. */
export function monthKey(iso: ISODate): string {
  return iso.slice(0, 7);
}

// ─────────────────────────── Display formatting ───────────────────────────

/** e.g. `Wednesday, Aug 12` */
export function formatLongDate(iso: ISODate, locale?: string): string {
  return parseISODate(iso).toLocaleDateString(locale, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/** e.g. `Aug 12` */
export function formatShortDate(iso: ISODate, locale?: string): string {
  return parseISODate(iso).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}

/** e.g. `Aug 12, 2026` */
export function formatMediumDate(iso: ISODate, locale?: string): string {
  return parseISODate(iso).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Coarse relative time for sync timestamps: `just now`, `4m ago`, `2d ago`. */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Time-of-day greeting, keyed off the local hour. */
export function greetingFor(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
