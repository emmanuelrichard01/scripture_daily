/**
 * Community data access.
 *
 * Every Supabase call for friendships lives here so the page components stay
 * declarative, and so the query keys are defined once rather than being
 * restated (and mistyped) at each call site.
 */

import { supabase } from "@/integrations/supabase/client";
import { todayISO, type ISODate } from "@/lib/date";

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
}

export interface PendingRequest {
  readonly friendshipId: string;
  readonly profile: CommunityProfile;
}

/** Query keys, centralised so invalidation cannot drift from the queries. */
export const communityKeys = {
  friends: (userId: string) => ["community", "friends", userId] as const,
  incoming: (userId: string) => ["community", "incoming", userId] as const,
  outgoing: (userId: string) => ["community", "outgoing", userId] as const,
  search: (userId: string, term: string) => ["community", "search", userId, term] as const,
};

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

function toProfile(row: ProfileRow): CommunityProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  };
}

async function fetchProfiles(userIds: readonly string[]): Promise<Map<string, CommunityProfile>> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url")
    .in("user_id", [...userIds]);

  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((row) => [row.user_id, toProfile(row)]));
}

/**
 * Accepted friends, with their aggregate progress.
 *
 * Two round trips rather than a join: RLS on `reading_progress` is evaluated
 * per row against the friendship table, and keeping the queries separate keeps
 * both policies simple enough to reason about.
 */
export async function fetchFriends(userId: string): Promise<FriendSummary[]> {
  const { data: friendships, error } = await supabase
    .from("friendships")
    .select("id, sender_id, receiver_id")
    .eq("status", "accepted")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  if (error) throw new Error(error.message);
  if (!friendships?.length) return [];

  const friendIds = friendships.map((row) =>
    row.sender_id === userId ? row.receiver_id : row.sender_id,
  );

  const [profiles, progressResult] = await Promise.all([
    fetchProfiles(friendIds),
    supabase
      .from("reading_progress")
      .select("user_id, streak_count, total_chapters_read, updated_at")
      .in("user_id", friendIds),
  ]);

  const progressByUser = new Map(
    (progressResult.data ?? []).map((row) => [row.user_id, row]),
  );

  const today = todayISO();

  return friendships
    .map((friendship) => {
      const friendId =
        friendship.sender_id === userId ? friendship.receiver_id : friendship.sender_id;
      const profile = profiles.get(friendId);
      if (!profile) return null;

      const progress = progressByUser.get(friendId);
      // `updated_at` is a UTC timestamp; sliced to a date it is close enough for
      // an "active today" badge, and it is the only signal RLS exposes.
      const lastReadDate = progress?.updated_at
        ? (progress.updated_at.slice(0, 10) as ISODate)
        : null;

      return {
        friendshipId: friendship.id,
        profile,
        streak: progress?.streak_count ?? 0,
        chapters: progress?.total_chapters_read ?? 0,
        lastReadDate,
        readToday: lastReadDate === today,
      } satisfies FriendSummary;
    })
    .filter((entry): entry is FriendSummary => entry !== null)
    .sort((a, b) => b.chapters - a.chapters);
}

/** Requests waiting on this user's response. */
export async function fetchIncomingRequests(userId: string): Promise<PendingRequest[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select("id, sender_id")
    .eq("receiver_id", userId)
    .eq("status", "pending");

  if (error) throw new Error(error.message);
  if (!data?.length) return [];

  const profiles = await fetchProfiles(data.map((row) => row.sender_id));

  return data
    .map((row) => {
      const profile = profiles.get(row.sender_id);
      return profile ? { friendshipId: row.id, profile } : null;
    })
    .filter((entry): entry is PendingRequest => entry !== null);
}

/**
 * Requests this user has sent and that are still pending.
 *
 * Needed so search results can show "Requested" instead of offering an Add
 * button that would fail on the unique constraint — the previous version had no
 * way to tell, so users repeatedly re-sent requests and saw an error each time.
 */
export async function fetchOutgoingRequests(userId: string): Promise<PendingRequest[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select("id, receiver_id")
    .eq("sender_id", userId)
    .eq("status", "pending");

  if (error) throw new Error(error.message);
  if (!data?.length) return [];

  const profiles = await fetchProfiles(data.map((row) => row.receiver_id));

  return data
    .map((row) => {
      const profile = profiles.get(row.receiver_id);
      return profile ? { friendshipId: row.id, profile } : null;
    })
    .filter((entry): entry is PendingRequest => entry !== null);
}

export async function searchProfiles(
  userId: string,
  term: string,
): Promise<CommunityProfile[]> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  // Escape the LIKE wildcards so a search for "50%" is a literal search.
  const escaped = trimmed.replace(/[%_]/g, (character) => `\\${character}`);

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url")
    .ilike("display_name", `%${escaped}%`)
    .neq("user_id", userId)
    .limit(20);

  if (error) throw new Error(error.message);
  return (data ?? []).map(toProfile);
}

export async function sendFriendRequest(userId: string, receiverId: string): Promise<void> {
  const { error } = await supabase
    .from("friendships")
    .insert({ sender_id: userId, receiver_id: receiverId, status: "pending" });

  if (!error) return;
  // 23505 is a unique violation: a relationship in some state already exists.
  if (error.code === "23505") throw new Error("You've already connected with this person.");
  throw new Error(error.message);
}

export async function respondToRequest(
  friendshipId: string,
  status: "accepted" | "rejected",
): Promise<void> {
  const { error } = await supabase
    .from("friendships")
    .update({ status })
    .eq("id", friendshipId);

  if (error) throw new Error(error.message);
}

/** Removes a friendship or withdraws a sent request. */
export async function removeFriendship(friendshipId: string): Promise<void> {
  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
  if (error) throw new Error(error.message);
}

/** Display name, falling back to something readable rather than blank. */
export function nameOf(profile: CommunityProfile): string {
  return profile.displayName?.trim() || "Unnamed reader";
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
