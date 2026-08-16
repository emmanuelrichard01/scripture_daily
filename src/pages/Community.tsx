import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  Clock,
  Flame,
  Hand,
  Link2,
  Search,
  Sparkles,
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
  activityLabel,
  communityKeys,
  couldUseEncouragement,
  fetchFriends,
  fetchIncomingRequests,
  fetchOutgoingRequests,
  fetchProfileById,
  firstNameOf,
  initialsOf,
  inviteLinkFor,
  isUserId,
  nameOf,
  removeFriendship,
  respondToRequest,
  searchProfiles,
  sendFriendRequest,
  sendNudge,
  type CommunityProfile,
  type FriendSummary,
} from "@/lib/community";
import { cn, pluralize } from "@/lib/utils";
import { toast } from "sonner";

export default function Community() {
  const { user } = useAuth();
  const { totalChaptersRead, streakCount, completedToday } = useProgress();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState<FriendSummary | null>(null);

  const debouncedSearch = useDebouncedValue(searchTerm.trim(), 350);
  const userId = user!.id; // RequireAuth guarantees a session on this route.

  /** `?add=<uuid>` from a shared invite link. */
  const invitedId = searchParams.get("add");

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

  const invited = useQuery({
    queryKey: communityKeys.profile(invitedId ?? ""),
    queryFn: () => fetchProfileById(invitedId!),
    // Following your own link is a no-op rather than an error state.
    enabled: Boolean(invitedId) && isUserId(invitedId!) && invitedId !== userId,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["community"] });
  };

  const dismissInvite = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("add");
    setSearchParams(next, { replace: true });
  };

  const add = useMutation({
    mutationFn: (receiverId: string) => sendFriendRequest(userId, receiverId),
    onSuccess: () => {
      toast.success("Request sent", {
        description: "They'll see it next time they open the app.",
      });
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

  const nudge = useMutation({
    mutationFn: ({ friendId }: { friendId: string; name: string }) => sendNudge(friendId),
    onSuccess: (_result, variables) => {
      toast.success(`Sent ${variables.name} some encouragement`);
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => void queryClient.invalidateQueries({ queryKey: ["community"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reading_progress" },
        () => void queryClient.invalidateQueries({ queryKey: communityKeys.friends(userId) }),
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
        readToday: friend.readToday,
        isSelf: false,
        profile: friend.profile as CommunityProfile | null,
      })),
      {
        key: "self",
        name: "You",
        chapters: totalChaptersRead,
        streak: streakCount,
        readToday: completedToday > 0,
        isSelf: true,
        profile: null,
      },
    ];
    return rows.sort((a, b) => b.chapters - a.chapters);
  }, [friendList, totalChaptersRead, streakCount, completedToday]);

  /** Everyone's totals combined — the number that makes a circle feel like one. */
  const circle = useMemo(() => {
    const chapters = friendList.reduce(
      (sum, friend) => sum + friend.chapters,
      totalChaptersRead,
    );
    const longest = friendList.reduce(
      (best, friend) => Math.max(best, friend.streak),
      streakCount,
    );
    const readingToday = activeToday.length + (completedToday > 0 ? 1 : 0);
    return { chapters, longest, readingToday, people: friendList.length + 1 };
  }, [friendList, activeToday, totalChaptersRead, streakCount, completedToday]);

  const copyInvite = async () => {
    try {
      const link = inviteLinkFor(userId);
      if (navigator.share) {
        await navigator.share({
          title: "Read the Bible with me",
          text: "I'm reading ten chapters a day on Scripture Daily. Join me.",
          url: link,
        });
        return;
      }
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Couldn't share your invite link");
    }
  };

  const hasCircle = friendList.length > 0;
  const invitedState = invited.data ? relationshipState.get(invited.data.userId) : undefined;

  return (
    <PageLayout title="Community">
      {/* ── An invite link someone followed ── */}
      {invited.data && (
        <section className="surface-raised mb-5 border-primary/30 bg-primary/[0.04] p-5">
          <div className="flex items-center gap-3.5">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={invited.data.avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="font-bold">
                {initialsOf(invited.data)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-semibold">
                {nameOf(invited.data)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {invitedState === "friend"
                  ? "You're already reading together."
                  : invitedState === "requested"
                    ? "Your request is waiting for them."
                    : "invited you to read together."}
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            {!invitedState && (
              <Button
                onClick={() => {
                  add.mutate(invited.data!.userId);
                  dismissInvite();
                }}
                disabled={add.isPending}
                className="h-11 flex-1 gap-2 rounded-xl font-semibold"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Accept invitation
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={dismissInvite}
              className={cn("h-11 rounded-xl", !invitedState ? "px-4" : "flex-1")}
            >
              Dismiss
            </Button>
          </div>
        </section>
      )}

      {/* ── The circle at a glance ── */}
      <section
        className="surface-raised relative mb-5 overflow-hidden p-5"
        aria-label="Your reading circle"
      >
        <div
          className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />

        {hasCircle ? (
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold leading-snug">
                  {circle.readingToday === circle.people
                    ? "Everyone has read today"
                    : `${circle.readingToday} of ${circle.people} have read today`}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {circle.readingToday === circle.people
                    ? "Your whole circle is through today's chapters."
                    : "You're reading the same plan, at your own pace."}
                </p>
              </div>

              {activeToday.length > 0 && (
                <div className="flex shrink-0 -space-x-2.5" aria-hidden="true">
                  {activeToday.slice(0, 4).map((friend) => (
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
                  {activeToday.length > 4 && (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-secondary text-2xs font-bold">
                      +{activeToday.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-3 divide-x divide-border/60 rounded-xl bg-secondary/40 py-3">
              {[
                { value: circle.chapters.toLocaleString(), label: "chapters together" },
                { value: circle.people.toLocaleString(), label: pluralize(circle.people, "reader") },
                { value: circle.longest.toLocaleString(), label: "longest streak" },
              ].map((stat) => (
                <div key={stat.label} className="px-2 text-center">
                  <p className="stat-display text-lg leading-none">{stat.value}</p>
                  <p className="mt-1.5 text-2xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="relative">
            <h2 className="font-display text-lg font-semibold leading-snug">
              Reading is easier together
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Horner's plan asks for ten chapters a day, every day. People who
              read alongside someone else stay with it far longer than people who
              don't. Invite one person.
            </p>
          </div>
        )}

        <Button
          onClick={() => void copyInvite()}
          variant={hasCircle ? "outline" : "default"}
          className={cn(
            "mt-4 h-12 w-full gap-2 rounded-xl font-semibold",
            !hasCircle && "shadow-md",
          )}
        >
          <Link2 className="h-4 w-4" aria-hidden="true" />
          Share your invite link
        </Button>
      </section>

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
              <p className="mx-auto mt-1 max-w-[17rem] text-xs leading-relaxed text-muted-foreground">
                Nobody matches "{debouncedSearch}". They may not have set a display
                name yet — an invite link works regardless.
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
            {incoming.data.length} {pluralize(incoming.data.length, "request")}
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

      {/* ── Standings ── */}
      {hasCircle && (
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

                <span className="relative shrink-0">
                  {row.profile ? (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={row.profile.avatarUrl ?? undefined} alt="" />
                      <AvatarFallback className="text-2xs font-bold">
                        {initialsOf(row.profile)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-2xs font-bold text-primary">
                      You
                    </span>
                  )}
                  {row.readToday && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success"
                      aria-label="Read today"
                    />
                  )}
                </span>

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
          {hasCircle ? `${friendList.length} ${pluralize(friendList.length, "friend")}` : "Friends"}
        </h2>

        {friends.isPending ? (
          <div className="space-y-2">
            {[0, 1, 2].map((index) => (
              <div key={index} className="skeleton h-[84px] rounded-2xl" />
            ))}
          </div>
        ) : hasCircle ? (
          <ul className="space-y-2">
            {friendList.map((friend) => (
              <li key={friend.friendshipId} className="surface p-4">
                <div className="flex items-center justify-between gap-3">
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
                      <p className="truncate text-sm font-semibold">
                        {nameOf(friend.profile)}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 truncate text-xs",
                          friend.readToday ? "font-medium text-success" : "text-muted-foreground",
                        )}
                      >
                        {activityLabel(friend)}
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
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-3">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="tabular-nums">
                      {friend.chapters.toLocaleString()}
                    </span>
                  </span>

                  {friend.streak > 0 && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-track-orange">
                      <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                      {friend.streak}
                    </span>
                  )}

                  <span className="flex-1" />

                  {/* Only offered once someone has actually gone quiet. An
                      always-present nudge button turns into noise, and nudging
                      someone who read an hour ago is just a poke. */}
                  {couldUseEncouragement(friend) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        nudge.mutate({
                          friendId: friend.profile.userId,
                          name: firstNameOf(friend.profile),
                        })
                      }
                      disabled={nudge.isPending}
                      className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-primary hover:bg-primary/10"
                    >
                      <Hand className="h-3.5 w-3.5" aria-hidden="true" />
                      Encourage
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
            <Sparkles
              className="mx-auto mb-3 h-9 w-9 text-muted-foreground/30"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="text-sm font-semibold">No friends yet</p>
            <p className="mx-auto mt-1.5 max-w-[17rem] text-xs leading-relaxed text-muted-foreground">
              Share your invite link, or search for someone by their display name.
              Either way they'll need to accept before you can see each other's
              reading.
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
