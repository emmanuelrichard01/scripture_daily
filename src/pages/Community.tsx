import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Clock,
  Flame,
  Search,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useProgress } from "@/hooks/useProgress";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { supabase } from "@/integrations/supabase/client";
import {
  communityKeys,
  fetchFriends,
  fetchIncomingRequests,
  fetchOutgoingRequests,
  initialsOf,
  nameOf,
  removeFriendship,
  respondToRequest,
  searchProfiles,
  sendFriendRequest,
  type CommunityProfile,
  type FriendSummary,
} from "@/lib/community";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Community() {
  const { user } = useAuth();
  const { totalChaptersRead, streakCount } = useProgress();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState<FriendSummary | null>(null);

  const debouncedSearch = useDebouncedValue(searchTerm.trim(), 350);
  const userId = user!.id; // RequireAuth guarantees a session on this route.

  const friends = useQuery({
    queryKey: communityKeys.friends(userId),
    queryFn: () => fetchFriends(userId),
  });

  const incoming = useQuery({
    queryKey: communityKeys.incoming(userId),
    queryFn: () => fetchIncomingRequests(userId),
  });

  const outgoing = useQuery({
    queryKey: communityKeys.outgoing(userId),
    queryFn: () => fetchOutgoingRequests(userId),
  });

  const search = useQuery({
    queryKey: communityKeys.search(userId, debouncedSearch),
    queryFn: () => searchProfiles(userId, debouncedSearch),
    enabled: debouncedSearch.length >= 2,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["community"] });
  };

  const add = useMutation({
    mutationFn: (receiverId: string) => sendFriendRequest(userId, receiverId),
    onSuccess: () => {
      toast.success("Request sent");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const respond = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "accepted" | "rejected" }) =>
      respondToRequest(id, status).then(() => status),
    onSuccess: (status) => {
      toast.success(status === "accepted" ? "You're now reading together" : "Request declined");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: removeFriendship,
    onSuccess: () => {
      toast.success("Removed");
      setPendingRemoval(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  /** User ids already in some relationship, so search can show the right state. */
  const relationshipState = useMemo(() => {
    const map = new Map<string, "friend" | "requested" | "incoming">();
    for (const friend of friends.data ?? []) map.set(friend.profile.userId, "friend");
    for (const request of outgoing.data ?? []) map.set(request.profile.userId, "requested");
    for (const request of incoming.data ?? []) map.set(request.profile.userId, "incoming");
    return map;
  }, [friends.data, outgoing.data, incoming.data]);

  // Keep the page live when someone accepts a request or logs a reading.
  useEffect(() => {
    const channel = supabase
      .channel(`community:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () =>
        queryClient.invalidateQueries({ queryKey: ["community"] }),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  // Memoised so the fallback `[]` is not a fresh array each render, which would
  // invalidate every downstream memo that depends on it.
  const friendList = useMemo(() => friends.data ?? [], [friends.data]);
  const activeToday = useMemo(
    () => friendList.filter((friend) => friend.readToday),
    [friendList],
  );

  /**
   * Standings including the signed-in reader, so the board is a shared
   * comparison rather than a list of other people.
   */
  const standings = useMemo(() => {
    const rows = [
      ...friendList.map((friend) => ({
        key: friend.profile.userId,
        name: nameOf(friend.profile),
        chapters: friend.chapters,
        streak: friend.streak,
        isSelf: false,
        profile: friend.profile as CommunityProfile | null,
      })),
      {
        key: "self",
        name: "You",
        chapters: totalChaptersRead,
        streak: streakCount,
        isSelf: true,
        profile: null,
      },
    ];
    return rows.sort((a, b) => b.chapters - a.chapters);
  }, [friendList, totalChaptersRead, streakCount]);

  return (
    <PageLayout title="Community">
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
        Reading alongside others makes the habit stick. Add friends to see how
        their reading is going — and let them see yours.
      </p>

      {/* ── Search ── */}
      <div className="relative mb-6">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Find someone by name"
          aria-label="Search readers by display name"
          className="h-12 rounded-2xl border-border/60 bg-card pl-11 shadow-sm"
        />
      </div>

      {debouncedSearch.length >= 2 && (
        <section aria-label="Search results" className="mb-8">
          {search.isPending ? (
            <div className="space-y-2">
              {[0, 1, 2].map((index) => (
                <div key={index} className="skeleton h-16 rounded-2xl" />
              ))}
            </div>
          ) : search.data?.length ? (
            <ul className="space-y-2">
              {search.data.map((profile) => {
                const state = relationshipState.get(profile.userId);
                return (
                  <li
                    key={profile.userId}
                    className="surface flex items-center justify-between gap-3 p-3"
                  >
                    <PersonRow profile={profile} />

                    {state === "friend" ? (
                      <span className="shrink-0 text-xs font-semibold text-success">
                        Friends
                      </span>
                    ) : state === "requested" ? (
                      <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        Requested
                      </span>
                    ) : state === "incoming" ? (
                      <span className="shrink-0 text-xs font-medium text-muted-foreground">
                        Awaiting you
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => add.mutate(profile.userId)}
                        disabled={add.isPending}
                        className="h-9 shrink-0 gap-1.5 rounded-xl font-semibold"
                      >
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                        Add
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="text-sm font-medium">No one found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Nobody matches "{debouncedSearch}". They may not have set a display
                name yet.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── Incoming requests ── */}
      {incoming.data && incoming.data.length > 0 && (
        <section aria-labelledby="requests-heading" className="mb-8">
          <h2 id="requests-heading" className="section-label mb-2.5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-track-orange" aria-hidden="true" />
            {incoming.data.length} request{incoming.data.length === 1 ? "" : "s"}
          </h2>

          <ul className="space-y-2">
            {incoming.data.map((request) => (
              <li
                key={request.friendshipId}
                className="surface flex items-center justify-between gap-3 p-3"
              >
                <PersonRow profile={request.profile} />

                <div className="flex shrink-0 gap-1.5">
                  <Button
                    size="icon"
                    onClick={() =>
                      respond.mutate({ id: request.friendshipId, status: "accepted" })
                    }
                    disabled={respond.isPending}
                    className="h-9 w-9 rounded-xl bg-success text-success-foreground hover:bg-success/90"
                    aria-label={`Accept ${nameOf(request.profile)}`}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      respond.mutate({ id: request.friendshipId, status: "rejected" })
                    }
                    disabled={respond.isPending}
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive"
                    aria-label={`Decline ${nameOf(request.profile)}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Today ── */}
      {friendList.length > 0 && (
        <section aria-labelledby="today-heading" className="mb-8">
          <h2 id="today-heading" className="section-label mb-2.5">
            Today
          </h2>

          <div className="surface p-5">
            {activeToday.length > 0 ? (
              <>
                <div className="mb-3 flex -space-x-2">
                  {activeToday.slice(0, 6).map((friend) => (
                    <Avatar
                      key={friend.friendshipId}
                      className="h-9 w-9 border-2 border-card"
                    >
                      <AvatarImage src={friend.profile.avatarUrl ?? undefined} alt="" />
                      <AvatarFallback className="text-xs font-bold">
                        {initialsOf(friend.profile)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {activeToday.length > 6 && (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-secondary text-2xs font-bold">
                      +{activeToday.length - 6}
                    </span>
                  )}
                </div>
                <p className="text-sm">
                  <span className="font-semibold">
                    {activeToday.length} of {friendList.length}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {activeToday.length === 1 ? "friend has" : "friends have"} read today.
                  </span>
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No one has logged a reading yet today. Be the first.
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Standings ── */}
      {friendList.length > 0 && (
        <section aria-labelledby="standings-heading" className="mb-8">
          <h2 id="standings-heading" className="section-label mb-2.5 flex items-center gap-2">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            Chapters read
          </h2>

          <ol className="surface divide-y divide-border/60 overflow-hidden">
            {standings.map((row, index) => (
              <li
                key={row.key}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  row.isSelf && "bg-primary/[0.06]",
                )}
              >
                <span
                  className={cn(
                    "w-5 shrink-0 text-center text-sm font-bold tabular-nums",
                    index === 0 ? "text-track-yellow" : "text-muted-foreground",
                  )}
                >
                  {index + 1}
                </span>

                {row.profile ? (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={row.profile.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback className="text-2xs font-bold">
                      {initialsOf(row.profile)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-2xs font-bold text-primary">
                    You
                  </span>
                )}

                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    row.isSelf ? "font-bold" : "font-medium",
                  )}
                >
                  {row.name}
                </span>

                {row.streak > 0 && (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-track-orange">
                    <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                    {row.streak}
                  </span>
                )}

                <span className="w-14 shrink-0 text-right text-sm font-bold tabular-nums">
                  {row.chapters.toLocaleString()}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── Friends ── */}
      <section aria-labelledby="friends-heading">
        <h2 id="friends-heading" className="section-label mb-2.5 flex items-center gap-2">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {friendList.length > 0 ? `${friendList.length} friends` : "Friends"}
        </h2>

        {friends.isPending ? (
          <div className="space-y-2">
            {[0, 1, 2].map((index) => (
              <div key={index} className="skeleton h-[72px] rounded-2xl" />
            ))}
          </div>
        ) : friendList.length > 0 ? (
          <ul className="space-y-2">
            {friendList.map((friend) => (
              <li
                key={friend.friendshipId}
                className="surface flex items-center justify-between gap-3 p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative shrink-0">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={friend.profile.avatarUrl ?? undefined} alt="" />
                      <AvatarFallback className="font-bold">
                        {initialsOf(friend.profile)}
                      </AvatarFallback>
                    </Avatar>
                    {friend.readToday && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-success"
                        aria-label="Read today"
                      />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{nameOf(friend.profile)}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        {friend.chapters.toLocaleString()} chapters
                      </span>
                      {friend.streak > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="flex items-center gap-1 font-semibold text-track-orange">
                            <Flame className="h-3 w-3" aria-hidden="true" />
                            {friend.streak}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setPendingRemoval(friend)}
                  className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${nameOf(friend.profile)}`}
                >
                  <UserMinus className="h-4 w-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <Users
              className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="text-sm font-semibold">No friends yet</p>
            <p className="mx-auto mt-1 max-w-[15rem] text-xs leading-relaxed text-muted-foreground">
              Search for someone by their display name above. They'll need to accept
              before either of you can see the other's progress.
            </p>
          </div>
        )}
      </section>

      {/* ── Sent requests ── */}
      {outgoing.data && outgoing.data.length > 0 && (
        <section aria-labelledby="sent-heading" className="mt-8">
          <h2 id="sent-heading" className="section-label mb-2.5">
            Awaiting a reply
          </h2>

          <ul className="space-y-2">
            {outgoing.data.map((request) => (
              <li
                key={request.friendshipId}
                className="surface flex items-center justify-between gap-3 p-3"
              >
                <PersonRow profile={request.profile} muted />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove.mutate(request.friendshipId)}
                  disabled={remove.isPending}
                  className="h-9 shrink-0 rounded-xl text-xs text-muted-foreground"
                >
                  Withdraw
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
      >
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {pendingRemoval ? nameOf(pendingRemoval.profile) : "this friend"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You'll both stop seeing each other's reading progress. You can send a
              new request later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingRemoval && remove.mutate(pendingRemoval.friendshipId)}
              className="h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}

/** Avatar plus name, shared by search results and request rows. */
function PersonRow({ profile, muted = false }: { profile: CommunityProfile; muted?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={profile.avatarUrl ?? undefined} alt="" />
        <AvatarFallback className="text-xs font-bold">{initialsOf(profile)}</AvatarFallback>
      </Avatar>
      <span
        className={cn(
          "min-w-0 truncate text-sm font-medium",
          muted && "text-muted-foreground",
        )}
      >
        {nameOf(profile)}
      </span>
    </div>
  );
}
