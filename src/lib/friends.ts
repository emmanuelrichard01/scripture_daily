/**
 * Community domain types and display logic.
 *
 * Deliberately separate from `community.ts`, which owns the Supabase calls.
 * Importing that module instantiates the auth client and starts its token
 * refresh timer — fine in the app, but it means a unit test for a string
 * formatter cannot run without standing up a network client. Everything here is
 * pure and has no I/O.
 */

import { addDays, todayISO, type ISODate } from "@/lib/date";

export interface CommunityProfile {
  readonly userId: string;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
}

export interface FriendSummary {
  readonly friendshipId: string;
  readonly profile: CommunityProfile;
  readonly streak: number;
  readonly chapters: number;
  /** Local date of their most recent recorded reading, if any. */
  readonly lastReadDate: ISODate | null;
  /** Whether they have logged anything today. */
  readonly readToday: boolean;
  /** Days since their last reading, or `null` if they have never read. */
  readonly daysSinceRead: number | null;
  /** When the friendship was accepted. */
  readonly since: string | null;
}

export interface PendingRequest {
  readonly friendshipId: string;
  readonly profile: CommunityProfile;
  readonly sentAt: string | null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Whether a string could be a Supabase user id. */
export function isUserId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** A link that opens the app with a friend request pre-addressed to `userId`. */
export function inviteLinkFor(userId: string): string {
  return `${window.location.origin}/community?add=${userId}`;
}

/** Display name, falling back to something readable rather than blank. */
export function nameOf(profile: CommunityProfile): string {
  return profile.displayName?.trim() || "Unnamed reader";
}

/** First name only, for sentence-cased copy like "Nudge Ada". */
export function firstNameOf(profile: CommunityProfile): string {
  return nameOf(profile).split(/\s+/)[0];
}

export function initialsOf(profile: CommunityProfile): string {
  const name = profile.displayName?.trim();
  if (!name) return "?";

  const parts = name.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Plain-language summary of when someone last read.
 *
 * Deliberately vague past a week. "Last read 43 days ago" reads as an
 * accusation; "a while ago" carries the same information without the sting.
 */
export function activityLabel(friend: FriendSummary): string {
  if (friend.lastReadDate === null) return "Not started yet";

  const days = friend.daysSinceRead ?? 0;
  if (days <= 0) return "Read today";
  if (days === 1) return "Read yesterday";
  if (days < 7) return `Read ${days} days ago`;
  if (days < 14) return "Read last week";
  return "Read a while ago";
}

/**
 * Whether a friend has gone quiet long enough that a nudge is welcome.
 *
 * Someone who has never read is excluded: they have not lapsed, they have not
 * started, and prodding a brand-new signup is the wrong first interaction.
 */
export function couldUseEncouragement(friend: FriendSummary): boolean {
  return friend.daysSinceRead !== null && friend.daysSinceRead >= 2;
}

/** The last seven local dates, oldest first — the window the summary covers. */
export function recentWindow(today: ISODate = todayISO()): ISODate[] {
  return Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
}
