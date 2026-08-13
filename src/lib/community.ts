/**
 * Community data access.
 *
 * Every Supabase call for friendships lives here so the page components stay
 * declarative, and so the query keys are defined once rather than being
 * restated (and mistyped) at each call site. The types and the pure display
 * helpers live in `friends.ts` and are re-exported below, so a caller has one
 * import to reach for.
 */

import { supabase } from "@/integrations/supabase/client";
import { daysBetween, todayISO, type ISODate } from "@/lib/date";
import { isUserId, type CommunityProfile, type FriendSummary, type PendingRequest } from "@/lib/friends";

export type { CommunityProfile, FriendSummary, PendingRequest } from "@/lib/friends";
export {
  activityLabel,
  couldUseEncouragement,
  firstNameOf,
  initialsOf,
  inviteLinkFor,
  isUserId,
  nameOf,
  recentWindow,
} from "@/lib/friends";

/** Query keys, centralised so invalidation cannot drift from the queries. */
export const communityKeys = {
  friends: (userId: string) => ["community", "friends", userId] as const,
  incoming: (userId: string) => ["community", "incoming", userId] as const,
  outgoing: (userId: string) => ["community", "outgoing", userId] as const,
  search: (userId: string, term: string) => ["community", "search", userId, term] as const,
  profile: (profileId: string) => ["community", "profile", profileId] as const,
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
    .select("id, sender_id, receiver_id, updated_at")
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
      .select("user_id, streak_count, total_chapters_read, last_read_date")
      .in("user_id", friendIds),
  ]);

  const progressByUser = new Map(
    (progressResult.data ?? []).map((row) => [row.user_id, row]),
  );

  const today = todayISO();

  return friendships
    .map((friendship): FriendSummary | null => {
      const friendId =
        friendship.sender_id === userId ? friendship.receiver_id : friendship.sender_id;
      const profile = profiles.get(friendId);
      if (!profile) return null;

      const progress = progressByUser.get(friendId);
      /*
       * `last_read_date` is a local calendar date the client derives from its
       * own reading log. The previous implementation sliced `updated_at`, a UTC
       * timestamp that also advances on unrelated writes — so friends showed as
       * having read when they had merely changed a setting, and the day rolled
       * over at the wrong hour for anyone outside UTC.
       */
      const lastReadDate = (progress?.last_read_date as ISODate | null) ?? null;

      return {
        friendshipId: friendship.id,
        profile,
        streak: progress?.streak_count ?? 0,
        chapters: progress?.total_chapters_read ?? 0,
        lastReadDate,
        readToday: lastReadDate === today,
        daysSinceRead: lastReadDate ? daysBetween(lastReadDate, today) : null,
        since: friendship.updated_at ?? null,
      };
    })
    .filter((entry): entry is FriendSummary => entry !== null)
    .sort((a, b) => b.chapters - a.chapters);
}

/** One profile by user id, for an invite link that names who sent it. */
export async function fetchProfileById(
  userId: string,
): Promise<CommunityProfile | null> {
  // The id comes off a URL, so it is untrusted input; a malformed one would
  // otherwise reach Postgres as a uuid cast error rather than an empty result.
  if (!isUserId(userId)) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toProfile(data) : null;
}

/** Requests waiting on this user's response. */
export async function fetchIncomingRequests(userId: string): Promise<PendingRequest[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select("id, sender_id, created_at")
    .eq("receiver_id", userId)
    .eq("status", "pending");

  if (error) throw new Error(error.message);
  if (!data?.length) return [];

  const profiles = await fetchProfiles(data.map((row) => row.sender_id));

  return data
    .map((row): PendingRequest | null => {
      const profile = profiles.get(row.sender_id);
      return profile
        ? { friendshipId: row.id, profile, sentAt: row.created_at ?? null }
        : null;
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
    .select("id, receiver_id, created_at")
    .eq("sender_id", userId)
    .eq("status", "pending");

  if (error) throw new Error(error.message);
  if (!data?.length) return [];

  const profiles = await fetchProfiles(data.map((row) => row.receiver_id));

  return data
    .map((row): PendingRequest | null => {
      const profile = profiles.get(row.receiver_id);
      return profile
        ? { friendshipId: row.id, profile, sentAt: row.created_at ?? null }
        : null;
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

/**
 * Sends a friend an encouragement push.
 *
 * Goes through the app's own API rather than straight to Supabase: delivering a
 * push needs the VAPID private key and the recipient's subscription rows, and
 * neither may ever reach the browser. The endpoint re-checks the friendship
 * server-side, so a caller cannot notify a stranger by editing the id.
 */
export async function sendNudge(friendId: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in again to send encouragement.");

  const response = await fetch("/api/nudge", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ friendId }),
  });

  const body = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    throw new Error(body?.error ?? "Couldn't send that right now.");
  }
}
